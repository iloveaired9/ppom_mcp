# Todo App 기술 설계

## 프로젝트 개요
기반: `docs/01-plan/PLAN.md`
설계 일시: 2026-03-13
설계자: Claude (MCP)

---

## 📐 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js 14)           │
│  ┌──────────────────────────────────┐   │
│  │    UI Components (React)         │   │
│  │  - TodoList, TodoForm, TodoItem  │   │
│  └──────────────┬───────────────────┘   │
│                 │ API Calls              │
└─────────────────┼──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    Backend API (Node.js + Express)      │
│  ┌──────────────────────────────────┐   │
│  │  REST Endpoints                  │   │
│  │  - POST   /api/todos             │   │
│  │  - GET    /api/todos             │   │
│  │  - PATCH  /api/todos/:id         │   │
│  │  - DELETE /api/todos/:id         │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│                 ▼                        │
│  ┌──────────────────────────────────┐   │
│  │  ORM (Prisma)                    │   │
│  │  - todos 모델                    │   │
│  │  - 데이터 검증                   │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼──────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    Database (PostgreSQL)                │
│  ┌──────────────────────────────────┐   │
│  │  todos 테이블                    │   │
│  │  - id (PK)                       │   │
│  │  - title                         │   │
│  │  - completed                     │   │
│  │  - createdAt                     │   │
│  │  - updatedAt                     │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🗄️ 데이터 모델

### todos 테이블

```sql
CREATE TABLE todos (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  completed       BOOLEAN DEFAULT FALSE,
  category        VARCHAR(50),
  priority        ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  dueDate         DATE,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Prisma Schema

```prisma
model Todo {
  id          Int     @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean @default(false)
  category    String?
  priority    String  @default("MEDIUM")
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🔌 API 명세

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. 할 일 목록 조회
```http
GET /todos
```

**Query Parameters:**
- `completed` (boolean, optional) - 완료 상태 필터링
- `priority` (string, optional) - 우선순위 필터링
- `limit` (number, optional) - 최대 항목 수 (기본: 50)
- `offset` (number, optional) - 시작 위치 (기본: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "할 일 1",
      "completed": false,
      "priority": "HIGH",
      "createdAt": "2026-03-13T10:00:00Z"
    }
  ],
  "total": 10
}
```

---

#### 2. 할 일 생성
```http
POST /todos
Content-Type: application/json

{
  "title": "새로운 할 일",
  "description": "설명 (선택)",
  "priority": "HIGH",
  "dueDate": "2026-03-20"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "새로운 할 일",
    "completed": false,
    "createdAt": "2026-03-13T10:05:00Z"
  }
}
```

---

#### 3. 할 일 수정
```http
PATCH /todos/:id
Content-Type: application/json

{
  "title": "수정된 제목",
  "completed": true,
  "priority": "LOW"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "수정된 제목",
    "completed": true
  }
}
```

---

#### 4. 할 일 삭제
```http
DELETE /todos/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "할 일 삭제 완료"
}
```

---

## 🎨 프론트엔드 컴포넌트 구조

```
app/
├── page.tsx                    # 메인 페이지
├── layout.tsx                  # 레이아웃
├── components/
│   ├── TodoList.tsx           # 할 일 목록
│   ├── TodoItem.tsx           # 할 일 항목
│   ├── TodoForm.tsx           # 할 일 추가 폼
│   ├── TodoFilters.tsx        # 필터
│   └── Button.tsx             # 공용 버튼
├── hooks/
│   ├── useTodos.ts            # API 호출 훅
│   └── useFilters.ts          # 필터 상태 관리
└── lib/
    ├── api.ts                 # API 클라이언트
    └── types.ts               # TypeScript 타입
```

---

## 🔐 보안 고려사항

### 입력 검증
- 제목: 1~255 자 (필수)
- 설명: 0~1000 자
- 우선순위: ENUM 검증 (HIGH, MEDIUM, LOW)

### CORS 설정
```javascript
// Backend
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 요청 수
});
app.use('/api/', limiter);
```

---

## 📋 에러 처리

### 에러 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "제목은 필수입니다",
    "details": {
      "field": "title",
      "value": ""
    }
  }
}
```

### HTTP 상태 코드
| 상태 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 요청 오류 |
| 404 | 찾을 수 없음 |
| 500 | 서버 오류 |

---

## 🧪 테스트 계획

### 유닛 테스트
- API 엔드포인트 (4개)
- Prisma 쿼리 (CRUD)
- 입력 검증

### 통합 테스트
- 전체 todo 워크플로우
- 데이터 일관성
- 성능 (1000개 항목 처리)

### E2E 테스트
- 사용자 시나리오
- 브라우저 호환성

---

## 📈 성능 최적화

### 데이터베이스
- `id` 인덱싱
- `completed` 인덱싱 (조회 속도)
- 페이지네이션 (기본 50개)

### API
- 응답 캐싱 (5분)
- 데이터 압축 (gzip)
- 요청 제한 (Rate Limiting)

### 프론트엔드
- 컴포넌트 메모이제이션
- 이미지 최적화
- 번들 크기 최소화

---

## 🚀 배포 전략

### Frontend
- **Platform**: Vercel
- **배포**: main 브랜치 푸시 시 자동 배포
- **환경**: Production, Staging

### Backend
- **Platform**: Railway
- **배포**: Docker 컨테이너
- **환경**: Production, Staging

---

## 📝 변경 이력

| 날짜 | 변경 사항 | 버전 |
|------|---------|------|
| 2026-03-13 | 초안 작성 | 1.0 |

---

**상태**: 📋 Draft → 리뷰 대기

**다음 단계**:
1. ✅ Design 완료 (이 문서)
2. ⏳ Backend 개발 (3일)
3. ⏳ Frontend 개발 (3일)
4. ⏳ 테스트 및 배포 (2일)

**예상 완료**: 2026-03-25
