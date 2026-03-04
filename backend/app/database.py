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
    raise ValueError("CRITICAL: Your DATABASE_URL still contains the placeholder '[YOUR-PASSWORD]'. Remove it and use your real password in Render settings.")

if "[" in DATABASE_URL or "]" in DATABASE_URL:
    # Attempt to clean brackets if they surround parts of the URL
    DATABASE_URL = DATABASE_URL.replace("[", "").replace("]", "")

# Force SSL for Postgres connections to prevent connection resets
if DATABASE_URL.startswith("postgresql") and "sslmode" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL += f"{sep}sslmode=require"

# SQLite needs connect_args for multi-threading in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
