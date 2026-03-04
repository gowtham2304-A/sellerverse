"""In-app notification endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Notification

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

from .auth import get_current_user
from ..models import Notification, User


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = Query(False),
    limit: int = Query(20, le=100),
):
    user_id = current_user.id
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    items = q.order_by(desc(Notification.created_at)).limit(limit).all()
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).count()
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    n = db.query(Notification).filter_by(id=notification_id, user_id=user_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    db.query(Notification).filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    db.query(Notification).filter_by(id=notification_id, user_id=user_id).delete()
    db.commit()
    return {"ok": True}


# ── Helper used by scheduler & other internal services ───
def create_notification(db: Session, user_id: int, title: str, message: str,
                         type: str = "info", link: Optional[str] = None):
    n = Notification(user_id=user_id, title=title, message=message, type=type, link=link)
    db.add(n)
    db.commit()
