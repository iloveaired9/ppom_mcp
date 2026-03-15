# Todo App API 문서

> 자동 생성됨: 2026-03-13 (doc-generator MCP)

## 개요

**Base URL**: `http://localhost:3001/api`

**인증**: 현재 없음 (개발 환경)

**응답 형식**: JSON

---

## 엔드포인트

### 1. 할 일 목록 조회

**요청**
```http
GET /api/todos?completed=false&priority=HIGH&limit=50&offset=0
```

**Query Parameters:**
- `completed` (boolean, optional) - 완료 상태 필터링
- `priority` (string, optional) - 우선순위 필터링 (HIGH, MEDIUM, LOW)
- `limit` (number, optional) - 최대 항목 수 (기본: 50)
- `offset` (number, optional) - 시작 위치 (기본: 0)

**응답 (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "할 일 1",
      "description": "상세 설명",
      "completed": false,
      "priority": "HIGH",
      "category": "work",
      "dueDate": "2026-03-20",
      "createdAt": "2026-03-13T10:00:00Z",
      "updatedAt": "2026-03-13T10:00:00Z"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

**cURL**
```bash
curl "http://localhost:3001/api/todos?priority=HIGH"
```

---

### 2. 할 일 생성

**요청**
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

**필수 필드:**
- `title` (string) - 할 일 제목 (1~255자)

**선택 필드:**
- `description` (string) - 설명 (0~1000자)
- `priority` (string) - 우선순위 (기본: MEDIUM)
- `dueDate` (string) - 마감일 (ISO 8601 형식)
- `category` (string) - 카테고리 (기본: general)

**응답 (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "title": "새로운 할 일",
    "description": "상세 설명",
    "completed": false,
    "priority": "HIGH",
    "category": "work",
    "dueDate": "2026-03-20",
    "createdAt": "2026-03-13T10:05:00Z",
    "updatedAt": "2026-03-13T10:05:00Z"
  },
  "message": "할 일이 생성되었습니다"
}
```

**cURL**
```bash
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MCP 학습",
    "priority": "HIGH",
    "dueDate": "2026-03-20",
    "category": "learning"
  }'
```

---

### 3. 할 일 수정

**요청**
```http
PATCH /api/todos/:id
Content-Type: application/json

{
  "title": "수정된 제목",
  "completed": true,
  "priority": "LOW"
}
```

**수정 가능 필드:**
- `title` - 제목
- `description` - 설명
- `completed` - 완료 상태
- `priority` - 우선순위
- `dueDate` - 마감일
- `category` - 카테고리

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "수정된 제목",
    "completed": true,
    "priority": "LOW",
    "createdAt": "2026-03-13T10:00:00Z",
    "updatedAt": "2026-03-13T10:10:00Z"
  },
  "message": "할 일이 수정되었습니다"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3001/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true, "priority": "LOW"}'
```

---

### 4. 할 일 삭제

**요청**
```http
DELETE /api/todos/:id
```

**응답 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1
  },
  "message": "할 일이 삭제되었습니다"
}
```

**cURL**
```bash
curl -X DELETE http://localhost:3001/api/todos/1
```

---

### 5. Health Check

**요청**
```http
GET /health
```

**응답 (200 OK):**
```json
{
  "status": "ok",
  "server": "todo-app-backend",
  "timestamp": "2026-03-13T10:00:00Z"
}
```

---

## 에러 응답

### 400 Bad Request
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

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "할 일을 찾을 수 없습니다"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "서버 오류가 발생했습니다"
  }
}
```

---

## HTTP 상태 코드

| 상태 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 리소스 생성 성공 |
| 400 | 잘못된 요청 |
| 404 | 리소스 찾을 수 없음 |
| 500 | 서버 오류 |

---

## 데이터 모델

### Todo 객체

```typescript
interface Todo {
  id: number;                    // 고유 ID
  title: string;                 // 제목 (필수, 1~255자)
  description?: string;          // 설명 (선택, 0~1000자)
  completed: boolean;            // 완료 여부 (기본: false)
  priority: "HIGH" | "MEDIUM" | "LOW";  // 우선순위 (기본: MEDIUM)
  category?: string;             // 카테고리 (기본: general)
  dueDate?: string;              // 마감일 (ISO 8601)
  createdAt: string;             // 생성 시간
  updatedAt: string;             // 수정 시간
}
```

---

## 사용 예제

### 기본 워크플로우

```bash
# 1. 할 일 생성
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "할 일 1", "priority": "HIGH"}'

# 응답: {"success": true, "data": {"id": 1, ...}}

# 2. 할 일 목록 조회
curl http://localhost:3001/api/todos

# 3. 할 일 완료 표시
curl -X PATCH http://localhost:3001/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# 4. 할 일 삭제
curl -X DELETE http://localhost:3001/api/todos/1
```

---

## 주의사항

- 모든 요청은 JSON 형식
- 필수 필드가 없으면 400 에러
- ID가 존재하지 않으면 404 에러
- 서버 오류는 500 에러

---

**생성**: 2026-03-13 (doc-generator MCP)
**버전**: 1.0.0
**상태**: 개발 중
