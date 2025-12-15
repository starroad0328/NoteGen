# 📝 NoteGen - AI 필기 정리 앱

> 손으로 쓴 필기를 AI가 자동으로 깔끔한 디지털 노트로 정리해주는 서비스

[![GitHub](https://img.shields.io/badge/GitHub-NoteGen-blue)](https://github.com/starroad0328/NoteGen)
[![Version](https://img.shields.io/badge/version-1.0.0--MVP-green)](https://github.com/starroad0328/NoteGen)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 프로젝트 개요

NoteGen은 중·고등학생을 위한 AI 기반 자동 필기 정리 앱입니다.
사용자가 촬영하거나 업로드한 손글씨 필기를 AI가 자동으로 분석하고 정리하여 깔끔한 디지털 노트로 변환합니다.

### 핵심 기능 (MVP)

- 📸 **필기 업로드**: 사진 촬영 또는 이미지 선택 (최대 3장)
- 🔍 **OCR 인식**: 손글씨 자동 텍스트 변환
- 🤖 **AI 자동 정리**: 선택한 템플릿으로 자동 구조화
  - 기본 요약 정리
  - 코넬식 정리 (Lite)
- ⭐ **중요도 표시**: AI가 핵심 개념 자동 강조
- 📱 **GoodNotes 스타일 UI**: 손글씨 느낌의 깔끔한 노트 뷰어
- 💾 **자동 저장**: 정리된 노트 자동 보관

## 🏗️ 프로젝트 구조

```
NoteGen/
├── backend/                 # FastAPI 백엔드 API
│   ├── app/
│   │   ├── main.py         # 메인 애플리케이션
│   │   ├── api/            # API 라우터
│   │   ├── core/           # 핵심 설정
│   │   ├── services/       # 비즈니스 로직
│   │   └── models/         # 데이터 모델
│   ├── tests/              # 테스트
│   ├── requirements.txt    # Python 의존성
│   └── .env.example        # 환경 변수 템플릿
│
├── mobile/                 # React Native 모바일 앱 (Expo)
│   ├── app/                # 앱 화면
│   │   ├── index.tsx       # 홈 화면
│   │   ├── upload.tsx      # 업로드 화면
│   │   ├── processing/     # 처리 중 화면
│   │   └── notes/          # 노트 목록/상세
│   ├── services/           # API 서비스
│   ├── package.json        # 의존성
│   └── app.json            # Expo 설정
│
├── docs/                   # 프로젝트 문서
│   ├── 개발 과정/
│   ├── 앱 구조/
│   ├── AI 비용과 유료 기능/
│   ├── 교육과정 데이터 설계/
│   ├── 필기 사진 분석&정리 구조/
│   └── 과목별 문제 구조/
│
└── README.md              # 이 파일
```

## 🚀 빠른 시작

### 필수 요구사항

- **Python** 3.10 이상
- **Node.js** 18.0 이상
- **Expo CLI** (npx expo)
- **Android Studio** 또는 **Xcode** (선택)

### 1. 저장소 클론

```bash
git clone https://github.com/starroad0328/NoteGen.git
cd NoteGen
```

### 2. 백엔드 설정

```bash
cd backend

# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (Mac/Linux)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 OpenAI API 키 등을 설정

# 개발 서버 실행
uvicorn app.main:app --reload
```

백엔드 서버가 `http://localhost:8000`에서 실행됩니다.

### 3. 모바일 앱 설정

```bash
cd mobile

# 의존성 설치
npm install

# Expo 개발 서버 실행
npx expo start
```

QR 코드를 스캔하여 Expo Go 앱에서 실행하거나:
- **Android**: `a` 키를 눌러 Android 에뮬레이터에서 실행
- **iOS**: `i` 키를 눌러 iOS 시뮬레이터에서 실행

**중요**: `mobile/services/api.ts`에서 `API_URL`을 실제 컴퓨터 IP로 변경하세요.
```typescript
// Android 에뮬레이터: http://10.0.2.2:8000
// 실제 기기: http://[컴퓨터IP]:8000 (예: http://192.168.0.10:8000)
```

## 🔑 환경 변수 설정

### Backend (.env)

```env
# OpenAI API Key (필수)
OPENAI_API_KEY=your-openai-api-key

# Google Cloud Vision API (필수)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Database (선택, 기본: SQLite)
DATABASE_URL=sqlite:///./notegen.db
```

### Frontend (.env.local)

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📖 API 문서

백엔드 서버 실행 후 다음 주소에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 테스트

### 백엔드 테스트

```bash
cd backend
pytest
```

### 프론트엔드 테스트

```bash
cd frontend
npm test
```

## 📱 기술 스택

### Backend
- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM
- **OpenAI API**: AI 텍스트 정리 (GPT-5 시리즈)
- **Google Cloud Vision**: OCR 인식
- **PostgreSQL/SQLite**: 데이터베이스

### Mobile App
- **React Native**: 크로스 플랫폼 모바일 프레임워크
- **Expo**: 빠른 개발 및 배포
- **TypeScript**: 타입 안정성
- **Expo Router**: 파일 기반 네비게이션
- **Expo Image Picker**: 카메라 및 갤러리
- **Axios**: HTTP 클라이언트

## 🗺️ 로드맵

### MVP (현재)
- [x] 프로젝트 구조 설정
- [ ] OCR 파이프라인 구현
- [ ] AI 정리 로직 구현
- [ ] 기본 UI 구현
- [ ] 노트 저장 기능

### V2 (유료 기능)
- [ ] 시험 대비 Pro 기능
- [ ] 문제 자동 생성
- [ ] 고급 템플릿
- [ ] 노트 편집 기능
- [ ] 과금 시스템

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👥 기여

기여를 환영합니다! 이슈를 등록하거나 Pull Request를 보내주세요.

## 📧 문의

프로젝트 관련 문의사항은 Issues 탭을 이용해주세요.

---

**Made with ❤️ by NoteGen Team**
