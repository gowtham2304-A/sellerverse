"""CSV Upload endpoints with platform-aware parsing."""
from typing import Annotated
from datetime import datetime, date

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
    """Deep synchronization of all KPI tables based on the Orders table."""
    try:
        from ..models import DailyPlatformMetric, DailyProductSale, Order, Platform, Product
        from datetime import datetime, date
        from collections import defaultdict
        
        def _to_date(val):
            if not val: return None
            if isinstance(val, (date, datetime)): return val.date() if isinstance(val, datetime) else val
            try: return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
            except: 
                try: return datetime.fromisoformat(str(val).replace('Z', '+00:00')).date()
                except: return None
                
        # Load all orders at once for the user (fast for 20-30k rows)
        all_orders = db.query(Order).filter(Order.user_id == user_id).all()
        platforms_dict = {p.id: p for p in db.query(Platform).filter(Platform.user_id == user_id).all()}
        
        # Aggregation dictionaries
        # (platform_id, date) -> dict of stats
        platform_stats = defaultdict(lambda: {'cnt': 0, 'rev': 0.0})
        # (product_id, date) -> dict of stats
        product_stats = defaultdict(lambda: {'qty': 0, 'rev': 0.0})
        
        # Single pass aggregation logic
        for o in all_orders:
            d = _to_date(o.order_date)
            if not d: continue
            
            # Platform aggregates
            p_key = (o.platform_id, d)
            platform_stats[p_key]['cnt'] += 1
            platform_stats[p_key]['rev'] += float(o.amount or 0)
            
            # Product aggregates
            pr_key = (o.product_id, d)
            # Make sure we safely parse quantities even if they are null for some reason
            qty = o.quantity if o.quantity else 1
            product_stats[pr_key]['qty'] += int(qty)
            product_stats[pr_key]['rev'] += float(o.amount or 0)
            
        # Clean existing metrics before rebuilding
        db.query(DailyPlatformMetric).filter(DailyPlatformMetric.user_id == user_id).delete()
        db.query(DailyProductSale).filter(DailyProductSale.user_id == user_id).delete()
        
        # 1. Rebuild Platform Metrics
        new_platform_metrics = []
        for (pid, d), stats in platform_stats.items():
            plat = platforms_dict.get(pid)
            if not plat: continue
            
            if not plat.is_active: plat.is_active = True
            
            rev = stats['rev']
            cnt = stats['cnt']
            
            fees = rev * plat.fee_rate
            cogs = rev * 0.40
            ret_cnt = round(cnt * plat.avg_return_rate)
            ret_val = rev * plat.avg_return_rate
            profit = rev - fees - cogs - ret_val
            aov = rev / cnt if cnt > 0 else 0
            
            m = DailyPlatformMetric(
                user_id=user_id,
                platform_id=pid,
                date=d,
                orders_count=cnt,
                revenue=rev,
                fees=fees,
                cogs=cogs,
                returns_count=ret_cnt,
                return_value=ret_val,
                profit=profit,
                avg_order_value=aov
            )
            new_platform_metrics.append(m)
            
        # 2. Rebuild Product Metrics
        new_product_metrics = []
        for (prid, d), stats in product_stats.items():
            ps = DailyProductSale(
                user_id=user_id,
                product_id=prid,
                date=d,
                sales_count=stats['qty'],
                revenue=stats['rev']
            )
            new_product_metrics.append(ps)
            
        # Bulk save newly aggregated data
        if new_platform_metrics: db.add_all(new_platform_metrics)
        if new_product_metrics: db.add_all(new_product_metrics)
        
        db.commit()
    except Exception as e:
        print(f"Sync error: {e}")
        db.rollback()

# Assets and metadata for automatic platform creation
PLATFORM_ASSETS = {
    "amazon": {"color": "#FF9900", "icon": "📦", "category": "global", "name": "Amazon"},
    "flipkart": {"color": "#2874F0", "icon": "🏪", "category": "india", "name": "Flipkart"},
    "meesho": {"color": "#E91E63", "icon": "🛍️", "category": "india", "name": "Meesho"},
    "myntra": {"color": "#FF3F6C", "icon": "👗", "category": "india", "name": "Myntra"},
    "nykaa": {"color": "#FC2779", "icon": "💄", "category": "india", "name": "Nykaa"},
    "shopify": {"color": "#95BF47", "icon": "🛒", "category": "global", "name": "Shopify"},
    "other": {"color": "#7c3aed", "icon": "📦", "category": "india", "name": "Other"},
}


@router.post("/csv")
def upload_csv(
    db: DbDep,
    file: Annotated[UploadFile, File(description="CSV or Excel file to upload")],
    platform: str = Query(default="auto", description="Platform slug for column parsing"),
    current_user: User = Depends(get_current_user)
) -> CsvUploadOut:
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
            try:
                df = pd.read_csv(io.BytesIO(content))
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding='utf-16')
                except UnicodeDecodeError:
                    df = pd.read_csv(io.BytesIO(content), encoding='latin1')

        cols_text = " ".join(df.columns.astype(str).str.lower())
        filename_text = (file.filename or "").lower()
        platform = str(platform).lower().strip()
        rows_processed = len(df)
        orders_created = 0

        # Auto-detect platform from contents or filename
        if platform == "auto":
            if any(k in cols_text for k in ["amazon-order", "asin", "amz"]) or "amazon" in filename_text:
                platform = "amazon"
            elif any(k in cols_text for k in ["sub order no", "meesho"]) or "meesho" in filename_text:
                platform = "meesho"
            elif any(k in cols_text for k in ["fsn", "flipkart", "flk"]) or "flipkart" in filename_text:
                platform = "flipkart"
            elif any(k in cols_text for k in ["style id", "myntra"]) or "myntra" in filename_text:
                platform = "myntra"
            elif any(k in cols_text for k in ["nykaa"]) or "nykaa" in filename_text:
                platform = "nykaa"
            elif "shopify" in cols_text or "shopify" in filename_text:
                platform = "shopify"

        # Pre-fetch or Create Platform
        target_platform_slug = platform if platform != "auto" else "other"
        plat = db.query(Platform).filter(Platform.slug == target_platform_slug, Platform.user_id == current_user.id).first()
        
        # Determine assets
        assets = PLATFORM_ASSETS.get(target_platform_slug, PLATFORM_ASSETS["other"])
        
        if not plat:
            plat = Platform(
                user_id=current_user.id,
                slug=target_platform_slug,
                name=assets["name"] if target_platform_slug in PLATFORM_ASSETS else target_platform_slug.replace('-', ' ').capitalize(),
                color=assets["color"],
                icon=assets["icon"],
                category=assets["category"],
                is_active=True
            )
            db.add(plat)
        else:
            # Update existing to active and correct metadata if needed
            plat.is_active = True
            if target_platform_slug in PLATFORM_ASSETS:
                plat.icon = assets["icon"]
                plat.color = assets["color"]
        
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

        # ── Generic fallback parsing ─────────────────────
        if not parsed_orders:
            import uuid
            import re
            
            # Normalize columns to lowercase and remove weird chars
            original_columns = df.columns
            df.columns = df.columns.astype(str).str.lower().str.strip().str.replace(r'[\s\-.]', '_', regex=True)
            cols = list(df.columns)
            
            # Helper to loosely match column names based on keyword fragments
            def find_col(keywords):
                for c in cols:
                    if any(k in c for k in keywords):
                        return c
                return None

            id_col = find_col(['order_id', 'id', 'sub_order', 'no', 'number', 'ref', 'txn'])
            sku_col = find_col(['sku', 'product', 'style', 'code', 'item'])
            amt_col = find_col(['amount', 'price', 'total', 'revenue', 'value', 'sale', 'mrp', 'cost'])
            qty_col = find_col(['qty', 'quantity', 'count', 'units'])
            date_col = find_col(['date', 'time', 'created', 'stamp'])
            customer_col = find_col(['customer', 'buyer', 'name', 'client', 'user'])
            city_col = find_col(['city', 'destination', 'location', 'region', 'state'])
            status_col = find_col(['status', 'state', 'condition'])

            for index, row in df.iterrows():
                # Extract properties safely
                def get_val(col_name, default):
                    if col_name and pd.notna(row.get(col_name)):
                        return row[col_name]
                    return default
                
                # Generate unique ID if we can't find one
                raw_id = get_val(id_col, "")
                order_id_val = str(raw_id).strip()
                if not order_id_val or order_id_val.lower() == 'nan':
                    order_id_val = f"IMP-{uuid.uuid4().hex[:8].upper()}"
                    
                o_date = datetime.utcnow()
                raw_date = get_val(date_col, None)
                if raw_date and str(raw_date).lower() != 'nan':
                    try:
                        o_date = pd.to_datetime(raw_date).to_pydatetime()
                    except: pass

                # Extract amount (strip currency symbols if present)
                raw_amt = str(get_val(amt_col, 0))
                clean_amt = re.sub(r'[^\d.]', '', raw_amt)
                try: amt = float(clean_amt) if clean_amt else 0.0
                except: amt = 0.0

                # Extract quantity safely
                raw_qty = str(get_val(qty_col, 1))
                clean_qty = re.sub(r'[^\d]', '', raw_qty)
                try: qty = int(clean_qty) if clean_qty else 1
                except: qty = 1

                parsed_orders.append({
                    'order_id': order_id_val,
                    'sku': str(get_val(sku_col, "GENERAL")),
                    'gross_revenue': amt,
                    'quantity': qty,
                    'customer_name': str(get_val(customer_col, "Customer")),
                    'city': str(get_val(city_col, "Unknown")),
                    'status': str(get_val(status_col, "Completed")),
                    'order_date': o_date
                })

        # ── Save Orders in Bulk ─────────────────────────
        order_ids = [str(po.get("order_id")) for po in parsed_orders if po.get("order_id")]
        
        # Split order_ids fetching into batches of 1000
        existing_orders_set = set()
        for i in range(0, len(order_ids), 1000):
            batch_ids = order_ids[i:i+1000]
            existing = db.query(Order.order_id).filter(
                Order.order_id.in_(batch_ids), 
                Order.user_id == current_user.id
            ).all()
            existing_orders_set.update([str(e[0]) for e in existing])
            
        skus = {str(po.get("sku", "GENERAL")) for po in parsed_orders}
        existing_products_dict = {}
        skus_list = list(skus)
        for i in range(0, len(skus_list), 1000):
            batch_skus = skus_list[i:i+1000]
            products = db.query(Product).filter(
                Product.sku.in_(batch_skus), 
                Product.user_id == current_user.id
            ).all()
            for p in products:
                existing_products_dict[p.sku] = p

        new_products = {} # sku -> Product
        new_orders = []

        # Find new products
        for po in parsed_orders:
            order_id = str(po.get("order_id"))
            if not order_id or order_id in existing_orders_set:
                continue
                
            sku = str(po.get("sku", "GENERAL"))
            if sku not in existing_products_dict and sku not in new_products:
                rev = float(po.get("gross_revenue", 0))
                p = Product(
                    user_id=current_user.id,
                    sku=sku,
                    name=po.get("product_name", f"Product {sku}"),
                    category="Uncategorized",
                    cost_price=rev * 0.4,
                    selling_price=rev or 499.0,
                )
                new_products[sku] = p
                
        # Bulk save new products first
        if new_products:
            db.bulk_save_objects(list(new_products.values()))
            db.commit()
            
            # Re-fetch new products to get their IDs
            new_skus = list(new_products.keys())
            for i in range(0, len(new_skus), 1000):
                batch_skus = new_skus[i:i+1000]
                products = db.query(Product).filter(
                    Product.sku.in_(batch_skus), 
                    Product.user_id == current_user.id
                ).all()
                for p in products:
                    existing_products_dict[p.sku] = p
                    
        # Now prepare and save orders
        for po in parsed_orders:
            order_id = str(po.get("order_id"))
            if not order_id or order_id in existing_orders_set:
                continue
                
            sku = str(po.get("sku", "GENERAL"))
            product = existing_products_dict.get(sku)
            if not product or not product.id:
                continue
               
            order_dt = po.get("order_date")
            if not order_dt:
                order_dt = datetime.utcnow()
            elif isinstance(order_dt, str):
                try: order_dt = pd.to_datetime(order_dt).to_pydatetime()
                except: order_dt = datetime.utcnow()
                
            qty = po.get("quantity", 1)
            try: qty = int(qty)
            except: qty = 1
            
            amt = float(po.get("gross_revenue", product.selling_price))

            order = Order(
                order_id=order_id,
                product_id=product.id,
                platform_id=plat.id,
                customer_name=str(po.get("customer_name", "Customer")),
                city=str(po.get("city", "Unknown")),
                quantity=qty,
                amount=amt,
                status=str(po.get("status", "Delivered")),
                user_id=current_user.id,
                order_date=order_dt
            )
            new_orders.append(order)
            existing_orders_set.add(order_id)
            
        if new_orders:
            for i in range(0, len(new_orders), 1000):
                batch = new_orders[i:i+1000]
                db.bulk_save_objects(batch)
            db.commit()
            orders_created = len(new_orders)

        # 🚀 Sync metrics
        if orders_created > 0:
            sync_dashboard_metrics(current_user.id, db)

        # Success
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
