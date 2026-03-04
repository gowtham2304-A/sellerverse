"""CSV Upload endpoints with platform-aware parsing."""
from typing import Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd
import io

from ..database import get_db
from ..models import CsvUpload, Order, Product, Platform, User
from ..schemas import CsvUploadOut
from .auth import get_current_user
from ..services.csv_parsers import (
    parse_amazon_orders,
    parse_meesho_orders,
    parse_myntra_orders,
    parse_nykaa_orders,
)

router = APIRouter(prefix="/upload", tags=["upload"])

DbDep = Annotated[Session, Depends(get_db)]

# Map platform slugs to their parser functions
PLATFORM_PARSERS = {
    "amazon": parse_amazon_orders,
    "meesho": parse_meesho_orders,
    "myntra": parse_myntra_orders,
    "nykaa": parse_nykaa_orders,
}


def sync_dashboard_metrics(user_id: int, db: Session):
    """Recalculate DailyPlatformMetric and DailyProductSale from the Orders table."""
    try:
        from sqlalchemy import func
        from ..models import DailyPlatformMetric, Order, Platform, Product
        from datetime import date
        
        # Get all dates where this user has orders
        dates = db.query(func.date(Order.order_date)).filter(Order.user_id == user_id).distinct().all()
        
        for (d_val,) in dates:
            if not d_val: continue
            if isinstance(d_val, str):
                d = datetime.strptime(d_val[:10], "%Y-%m-%d").date()
            else:
                d = d_val
                
            # Aggegate by platform for this day
            platform_stats = db.query(
                Order.platform_id,
                func.count(Order.id).label("cnt"),
                func.sum(Order.amount).label("rev"),
                func.sum(Order.quantity).label("qty")
            ).filter(Order.user_id == user_id, func.date(Order.order_date) == d).group_by(Order.platform_id).all()
            
            for plat_id, cnt, rev, qty in platform_stats:
                # Calculate estimated profit
                plat = db.query(Platform).get(plat_id)
                fee_rate = plat.fee_rate if plat else 0.15
                
                # Estimate COGS (average 40% if not known)
                fees = (rev or 0) * fee_rate
                cogs = (rev or 0) * 0.40
                returns_count = round(cnt * (plat.avg_return_rate if plat else 0.1))
                return_val = returns_count * ((rev or 0)/cnt if cnt else 0)
                profit = (rev or 0) - fees - cogs - return_val
                
                # Update or create metric
                metric = db.query(DailyPlatformMetric).filter_by(user_id=user_id, platform_id=plat_id, date=d).first()
                if not metric:
                    metric = DailyPlatformMetric(user_id=user_id, platform_id=plat_id, date=d)
                    db.add(metric)
                
                metric.orders_count = cnt
                metric.revenue = rev or 0
                metric.fees = fees
                metric.cogs = cogs
                metric.returns_count = returns_count
                metric.return_value = return_val
                metric.profit = profit
                metric.avg_order_value = rev/cnt if cnt else 0
        
        db.commit()
    except Exception as e:
        print(f"Error in sync_dashboard_metrics: {e}")
        db.rollback()

@router.post("/csv")
def upload_csv(
    db: DbDep,
    file: Annotated[UploadFile, File(description="CSV or Excel file to upload")],
    platform: str = Query(default="auto", description="Platform slug for column parsing"),
    current_user: User = Depends(get_current_user)
) -> CsvUploadOut:
    # Validate file type
    allowed_types = [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/plain", # Some CSVs come as text/plain
    ]
    if file.content_type not in allowed_types and not file.filename.endswith((".csv", ".xlsx", ".xls")):
        # We'll allow it anyway if the extension matches
        pass

    # Create upload record
    upload = CsvUpload(
        filename=file.filename or "unknown",
        file_type=file.content_type or "unknown",
        status="processing",
        user_id=current_user.id,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    try:
        content = file.file.read()

        # Parse file
        if file.filename and file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))

        rows_processed = len(df)
        orders_created = 0

        # Pre-fetch or Create Platform
        target_platform_slug = platform if platform != "auto" else "other"
        plat = db.query(Platform).filter(Platform.slug == target_platform_slug, Platform.user_id == current_user.id).first()
        if not plat:
            # Create the platform if it doesn't exist
            plat = Platform(
                user_id=current_user.id,
                slug=target_platform_slug,
                name=target_platform_slug.capitalize(),
                is_active=True
            )
            db.add(plat)
            db.flush()

        # ── Platform-specific parsing ────────────────────
        parsed_orders = []
        if platform != "auto" and platform in PLATFORM_PARSERS:
            # Save temp file for parser
            temp_path = f"sv_upload_{upload.id}.csv"
            with open(temp_path, "wb") as f:
                f.write(content)
            try:
                parsed_orders = PLATFORM_PARSERS[platform](temp_path)
            except Exception as parse_err:
                print(f"Platform parser ({platform}) failed: {parse_err}")
            finally:
                import os
                if os.path.exists(temp_path): os.remove(temp_path)

        # ── Generic fallback parsing if no platform specific orders ────
        if not parsed_orders:
            df.columns = df.columns.str.lower().str.replace(' ', '_').str.replace('-', '_')
            cols = set(df.columns)
            
            # Map common columns
            id_col = next((c for c in ['order_id', 'id', 'sub_order_no', 'amazon_order_id'] if c in cols), None)
            sku_col = next((c for c in ['sku', 'product_sku', 'style_id', 'item_code'] if c in cols), None)
            amt_col = next((c for c in ['amount', 'price', 'selling_price', 'total', 'item_price'] if c in cols), None)
            qty_col = next((c for c in ['qty', 'quantity', 'quantity_purchased'] if c in cols), None)
            
            if id_col:
                for _, row in df.iterrows():
                    parsed_orders.append({
                        'order_id': str(row.get(id_col, "")),
                        'sku': str(row.get(sku_col, "GENERAL")) if sku_col else "GENERAL",
                        'gross_revenue': float(row.get(amt_col, 0)),
                        'quantity': int(row.get(qty_col, 1)) if qty_col else 1,
                        'customer_name': str(row.get('customer', row.get('buyer', 'Customer'))),
                        'city': str(row.get('city', row.get('destination', 'Unknown'))),
                        'status': str(row.get('status', 'Delivered'))
                    })

        # ── Save Orders ──────────────────────────────────
        for po in parsed_orders:
            order_id = po.get("order_id")
            if not order_id: continue

            # Check duplicate
            existing = db.query(Order).filter(Order.order_id == order_id, Order.user_id == current_user.id).first()
            if existing: continue

            # Find or Create Product
            sku = po.get("sku", "GENERAL")
            product = db.query(Product).filter(Product.sku == sku, Product.user_id == current_user.id).first()
            if not product:
                product = Product(
                    user_id=current_user.id,
                    sku=sku,
                    name=po.get("product_name", f"Product {sku}"),
                    category="Uncategorized",
                    cost_price=float(po.get("gross_revenue", 0)) * 0.4,
                    selling_price=float(po.get("gross_revenue", 0)),
                )
                db.add(product)
                db.flush()

            order = Order(
                order_id=order_id,
                product_id=product.id,
                platform_id=plat.id,
                customer_name=po.get("customer_name", "Customer"),
                city=po.get("city", "Unknown"),
                quantity=po.get("quantity", 1),
                amount=po.get("gross_revenue", product.selling_price),
                status=po.get("status", "Delivered"),
                user_id=current_user.id,
            )
            db.add(order)
            orders_created += 1

        db.commit()

        # 🚀 Sync the dashboard metrics immediately
        if orders_created > 0:
            sync_dashboard_metrics(current_user.id, db)

        # Update upload record
        upload.rows_processed = rows_processed
        upload.status = "success"
        upload.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        upload.status = "error"
        upload.error_message = str(e)
        upload.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(upload)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

    return upload


@router.get("/history")
def get_upload_history(
    db: DbDep,
    current_user: User = Depends(get_current_user)
) -> list[CsvUploadOut]:
    return (
        db.query(CsvUpload)
        .filter(CsvUpload.user_id == current_user.id)
        .order_by(CsvUpload.uploaded_at.desc())
        .limit(20)
        .all()
    )
