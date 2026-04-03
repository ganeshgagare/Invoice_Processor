from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request, Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import re
from database import engine
from models import Base
from routes import auth, invoices
from config import settings

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(
    title="Invoice Processor API",
    description="AI-powered invoice extraction and processing API",
    version="1.0.0"
)

# Add CORS middleware
cors_origins = settings.cors_origins_list
cors_allow_all = cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if cors_allow_all else cors_origins,
    allow_origin_regex=None if cors_allow_all else r"https://.*\.onrender\.com",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Extra CORS safety net for deployments where proxy/CDN behavior can break preflight.
_ONRENDER_ORIGIN_RE = re.compile(r"^https://[a-z0-9-]+\.onrender\.com$", re.IGNORECASE)
_LOCALHOST_ORIGIN_RE = re.compile(r"^http://localhost(?::\d+)?$", re.IGNORECASE)


def _is_allowed_origin(origin: str) -> bool:
    return bool(_ONRENDER_ORIGIN_RE.match(origin) or _LOCALHOST_ORIGIN_RE.match(origin))


@app.middleware("http")
async def dynamic_cors_fallback(request: Request, call_next):
    origin = request.headers.get("origin", "")
    is_allowed = _is_allowed_origin(origin)

    if request.method == "OPTIONS" and is_allowed:
        response = Response(status_code=200)
    else:
        response = await call_next(request)

    if is_allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get(
            "access-control-request-headers", "*"
        )
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"

    return response

# Include routers
app.include_router(auth.router)
app.include_router(invoices.router)

# Serve uploaded files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def read_root():
    return {
        "message": "Invoice Processor API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
