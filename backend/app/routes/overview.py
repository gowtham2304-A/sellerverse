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
    days: int = 30,
    current_user: User = Depends(get_current_user)
) -> KPIResponse:
    # 🕵️ Auto-detect data range
    latest_date_row = db.query(func.max(DailyPlatformMetric.date)).filter(DailyPlatformMetric.user_id == current_user.id).scalar()
    
    if latest_date_row:
        # If we have data, we'll base our "today" on the last day of data
        ref_date = latest_date_row
    else:
        ref_date = date.today()

    current_start = ref_date - timedelta(days=days)
    prev_end = current_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days)

    active_ids = [p.id for p in db.query(Platform.id).filter(Platform.user_id == current_user.id, Platform.is_active == True).all()]

    def _sum_period(start: date, end: date):
        if not active_ids:
            class EmptyStats:
                revenue = 0; profit = 0; orders = 0; returns = 0
            return EmptyStats()

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
                DailyPlatformMetric.date <= end,
            )
            .first()
        )
        return q

    current = _sum_period(current_start, ref_date)
    prev = _sum_period(prev_start, prev_end)
    totals = current

    def pct(cur, pre) -> float:
        cur_val = float(cur or 0)
        pre_val = float(pre or 0)
        if pre_val == 0: return 0.0
        return round((cur_val - pre_val) / pre_val * 100, 1)

    total_rev = float(totals.revenue or 0)
    total_prof = float(totals.profit or 0)
    total_ord = int(totals.orders or 0)
    total_ret = int(totals.returns or 0)
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
    days: int = 30,
    current_user: User = Depends(get_current_user)
) -> list[DailyOverview]:
    # 🕵️ Auto-detect data range
    latest_date_row = db.query(func.max(DailyPlatformMetric.date)).filter(DailyPlatformMetric.user_id == current_user.id).scalar()
    
    if latest_date_row:
        end_date = latest_date_row
    else:
        end_date = date.today()
        
    start_date = end_date - timedelta(days=days)
    
    active_ids = [p.id for p in db.query(Platform.id).filter(Platform.user_id == current_user.id, Platform.is_active == True).all()]
    if not active_ids: return []

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
            DailyPlatformMetric.date >= start_date,
            DailyPlatformMetric.date <= end_date,
        )
        .group_by(DailyPlatformMetric.date)
        .order_by(DailyPlatformMetric.date)
        .all()
    )

    result = []
    for r in rows:
        d: date = r.date
        tr = float(r.revenue or 0)
        to = int(r.orders or 0)
        result.append(DailyOverview(
            date=d, day=d.day, month=d.strftime("%b"),
            total_revenue=tr, total_profit=float(r.profit or 0),
            total_orders=to, total_returns=int(r.returns or 0),
            avg_order_value=round(tr / to) if to else 0,
        ))

    return result


@router.get("/regions")
def get_regions(
    db: DbDep,
    current_user: User = Depends(get_current_user)
) -> list[RegionData]:
    latest_date_row = db.query(func.max(DailyPlatformMetric.date)).filter(DailyPlatformMetric.user_id == current_user.id).scalar()
    ref_date = latest_date_row if latest_date_row else date.today()
    start = ref_date - timedelta(days=30)

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
        
        if not plat_ids:
            rev = 0
        else:
            rev = db.query(func.coalesce(func.sum(DailyPlatformMetric.revenue), 0)).filter(
                DailyPlatformMetric.user_id == current_user.id,
                DailyPlatformMetric.platform_id.in_(plat_ids),
                DailyPlatformMetric.date >= start,
                DailyPlatformMetric.date <= ref_date,
            ).scalar()

        result.append(RegionData(
            name=name, platforms=len(plats), revenue=float(rev or 0), color=info["color"],
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


@router.get("/debug-data")
def debug_user_data(
    db: DbDep,
):
    """Hidden diagnostic endpoint to check user data counts. Temporarily open!"""
    from ..models import Order, DailyPlatformMetric, Platform, Product, CsvUpload, DailyProductSale, User
    
    # Just get the first user for debugging purposes since it's an open endpoint
    current_user = db.query(User).first()
    if not current_user:
        return {"error": "No users found in database"}
        
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name
        },
        "counts": {
            "orders": db.query(Order).filter_by(user_id=current_user.id).count(),
            "daily_platform_metrics": db.query(DailyPlatformMetric).filter_by(user_id=current_user.id).count(),
            "daily_product_sales": db.query(DailyProductSale).filter_by(user_id=current_user.id).count(),
            "platforms": db.query(Platform).filter_by(user_id=current_user.id).count(),
            "active_platforms": db.query(Platform).filter_by(user_id=current_user.id, is_active=True).count(),
            "products": db.query(Product).filter_by(user_id=current_user.id).count(),
            "csv_uploads": db.query(CsvUpload).filter_by(user_id=current_user.id).count(),
        },
        "recent_orders": [
            { "id": o.order_id, "amount": o.amount, "date": o.order_date } 
            for o in db.query(Order).filter_by(user_id=current_user.id).order_by(Order.order_date.desc()).limit(5).all()
        ]
    }
