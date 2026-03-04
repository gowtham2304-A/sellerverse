import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sellerverse.db",
)

# Robust handling for Postgres strings (especially for Supabase on Render)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Safety: Automatically remove square brackets if the user pasted them by mistake [YOUR-PASS]
if "[YOUR-PASSWORD]" in DATABASE_URL:
    print("⚠️ WARNING: Detected '[YOUR-PASSWORD]' in DATABASE_URL. Falling back to local SQLite for safety.")
    DATABASE_URL = "sqlite:///./sellerverse.db"

# Force SSL for Postgres connections to prevent connection resets
if DATABASE_URL.startswith("postgresql") and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{sep}sslmode=require"

# SQLite needs connect_args for multi-threading in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
    # Test connection immediately
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"❌ DATABASE ERROR: Could not connect to {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    print(f"⚠️ REASON: {e}")
    print("🔄 FALLBACK: Switching to local SQLite (sellerverse.db) for testing...")
    DATABASE_URL = "sqlite:///./sellerverse.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
