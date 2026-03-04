"""Export endpoints — Excel / CSV downloads for orders, P&L, products."""
from datetime import date, datetime, timedelta
from typing import Optional
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from ..database import get_db
from ..models import Order, Product, Platform, DailyPlatformMetric, CostEntry, User
from .auth import get_current_user

router = APIRouter(prefix="/export", tags=["export"])


# ── Orders Export ─────────────────────────────────────────
@router.get("/orders")
def export_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    format: str = Query("xlsx", description="xlsx or csv"),
):
    """Export filtered orders as Excel or CSV."""
    query = (
        db.query(
            Order.order_id,
            Order.order_date,
            Order.customer_name,
            Order.city,
            Order.quantity,
            Order.amount,
            Order.status,
            Product.name.label("product_name"),
            Product.sku.label("product_sku"),
            Product.category.label("product_category"),
            Platform.name.label("platform_name"),
        )
        .join(Product, Order.product_id == Product.id)
        .join(Platform, Order.platform_id == Platform.id)
        .filter(Order.user_id == current_user.id)
    )

    # Apply filters
    if start_date:
        query = query.filter(Order.order_date >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Order.order_date <= datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))
    if platform and platform != "All":
        query = query.filter(Platform.slug == platform)
    if status and status != "All":
        query = query.filter(Order.status == status)

    query = query.order_by(Order.order_date.desc())
    rows = query.all()

    # Build DataFrame
    df = pd.DataFrame(rows, columns=[
        "Order ID", "Date", "Customer", "City", "Qty", "Amount (₹)",
        "Status", "Product", "SKU", "Category", "Platform"
    ])

    if df.empty:
        df = pd.DataFrame(columns=[
            "Order ID", "Date", "Customer", "City", "Qty", "Amount (₹)",
            "Status", "Product", "SKU", "Category", "Platform"
        ])
    else:
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d %H:%M")

    return _stream_df(df, f"sellerverse_orders_{date.today()}", format)


# ── P&L Export ────────────────────────────────────────────
@router.get("/pnl")
def export_pnl(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    format: str = Query("xlsx"),
):
    """Export P&L summary as Excel or CSV."""
    today = date.today()
    sd = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today - timedelta(days=29)
    ed = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else today

    # Daily P&L
    metrics = (
        db.query(
            DailyPlatformMetric.date,
            func.sum(DailyPlatformMetric.revenue).label("revenue"),
            func.sum(DailyPlatformMetric.fees).label("fees"),
            func.sum(DailyPlatformMetric.cogs).label("cogs"),
            func.sum(DailyPlatformMetric.return_value).label("return_value"),
            func.sum(DailyPlatformMetric.profit).label("profit"),
            func.sum(DailyPlatformMetric.orders_count).label("orders"),
        )
        .filter(DailyPlatformMetric.user_id == current_user.id, DailyPlatformMetric.date.between(sd, ed))
        .group_by(DailyPlatformMetric.date)
        .order_by(DailyPlatformMetric.date)
        .all()
    )

    # Costs
    costs = (
        db.query(
            CostEntry.date,
            CostEntry.category,
            CostEntry.amount,
        )
        .filter(CostEntry.user_id == current_user.id, CostEntry.date.between(sd, ed))
        .order_by(CostEntry.date)
        .all()
    )

    # Build P&L DataFrame
    pnl_rows = []
    for m in metrics:
        pnl_rows.append({
            "Date": m.date.strftime("%Y-%m-%d"),
            "Revenue (₹)": m.revenue,
            "Platform Fees (₹)": m.fees,
            "COGS (₹)": m.cogs,
            "Returns Value (₹)": m.return_value,
            "Profit (₹)": m.profit,
            "Orders": m.orders,
        })

    df_pnl = pd.DataFrame(pnl_rows)

    # Build Costs DataFrame
    cost_rows = []
    for c in costs:
        cost_rows.append({
            "Date": c.date.strftime("%Y-%m-%d"),
            "Category": c.category,
            "Amount (₹)": c.amount,
        })

    df_costs = pd.DataFrame(cost_rows)

    # For Excel, write multiple sheets
    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            if not df_pnl.empty:
                df_pnl.to_excel(writer, sheet_name="P&L Summary", index=False)
            if not df_costs.empty:
                df_costs.to_excel(writer, sheet_name="Cost Breakdown", index=False)

            # Summary sheet
            summary_data = {
                "Metric": ["Total Revenue", "Total Fees", "Total COGS", "Total Returns", "Net Profit", "Total Orders", "Profit Margin"],
                "Value": [
                    df_pnl["Revenue (₹)"].sum() if not df_pnl.empty else 0,
                    df_pnl["Platform Fees (₹)"].sum() if not df_pnl.empty else 0,
                    df_pnl["COGS (₹)"].sum() if not df_pnl.empty else 0,
                    df_pnl["Returns Value (₹)"].sum() if not df_pnl.empty else 0,
                    df_pnl["Profit (₹)"].sum() if not df_pnl.empty else 0,
                    df_pnl["Orders"].sum() if not df_pnl.empty else 0,
                    f"{(df_pnl['Profit (₹)'].sum() / df_pnl['Revenue (₹)'].sum() * 100):.1f}%" if not df_pnl.empty and df_pnl["Revenue (₹)"].sum() > 0 else "0%",
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="Summary", index=False)

        output.seek(0)
        filename = f"sellerverse_pnl_{date.today()}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # CSV fallback — just the P&L sheet
    return _stream_df(df_pnl, f"sellerverse_pnl_{date.today()}", "csv")


# ── Products Export ───────────────────────────────────────
@router.get("/products")
def export_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    format: str = Query("xlsx"),
):
    """Export products inventory as Excel or CSV."""
    products = db.query(Product).filter(Product.user_id == current_user.id).all()

    rows = []
    for p in products:
        rows.append({
            "Name": p.name,
            "SKU": p.sku,
            "Category": p.category,
            "Cost Price (₹)": p.cost_price,
            "Selling Price (₹)": p.selling_price,
            "Stock": p.stock,
            "Daily Sales Rate": p.daily_sales_rate,
            "Days of Stock": round(p.stock / p.daily_sales_rate, 1) if p.daily_sales_rate else "N/A",
        })

    df = pd.DataFrame(rows)
    return _stream_df(df, f"sellerverse_products_{date.today()}", format)


# ── Helper ────────────────────────────────────────────────
def _stream_df(df: pd.DataFrame, filename: str, format: str):
    """Convert DataFrame to downloadable file response."""
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )
    else:
        output = io.BytesIO()
        df.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"},
        )
