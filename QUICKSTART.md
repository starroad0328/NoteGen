# 🚀 NoteGen 빠른 시작 가이드

## 📋 파이프라인 구조

```
이미지 업로드 → OCR 처리 → AI 정리 → 노트 저장
```

## 🔧 백엔드 실행하기

### 1. 환경 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```env
# 필수: OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# 선택: Google Cloud Vision (더 나은 OCR)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Database (기본: SQLite)
DATABASE_URL=sqlite:///./notegen.db
```

### 3. 서버 실행

```bash
uvicorn app.main:app --reload
```

서버가 `http://localhost:8000`에서 실행됩니다!

## 📚 API 사용 방법

### API 문서 확인

브라우저에서 다음 주소를 열어 API 문서를 확인하세요:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 전체 플로우 예시

#### 1단계: 이미지 업로드

```bash
curl -X POST "http://localhost:8000/api/upload/" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@note1.jpg" \
  -F "files=@note2.jpg" \
  -F "organize_method=basic_summary"
```

**응답:**
```json
{
  "id": 1,
  "title": "필기 2025-01-15 10:30",
  "status": "uploading",
  "organize_method": "basic_summary",
  "created_at": "2025-01-15T10:30:00"
}
```

#### 2단계: 처리 시작

```bash
curl -X POST "http://localhost:8000/api/process/1/process"
```

**응답:**
```json
{
  "note_id": 1,
  "status": "ocr_processing",
  "message": "노트 처리가 시작되었습니다."
}
```

#### 3단계: 상태 확인 (폴링)

```bash
curl "http://localhost:8000/api/process/1/status"
```

**응답 (처리 중):**
```json
{
  "note_id": 1,
  "status": "ai_organizing",
  "message": "AI 정리 중..."
}
```

**응답 (완료):**
```json
{
  "note_id": 1,
  "status": "completed",
  "message": "처리 완료!",
  "organized_content": "# 일차함수\n\n## 정의\n• ⭐ y = ax + b 형태..."
}
```

#### 4단계: 노트 조회

```bash
curl "http://localhost:8000/api/notes/1"
```

### 정리 방식 (Organize Method)

**1. basic_summary**: 기본 요약 정리
```
# 제목
## 소제목
• 요약 내용
• ⭐ 중요 개념
```

**2. cornell**: 코넬식 정리
```
| 키워드/질문 | 설명 |
|------------|------|
| ⭐ 개념이란? | 설명 |

📌 요약: 전체 내용 1문장
```

## 🧪 테스트하기

### Python 테스트 스크립트

`test_upload.py` 파일을 생성:

```python
import requests

# 1. 이미지 업로드
files = {
    'files': open('test_note.jpg', 'rb')
}
data = {
    'organize_method': 'basic_summary'
}

response = requests.post(
    'http://localhost:8000/api/upload/',
    files=files,
    data=data
)
note = response.json()
print(f"✅ 업로드 완료: {note['id']}")

# 2. 처리 시작
response = requests.post(
    f"http://localhost:8000/api/process/{note['id']}/process"
)
print(f"✅ 처리 시작")

# 3. 상태 확인
import time
while True:
    response = requests.get(
        f"http://localhost:8000/api/process/{note['id']}/status"
    )
    status = response.json()
    print(f"📊 상태: {status['message']}")

    if status['status'] == 'completed':
        print("✅ 완료!")
        print(status['organized_content'])
        break
    elif status['status'] == 'failed':
        print(f"❌ 실패: {status['error_message']}")
        break

    time.sleep(2)
```

실행:
```bash
python test_upload.py
```

## 🐛 트러블슈팅

### OCR 인식 안 됨

**문제**: "이미지에서 텍스트를 추출할 수 없습니다"

**해결**:
1. Google Cloud Vision API 설정 확인
2. 이미지 품질 확인 (선명한 사진)
3. 한글 지원 확인

### AI 정리 오류

**문제**: "AI 정리 중 오류 발생"

**해결**:
1. `OPENAI_API_KEY` 확인
2. API 사용 한도 확인
3. OCR 텍스트가 비어있지 않은지 확인

### 데이터베이스 에러

**문제**: "database is locked"

**해결**:
```bash
# SQLite 파일 삭제 후 재시작
rm notegen.db
uvicorn app.main:app --reload
```

## 📊 전체 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/upload/` | 이미지 업로드 |
| GET | `/api/upload/{id}` | 업로드 정보 조회 |
| POST | `/api/process/{id}/process` | 처리 시작 |
| GET | `/api/process/{id}/status` | 처리 상태 확인 |
| GET | `/api/notes/` | 노트 목록 |
| GET | `/api/notes/{id}` | 노트 상세 |
| DELETE | `/api/notes/{id}` | 노트 삭제 |

## 🎯 다음 단계

1. **프론트엔드 개발**: React/Next.js UI 구현
2. **테스트 작성**: pytest로 API 테스트
3. **배포**: Docker로 배포

---

**문제가 있나요?** GitHub Issues에 등록해주세요!
