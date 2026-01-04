"""
NoteGen Backend API
자동 필기 정리 앱 - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db, get_db_session
from app.core.seed_curriculum import seed_curriculum
from app.api import upload, process, notes, auth, curriculum, payment, weak_concepts

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
    allow_origins=settings.cors_origins_list,
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

app.include_router(
    auth.router,
    tags=["Auth"]
)

app.include_router(
    curriculum.router,
    tags=["Curriculum"]
)

app.include_router(
    payment.router,
    tags=["Payment"]
)

app.include_router(
    weak_concepts.router,
    prefix="/api/weak-concepts",
    tags=["Weak Concepts"]
)

# 업로드된 이미지 정적 파일 서빙
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    print("=" * 50)
    print("[START] NoteGen API Server Starting...")
    print(f"[INFO] Version: {settings.APP_VERSION}")
    print(f"[INFO] Debug Mode: {settings.DEBUG}")
    print(f"[INFO] Upload Directory: {settings.UPLOAD_DIR}")
    print(f"[INFO] API Docs: http://localhost:8000/docs")
    print("=" * 50)

    # 데이터베이스 마이그레이션 (새 컬럼 추가)
    try:
        from sqlalchemy import text
        db = get_db_session()

        # detection_cache 컬럼 추가 (없으면)
        try:
            db.execute(text("ALTER TABLE notes ADD COLUMN detection_cache TEXT"))
            db.commit()
            print("[MIGRATION] Added detection_cache column to notes table")
        except Exception:
            db.rollback()  # 이미 존재하면 무시

        db.close()
    except Exception as e:
        print(f"[WARN] Migration check failed: {e}")

    # 교육과정 데이터 초기화
    try:
        db = get_db_session()
        seed_curriculum(db)
        db.close()
    except Exception as e:
        print(f"[WARN] Curriculum seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    print("[STOP] NoteGen API Server Shutting Down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
