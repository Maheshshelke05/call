import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.api.v1 import (
    auth, employees, teams, contacts, campaigns, calls,
    callbacks, recordings, dashboard, reports, audit_logs, settings as app_settings
)

# Auto-create tables on startup in local development
if settings.APP_ENV == "local":
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
origins = [
    settings.ADMIN_WEB_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081", # React Native Metro
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Correlation ID and latency tracking middleware
@app.middleware("http")
async def add_process_time_and_correlation(request: Request, call_next):
    start_time = time.time()
    correlation_id = request.headers.get("X-Correlation-ID") or f"req_{int(start_time*1000)}"
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Correlation-ID"] = correlation_id
    return response

# Mount API v1 Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(employees.router, prefix=settings.API_V1_PREFIX)
app.include_router(teams.router, prefix=settings.API_V1_PREFIX)
app.include_router(contacts.router, prefix=settings.API_V1_PREFIX)
app.include_router(campaigns.router, prefix=settings.API_V1_PREFIX)
app.include_router(calls.router, prefix=settings.API_V1_PREFIX)
app.include_router(callbacks.router, prefix=settings.API_V1_PREFIX)
app.include_router(recordings.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_logs.router, prefix=settings.API_V1_PREFIX)
app.include_router(app_settings.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV
    }

@app.get("/ready")
def readiness_check():
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(Base.metadata.tables["roles"].select().limit(1)) if "roles" in Base.metadata.tables else None
        db_ok = True
        db.close()
    except Exception as e:
        db_ok = False

    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected"}
        )

    return {
        "status": "ready",
        "database": "connected",
        "storage": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
