"""Global search across orders, products, and platforms."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Order, Product, Platform, User
from .auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("")
def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(10, le=30),
):
    """Search across orders, products, and platforms simultaneously."""
    term = f"%{q}%"
    results = {"query": q, "orders": [], "products": [], "platforms": []}

    # Orders
    orders = (
        db.query(Order, Product.name.label("product_name"), Platform.name.label("platform_name"))
        .join(Product, Order.product_id == Product.id)
        .join(Platform, Order.platform_id == Platform.id)
        .filter(Order.user_id == current_user.id)
        .filter(
            or_(
                Order.order_id.ilike(term),
                Order.customer_name.ilike(term),
                Order.city.ilike(term),
                Product.name.ilike(term),
            )
        )
        .limit(limit)
        .all()
    )
    results["orders"] = [
        {
            "id": o.Order.id,
            "order_id": o.Order.order_id,
            "customer": o.Order.customer_name,
            "product": o.product_name,
            "platform": o.platform_name,
            "amount": o.Order.amount,
            "status": o.Order.status,
            "date": o.Order.order_date.strftime("%Y-%m-%d"),
            "link": "/orders",
        }
        for o in orders
    ]

    # Products
    products = (
        db.query(Product)
        .filter(Product.user_id == current_user.id)
        .filter(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
                Product.category.ilike(term),
            )
        )
        .limit(limit)
        .all()
    )
    results["products"] = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "stock": p.stock,
            "price": p.selling_price,
            "link": "/products",
        }
        for p in products
    ]

    # Platforms
    platforms = (
        db.query(Platform)
        .filter(Platform.user_id == current_user.id)
        .filter(or_(Platform.name.ilike(term), Platform.slug.ilike(term)))
        .limit(5)
        .all()
    )
    results["platforms"] = [
        {"id": p.id, "name": p.name, "slug": p.slug, "category": p.category, "link": "/platforms"}
        for p in platforms
    ]

    results["total"] = len(results["orders"]) + len(results["products"]) + len(results["platforms"])
    return results
