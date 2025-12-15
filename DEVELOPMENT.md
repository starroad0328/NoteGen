# 🛠️ NoteGen 개발 가이드

## 📋 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [프로젝트 구조](#프로젝트-구조)
3. [개발 워크플로우](#개발-워크플로우)
4. [코딩 컨벤션](#코딩-컨벤션)
5. [테스트](#테스트)
6. [배포](#배포)

## 개발 환경 설정

### 1. 로컬 개발 환경

#### 필수 도구 설치

```bash
# Python 3.10+ 확인
python --version

# Node.js 18+ 확인
node --version

# Git 확인
git --version
```

#### 백엔드 설정

```bash
# 1. 가상환경 생성
cd backend
python -m venv venv

# 2. 가상환경 활성화
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 API 키 입력

# 5. 데이터베이스 초기화 (SQLite)
# 자동으로 생성됨

# 6. 개발 서버 실행
uvicorn app.main:app --reload
```

#### 프론트엔드 설정

```bash
# 1. 의존성 설치
cd frontend
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 3. 개발 서버 실행
npm run dev
```

### 2. Docker 개발 환경

```bash
# 전체 스택 한 번에 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

## 프로젝트 구조

### Backend 구조

```
backend/
├── app/
│   ├── main.py              # FastAPI 애플리케이션 엔트리포인트
│   ├── api/                 # API 엔드포인트
│   │   ├── upload.py        # 파일 업로드 API
│   │   ├── ocr.py           # OCR 처리 API
│   │   ├── organize.py      # 노트 정리 API
│   │   └── notes.py         # 노트 관리 API
│   ├── core/                # 핵심 설정
│   │   ├── config.py        # 환경 설정
│   │   └── security.py      # 보안 설정
│   ├── services/            # 비즈니스 로직
│   │   ├── ocr_service.py   # OCR 서비스
│   │   ├── ai_service.py    # AI 정리 서비스
│   │   └── storage.py       # 파일 저장 서비스
│   ├── models/              # 데이터 모델
│   │   ├── note.py          # 노트 모델
│   │   └── user.py          # 사용자 모델
│   └── schemas/             # Pydantic 스키마
│       ├── note.py
│       └── upload.py
├── tests/                   # 테스트
└── requirements.txt
```

### Frontend 구조

```
frontend/
├── src/
│   ├── app/                 # Next.js 13+ App Router
│   │   ├── page.tsx         # 홈 페이지
│   │   ├── upload/          # 업로드 페이지
│   │   ├── notes/           # 노트 목록/상세
│   │   └── layout.tsx       # 레이아웃
│   ├── components/          # React 컴포넌트
│   │   ├── Upload/
│   │   ├── NoteViewer/
│   │   └── Common/
│   ├── services/            # API 서비스
│   │   └── api.ts
│   ├── stores/              # Zustand 스토어
│   │   └── noteStore.ts
│   └── types/               # TypeScript 타입
│       └── note.ts
├── public/                  # 정적 파일
└── package.json
```

## 개발 워크플로우

### 1. 브랜치 전략

```bash
main          # 프로덕션 브랜치
  └─ develop  # 개발 브랜치
      ├─ feature/ocr-integration
      ├─ feature/ai-organize
      └─ feature/note-viewer
```

### 2. 작업 프로세스

```bash
# 1. develop 브랜치에서 feature 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. 개발 작업

# 3. 커밋
git add .
git commit -m "feat: your feature description"

# 4. Push
git push origin feature/your-feature-name

# 5. Pull Request 생성 (GitHub)
```

### 3. 커밋 메시지 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드/설정 변경
```

## 코딩 컨벤션

### Python (Backend)

```python
# PEP 8 스타일 가이드 준수
# Black 포매터 사용

# 함수/변수명: snake_case
def process_note(note_id: int) -> Note:
    pass

# 클래스명: PascalCase
class NoteService:
    pass

# 상수: UPPER_CASE
MAX_FILE_SIZE = 10485760
```

### TypeScript (Frontend)

```typescript
// 함수/변수명: camelCase
const processNote = (noteId: number): Note => {
  // ...
}

// 컴포넌트/클래스: PascalCase
const NoteViewer = () => {
  // ...
}

// 상수: UPPER_CASE
const MAX_FILE_SIZE = 10485760;
```

## 테스트

### Backend 테스트

```bash
cd backend

# 전체 테스트 실행
pytest

# 커버리지 포함
pytest --cov=app

# 특정 파일 테스트
pytest tests/test_ocr.py
```

### Frontend 테스트

```bash
cd frontend

# 테스트 실행
npm test

# 커버리지
npm run test:coverage
```

## API 개발 가이드

### 1. 새로운 API 엔드포인트 추가

```python
# backend/app/api/example.py
from fastapi import APIRouter, Depends

router = APIRouter()

@router.post("/example")
async def create_example():
    return {"message": "success"}
```

```python
# backend/app/main.py에 추가
from app.api import example

app.include_router(example.router, prefix="/api", tags=["example"])
```

### 2. 프론트엔드에서 API 호출

```typescript
// frontend/src/services/api.ts
export const exampleAPI = {
  create: async () => {
    const response = await axios.post(`${API_URL}/api/example`);
    return response.data;
  }
};
```

## 환경 변수 관리

### Backend

```env
# 필수 환경 변수
OPENAI_API_KEY=           # OpenAI API 키
GOOGLE_CLOUD_PROJECT=     # Google Cloud 프로젝트 ID
DATABASE_URL=             # 데이터베이스 URL

# 선택 환경 변수
DEBUG=true                # 디버그 모드
LOG_LEVEL=INFO           # 로그 레벨
```

### Frontend

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=true
```

## 배포

### 1. 프로덕션 빌드

```bash
# Backend
cd backend
pip install -r requirements.txt
# 환경 변수 설정
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
npm start
```

### 2. Docker 배포

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 트러블슈팅

### 일반적인 문제

1. **OCR 인식 실패**
   - Google Cloud 인증 확인
   - 이미지 품질 확인
   - API 키 유효성 확인

2. **AI 정리 오류**
   - OpenAI API 키 확인
   - 토큰 제한 확인
   - 프롬프트 검토

3. **데이터베이스 연결 오류**
   - DATABASE_URL 확인
   - PostgreSQL 실행 확인

## 참고 자료

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Next.js 문서](https://nextjs.org/docs)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Google Cloud Vision 문서](https://cloud.google.com/vision/docs)

---

문의사항은 Issues에 등록해주세요!
