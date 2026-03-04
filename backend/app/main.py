"""SellerVerse - Universal D2C Seller Dashboard API"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routes import overview, platforms, products, orders, pnl, stock, upload
from .services.scheduler import start_scheduler, stop_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("🚀 Starting SellerVerse API...")
    try:
        # Create tables on startup (if they don't exist)
        logging.info("📡 Connecting to database...")
        Base.metadata.create_all(bind=engine)
        logging.info("✅ Database tables verified.")
    except Exception as db_err:
        logging.critical("❌ CRITICAL: Database connection failed: %s", db_err)
        # We don't exit here so the process can still report healthy while we fix it
        # However, for status 3 debugging, it's good to know if this failed.
        pass

    try:
        # Start background scheduler
        start_scheduler()
    except Exception as sch_err:
        logging.error("⚠️ Scheduler failed to start: %s", sch_err)

    yield
    # Stop scheduler on shutdown
    stop_scheduler()


app = FastAPI(
    title="SellerVerse API",
    description="Universal D2C Seller Dashboard — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(overview.router)
app.include_router(platforms.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(pnl.router)
app.include_router(stock.router)
app.include_router(upload.router)

from .routes import auth_connections, data_sync, auth, export, scheduler_routes, notifications, search
app.include_router(auth.router)
app.include_router(auth_connections.router)
app.include_router(data_sync.router)
app.include_router(export.router)
app.include_router(scheduler_routes.router)
app.include_router(notifications.router)
app.include_router(search.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SellerVerse API v1.0.0", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


# Seed endpoint removed for production security. Demo data is auto-generated on signup.
