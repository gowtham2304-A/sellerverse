"""User registration + profile endpoints."""
from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User

# ── Config ────────────────────────────────────────────────
import os
SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Helpers ───────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8") if isinstance(plain, str) else plain,
        hashed.encode("utf-8") if isinstance(hashed, str) else hashed,
    )


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return jwt.encode({"exp": expire, "sub": str(subject)}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except Exception:
        raise exc
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise exc
    return user


# ── Schemas ───────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    plan: str = "free"

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Login ─────────────────────────────────────────────────
@router.post("/token")
def login_for_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return {"access_token": token, "token_type": "bearer"}


# ── Register ──────────────────────────────────────────────
@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new seller account."""
    # Check for duplicate email
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password strength
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=get_password_hash(req.password),
        plan=req.plan,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize standard platforms for the new user
    from ..seed import PLATFORMS_DATA, ACTIVE_PLATFORM_SLUGS
    for p_data in PLATFORMS_DATA:
        from ..models import Platform
        plat = Platform(
            user_id=user.id,
            slug=p_data["slug"],
            name=p_data["name"],
            color=p_data.get("color", "#7c3aed"),
            icon=p_data.get("icon", "📦"),
            category=p_data.get("category", "india"),
            fee_rate=p_data.get("fee_rate", 0.0),
            avg_return_rate=p_data.get("avg_return_rate", 0.05),
            is_active=p_data["slug"] in ACTIVE_PLATFORM_SLUGS
        )
        db.add(plat)
    
    db.commit()


    token = create_access_token(subject=user.id)
    return {
        "message": "Account created successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "plan": user.plan},
    }


# ── Me ────────────────────────────────────────────────────
@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "plan": current_user.plan,
        "created_at": current_user.created_at,
    }


# ── Update Profile ────────────────────────────────────────
@router.put("/profile")
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if req.name:
        current_user.name = req.name
    if req.email:
        # Check if new email is taken by someone else
        taken = db.query(User).filter(User.email == req.email, User.id != current_user.id).first()
        if taken:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = req.email
    db.commit()
    return {"message": "Profile updated", "name": current_user.name, "email": current_user.email}


# ── Change Password ───────────────────────────────────────
@router.put("/password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    current_user.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
