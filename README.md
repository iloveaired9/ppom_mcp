# 🚀 Todo App - MCP 기반 자동화 개발 프로젝트

> Model Context Protocol을 활용한 완전 자동화 개발 워크플로우

## 📋 프로젝트 개요

**목표**: Todo 애플리케이션을 MCP(Model Context Protocol)를 활용하여 자동화된 개발 프로세스로 구현

**기술 스택**:
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Express.js + Prisma + SQLite
- **Tools**: MCP (filesystem + npm-scripts)

---

## 🏗️ 프로젝트 구조

```
todo-app/
├── docs/                          # PDCA 문서
│   ├── 01-plan/
│   │   └── PLAN.md               # 기능 계획
│   ├── 02-design/
│   │   └── DESIGN.md             # 기술 설계
│   └── 03-analysis/
│       └── README.md             # 분석 문서
│
├── src/                          # Backend 소스 코드
│   ├── index.js                  # Express 서버 (메인)
│   ├── api/                      # API 라우트
│   ├── models/                   # 데이터 모델
│   ├── middleware/               # 미들웨어
│   ├── config/                   # 설정
│   └── utils/                    # 유틸리티
│
├── prisma/
│   └── schema.prisma             # DB 스키마
│
├── mcp-servers/
│   └── npm-scripts.js            # 커스텀 MCP 서버
│
├── .claude/
│   └── mcp.json                  # MCP 설정
│
├── .env                          # 환경 변수
├── .env.example                  # 환경 변수 예제
├── .gitignore                    # Git 무시 파일
├── package.json                  # npm 의존성
└── README.md                     # 이 파일
```

---

## 🚀 빠른 시작

### 1️⃣ 의존성 설치

```bash
npm install
```

### 2️⃣ 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name init
```

### 3️⃣ 개발 서버 시작

```bash
npm run dev
```

✅ **결과**: `http://localhost:3000` 에서 서버 실행

---

## 📚 npm Scripts

### 개발

```bash
npm run dev              # 개발 서버 시작
npm run start            # 프로덕션 서버 시작
npm run test             # 테스트 실행
npm run format           # 코드 포맷팅
npm run build            # 빌드
```

### Database

```bash
npx prisma migrate dev  # 마이그레이션 실행
npx prisma studio      # Prisma Studio (DB GUI)
npx prisma generate    # Prisma 클라이언트 생성
```

### PDCA 문서

```bash
npm run plan            # 기능 계획 보기
npm run design          # 설계 문서 보기
npm run analyze         # 분석 결과 보기
```

### MCP

```bash
npm run mcp:npm-scripts # MCP 서버 시작
```

---

## 🔌 API 엔드포인트

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. 할 일 목록 조회
```http
GET /api/todos?completed=false&priority=HIGH&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "할 일 제목",
      "completed": false,
      "priority": "HIGH",
      "dueDate": "2026-03-20",
      "createdAt": "2026-03-13T10:00:00Z"
    }
  ],
  "total": 10
}
```

---

#### 2. 할 일 생성
```http
POST /api/todos
Content-Type: application/json

{
  "title": "새로운 할 일",
  "description": "상세 설명 (선택)",
  "priority": "HIGH",
  "dueDate": "2026-03-20",
  "category": "work"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "새로운 할 일",
    "completed": false,
    "createdAt": "2026-03-13T10:05:00Z"
  },
  "message": "할 일이 생성되었습니다"
}
```

---

#### 3. 할 일 수정
```http
PATCH /api/todos/:id
Content-Type: application/json

{
  "title": "수정된 제목",
  "completed": true,
  "priority": "LOW"
}
```

---

#### 4. 할 일 삭제
```http
DELETE /api/todos/:id
```

---

#### 5. Health Check
```http
GET /health
```

---

## 🗄️ 데이터베이스 스키마

### todos 테이블

```prisma
model Todo {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean   @default(false)
  category    String    @default("general")
  priority    String    @default("MEDIUM")  // HIGH, MEDIUM, LOW
  dueDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([completed])
  @@index([priority])
}
```

---

## 🧪 테스트

### API 테스트 (curl)

```bash
# 할 일 생성
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"테스트 할 일","priority":"HIGH"}'

# 할 일 목록 조회
curl http://localhost:3000/api/todos

# Health Check
curl http://localhost:3000/health
```

### Postman/Insomnia

Postman이나 Insomnia를 사용하면 API 테스트가 더 편합니다.

---

## 🛠️ 개발 환경

### 필수 요구사항

- Node.js 18+
- npm 9+
- SQLite (로컬 개발)

### 환경 변수

`.env` 파일 참조:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
FRONTEND_URL="http://localhost:3000"
API_PREFIX="/api"
```

---

## 📝 PDCA 프로세스

### Phase 1: Plan ✅
- 기능 정의: `docs/01-plan/PLAN.md`
- MVP: 할 일 CRUD 구현

### Phase 2: Design ✅
- 기술 설계: `docs/02-design/DESIGN.md`
- API 명세, 데이터 모델

### Phase 3: Do 🔄 (진행 중)
- Backend 구현: Express + Prisma
- API 엔드포인트 완성

### Phase 4: Check ⏳ (예정)
- 설계-구현 검증
- 테스트 및 버그 수정

### Phase 5: Act ⏳ (예정)
- 개선사항 반영
- 성능 최적화

---

## 🔧 MCP 활용

### 등록된 MCP 서버

1. **filesystem** (기본 제공)
   - 파일 읽기/쓰기
   - 폴더 탐색

2. **npm-scripts** (커스텀)
   - npm scripts 실행
   - PDCA 문서 조회

### 사용 예

```bash
# 당신의 요청
"PLAN.md를 읽어서 내용을 정리해줘"

# MCP가 자동 실행
read_file("docs/01-plan/PLAN.md")
```

---

## 🚀 배포

### 로컬 개발
```bash
npm run dev
```

### 프로덕션
```bash
npm run build
npm start
```

### Docker (예정)
```bash
docker build -t todo-app .
docker run -p 3000:3000 todo-app
```

---

## 📊 진행 상황

| Phase | 상태 | 진행률 |
|-------|------|--------|
| Plan | ✅ 완료 | 100% |
| Design | ✅ 완료 | 100% |
| Do (Backend) | 🔄 진행중 | 50% |
| Check | ⏳ 예정 | 0% |
| Act | ⏳ 예정 | 0% |

---

## 📚 참고 자료

- [Express.js 문서](https://expressjs.com/)
- [Prisma 문서](https://www.prisma.io/docs/)
- [MCP 문서](https://modelcontextprotocol.io/)

---

## 👨‍💻 개발자

- **주도**: Claude (MCP-powered)
- **프로젝트 리드**: You
- **시작**: 2026-03-13

---

## 📝 라이선스

ISC

---

**마지막 업데이트**: 2026-03-13
**다음 단계**: Frontend 개발 시작
