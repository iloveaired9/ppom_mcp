---
name: myawsdb
description: myawsdb MCP 서버 도구 실행
author: Claude Code
arguments: |
  명령어 형식:
  - query <tableName> [limit=N] [offset=N] [where="조건"]
  - describe <tableName>
  - get_tables
  - execute <SQL>
  - insert <tableName> <JSON>
  - update <tableName> <JSON> where <조건>
  - delete <tableName> where <조건>
---

# myawsdb Tools 조회

myawsdb MCP 서버의 사용 가능한 도구 목록을 조회합니다.

---

## 사용법

```bash
/myawsdb
```

---

## 기능

myawsdb 서버 (포트 3004)에서 제공하는 모든 MCP 도구를 조회하여 표시합니다.

각 도구는 다음 정보를 포함합니다:
- **이름** (name)
- **설명** (description)
- **입력 스키마** (inputSchema)

---

## 예시

```bash
/myawsdb
```

**응답 예시:**
```json
{
  "tools": [
    {
      "name": "execute_query",
      "description": "SQL 쿼리 실행",
      "inputSchema": { ... }
    },
    {
      "name": "get_tables",
      "description": "데이터베이스의 모든 테이블 목록 조회",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

---

## 도구 목록

1. **execute_query** - SQL 쿼리 직접 실행
2. **get_tables** - 데이터베이스의 모든 테이블 목록 조회
3. **describe_table** - 테이블의 구조 및 정보 조회
4. **query_records** - 테이블에서 레코드 조회
5. **insert_record** - 테이블에 새 레코드 삽입
6. **update_record** - 테이블의 레코드 업데이트
7. **delete_record** - 테이블에서 레코드 삭제

---

## 서버 정보

- **포트**: 3010 (현재 운영 포트)
- **대체 포트**: 3004 (MYAWSDB_PORT 환경변수로 변경 가능)
- **엔드포인트**: http://localhost:3010/tools
- **데이터베이스**: aired@54.180.52.120:3306 (connected ✓)

---

## 명령어 실행

사용자가 제공한 ARGUMENTS를 파싱해서 myawsdb API를 호출합니다.

**명령어 매핑:**
- `query <table> [limit=N]` → POST /query
- `describe <table>` → POST /describe
- `get_tables` → GET /tables
- `execute <SQL>` → POST /execute
- `insert <table> <JSON>` → POST /insert
- `update <table> <JSON>` → POST /update
- `delete <table>` → POST /delete

**처리 방법:**
1. 사용자 입력(ARGUMENTS)에서 명령어와 파라미터 추출
2. 적절한 myawsdb 엔드포인트에 POST/GET 요청
3. JSON 결과를 정렬해서 표시

예를 들어:
- `/myawsdb query posts limit 1` → `curl -X POST http://localhost:3010/query -d '{"tableName":"posts","limit":1}'`
- `/myawsdb describe posts` → `curl -X POST http://localhost:3010/describe -d '{"tableName":"posts"}'`
- `/myawsdb get_tables` → `curl http://localhost:3010/tables`
