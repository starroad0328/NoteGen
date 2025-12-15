"""
NoteGen Backend API
자동 필기 정리 앱 - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.api import upload, process, notes

# 데이터베이스 초기화
init_db()

app = FastAPI(
    title="NoteGen API",
    description="AI-powered automatic note organization service",
    version="1.0.0-MVP",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "NoteGen API",
        "status": "running",
        "version": "1.0.0-MVP",
        "message": "Welcome to NoteGen! Visit /docs for API documentation."
    }


@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "NoteGen Backend",
            "database": "connected"
        }
    )


# API 라우터 등록
app.include_router(
    upload.router,
    prefix="/api/upload",
    tags=["Upload"]
)

app.include_router(
    process.router,
    prefix="/api/process",
    tags=["Process"]
)

app.include_router(
    notes.router,
    prefix="/api/notes",
    tags=["Notes"]
)


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    print("=" * 50)
    print("🚀 NoteGen API Server Starting...")
    print(f"📝 Version: {settings.APP_VERSION}")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    print(f"📁 Upload Directory: {settings.UPLOAD_DIR}")
    print(f"🌐 API Docs: http://localhost:8000/docs")
    print("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    print("👋 NoteGen API Server Shutting Down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
