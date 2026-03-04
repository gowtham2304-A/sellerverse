"""Overview / Dashboard KPI endpoints."""
from typing import Annotated
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import DailyPlatformMetric, Platform, User
from ..schemas import KPIResponse, KPIValue, DailyOverview, RegionData
from .auth import get_current_user

router = APIRouter(prefix="/overview", tags=["overview"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get("/kpis")
def get_kpis(
    db: DbDep,
    current_user: User = Depends(get_current_user)
) -> KPIResponse:
    today = date.today()
    last_7_start = today - timedelta(days=7)
    prev_7_start = today - timedelta(days=14)

    active_ids = [p.id for p in db.query(Platform.id).filter(Platform.user_id == current_user.id, Platform.is_active == True).all()]

    def _sum_period(start: date, end: date):
        q = (
            db.query(
                func.coalesce(func.sum(DailyPlatformMetric.revenue), 0).label("revenue"),
                func.coalesce(func.sum(DailyPlatformMetric.profit), 0).label("profit"),
                func.coalesce(func.sum(DailyPlatformMetric.orders_count), 0).label("orders"),
                func.coalesce(func.sum(DailyPlatformMetric.returns_count), 0).label("returns"),
            )
            .filter(
                DailyPlatformMetric.user_id == current_user.id,
                DailyPlatformMetric.platform_id.in_(active_ids),
                DailyPlatformMetric.date >= start,
                DailyPlatformMetric.date < end,
            )
            .first()
        )
        return q

    current = _sum_period(last_7_start, today + timedelta(days=1))
    prev = _sum_period(prev_7_start, last_7_start)

    # 30-day totals
    d30_start = today - timedelta(days=30)
    totals = _sum_period(d30_start, today + timedelta(days=1))

    def pct(cur: float, pre: float) -> float:
        if pre == 0:
            return 0.0
        return round((cur - pre) / pre * 100, 1)

    total_rev = float(totals.revenue)
    total_prof = float(totals.profit)
    total_ord = int(totals.orders)
    total_ret = int(totals.returns)
    aov = round(total_rev / total_ord) if total_ord else 0
    margin = round((total_prof / total_rev * 100), 1) if total_rev else 0

    return KPIResponse(
        revenue=KPIValue(value=total_rev, change=pct(current.revenue, prev.revenue)),
        profit=KPIValue(value=total_prof, change=pct(current.profit, prev.profit)),
        orders=KPIValue(value=total_ord, change=pct(current.orders, prev.orders)),
        returns=KPIValue(value=total_ret, change=pct(current.returns, prev.returns)),
        avg_order_value=KPIValue(value=aov, change=3.2),
        profit_margin=KPIValue(value=margin, change=1.8),
    )


@router.get("/daily")
def get_daily_data(
    db: DbDep,
    days: Annotated[int, Query(ge=7, le=90)] = 30,
    current_user: User = Depends(get_current_user)
) -> list[DailyOverview]:
    today = date.today()
    start = today - timedelta(days=days)
    active_ids = [p.id for p in db.query(Platform.id).filter(Platform.user_id == current_user.id, Platform.is_active == True).all()]

    rows = (
        db.query(
            DailyPlatformMetric.date,
            func.sum(DailyPlatformMetric.revenue).label("revenue"),
            func.sum(DailyPlatformMetric.profit).label("profit"),
            func.sum(DailyPlatformMetric.orders_count).label("orders"),
            func.sum(DailyPlatformMetric.returns_count).label("returns"),
        )
        .filter(
            DailyPlatformMetric.user_id == current_user.id,
            DailyPlatformMetric.platform_id.in_(active_ids),
            DailyPlatformMetric.date >= start,
        )
        .group_by(DailyPlatformMetric.date)
        .order_by(DailyPlatformMetric.date)
        .all()
    )

    result = []
    for r in rows:
        d: date = r.date
        total_rev = float(r.revenue)
        total_ord = int(r.orders)
        result.append(DailyOverview(
            date=d,
            day=d.day,
            month=d.strftime("%b"),
            total_revenue=total_rev,
            total_profit=float(r.profit),
            total_orders=total_ord,
            total_returns=int(r.returns),
            avg_order_value=round(total_rev / total_ord) if total_ord else 0,
        ))

    return result


@router.get("/regions")
def get_regions(
    db: DbDep,
    current_user: User = Depends(get_current_user)
) -> list[RegionData]:
    today = date.today()
    start = today - timedelta(days=30)

    category_map = {
        "India 🇮🇳": {"cats": ["india"], "color": "#FF9900"},
        "Global 🌍": {"cats": ["global"], "color": "#2563eb"},
        "Social 📱": {"cats": ["social"], "color": "#25D366"},
    }

    result = []
    for name, info in category_map.items():
        plats = db.query(Platform).filter(
            Platform.user_id == current_user.id,
            Platform.category.in_(info["cats"]),
            Platform.is_active == True,
        ).all()
        plat_ids = [p.id for p in plats]

        rev = db.query(func.coalesce(func.sum(DailyPlatformMetric.revenue), 0)).filter(
            DailyPlatformMetric.user_id == current_user.id,
            DailyPlatformMetric.platform_id.in_(plat_ids),
            DailyPlatformMetric.date >= start,
        ).scalar()

        result.append(RegionData(
            name=name, platforms=len(plats), revenue=float(rev), color=info["color"],
        ))

    return result


@router.post("/sync-all")
def force_sync_all_metrics(
    db: DbDep,
    current_user: User = Depends(get_current_user)
):
    """Manually trigger a full metric sync from the Orders table."""
    from .upload import sync_dashboard_metrics
    sync_dashboard_metrics(current_user.id, db)
    return {"message": "Full metric synchronization completed successfully!"}
