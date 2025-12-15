"""
NoteGen Backend API
자동 필기 정리 앱 - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="NoteGen API",
    description="AI-powered automatic note organization service",
    version="1.0.0-MVP"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경, 프로덕션에서는 제한 필요
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
        "version": "1.0.0-MVP"
    }


@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "NoteGen Backend"
        }
    )


# TODO: API 라우터 추가
# from app.api import upload, ocr, organize, notes
# app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
# app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
# app.include_router(organize.router, prefix="/api/organize", tags=["organize"])
# app.include_router(notes.router, prefix="/api/notes", tags=["notes"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
