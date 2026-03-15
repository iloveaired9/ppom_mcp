# myawsdb MCP 표준화 + php-code-migrator-plus 연동 계획

## 📋 Context (배경)

**현재 상황:**
- myawsdb: http 모듈 기반이지만 MCP 표준이 완전하지 않음
  - tools 배열 존재하지만 `inputSchema` 없음
  - /tools 엔드포인트는 있지만 메타데이터 형식 미흡
  - 포트: 3004

- ppomppu-crawler: 완전한 MCP 표준 구현 (참고 가능)
  - tools 배열에 `inputSchema` 포함
  - /tools 엔드포인트가 표준 메타데이터 반환
  - 포트: 3008

- php-code-migrator-plus: myawsdb를 직접 HTTP API로 호출 중
  - 포트 불일치 문제 (기본값 3009 vs 실제 3004)
  - axios로 /query 엔드포인트 호출
  - MCP 도구 기반이 아님

**목표:**
1. ✅ myawsdb를 ppomppu-crawler 패턴을 따라 MCP 표준으로 완성
2. ✅ php-code-migrator-plus에서 myawsdb의 MCP 도구를 사용하도록 변경
3. ✅ SampleDataManager가 MCP 도구 호출 방식으로 통합

---

## 🏗️ 구현 전략

### Phase 1: myawsdb MCP 표준화 (30분)

**목표:** myawsdb를 ppomppu-crawler처럼 완전한 MCP 표준으로 변환

**수정 항목:**

#### 1.1 tools 배열에 inputSchema 추가 (myawsdb.js 라인 439-468)

**현재:** 간단한 객체 배열
```javascript
tools = [
  { name: 'execute_query', description: '...' }
]
```

**변경:** MCP 표준 inputSchema 포함
```javascript
tools = [
  {
    name: 'execute_query',
    description: 'SQL 쿼리 직접 실행',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL 쿼리' }
      },
      required: ['query']
    }
  },
  {
    name: 'query_records',
    description: '테이블에서 레코드 조회',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string' },
        where: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' }
      },
      required: ['tableName']
    }
  },
  // ... 나머지 6개 도구도 inputSchema 추가
]
```

#### 1.2 /tools 엔드포인트 응답 형식 표준화 (myawsdb.js 라인 544-548)

**변경 전:**
```javascript
// 현재 구현이 어떤지 확인 필요
```

**변경 후:** ppomppu-crawler 패턴 적용
```javascript
if (pathname === '/tools' && req.method === 'GET') {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ tools }, null, 2));
  return;
}
```

#### 1.3 포트 설정 표준화

**현재:** 포트 3004 고정
**변경:** 환경변수로 조정 가능
```javascript
const port = process.env.MYAWSDB_MCP_PORT || 3004;
```

### Phase 2: php-code-migrator-plus에서 MCP 도구 사용 (1시간)

**목표:** SampleDataManager가 axios HTTP 호출 대신 MCP 도구 방식으로 변경

#### 2.1 SampleDataManager 리팩토링 (plugins/php-code-migrator-plus/lib/SampleDataManager.js)

**현재 방식:** axios로 HTTP POST 호출
```javascript
const response = await axios.post(
  `${this.options.myawsdbUrl}/query`,
  { tableName, limit, offset }
);
```

**변경 방식:** MCP 도구 호출 방식
```javascript
// Option A: myawsdb HTTP API 유지 (호환성)
const response = await axios.post(
  `${this.options.myawsdbUrl}/query`,
  { tableName, limit, offset: 0 }
);

// Option B: MCP 도구 직접 호출 (향후)
// - Claude의 tool_use 메커니즘 활용
// - query_records 도구 이름으로 호출
// - inputSchema 준수
```

**현재:** 포트 기본값 3009 (틀림)
**변경:** 포트 기본값 3004 (올바름)
```javascript
myawsdbUrl: process.env.MYAWSDB_URL || 'http://localhost:3004',
```

#### 2.2 포트 불일치 수정

**파일:** plugins/php-code-migrator-plus/lib/SampleDataManager.js (라인 12)

```javascript
// 변경 전
myawsdbUrl: process.env.MYAWSDB_URL || 'http://localhost:3009',

// 변경 후
myawsdbUrl: process.env.MYAWSDB_URL || 'http://localhost:3004',
```

---

## 📊 파일 수정 목록

### 필수 수정

| 파일 | 라인 | 변경 내용 | 우선순위 |
|------|------|---------|---------|
| `mcp-servers/myawsdb.js` | 439-468 | 7개 도구에 inputSchema 추가 | 🔴 높음 |
| `mcp-servers/myawsdb.js` | 544-548 | /tools 응답 형식 표준화 | 🔴 높음 |
| `mcp-servers/myawsdb.js` | 포트 설정 | 환경변수 설정 추가 | 🟡 중간 |
| `plugins/php-code-migrator-plus/lib/SampleDataManager.js` | 12 | 포트 3009 → 3004 변경 | 🔴 높음 |

### 선택 사항 (향후)

| 항목 | 설명 | 우선순위 |
|------|------|---------|
| MCP 도구 직접 호출 | SampleDataManager에서 HTTP 대신 MCP 프로토콜 사용 | 🟢 낮음 |
| myawsdb 스킬 생성 | `.claude/skills/myawsdb/SKILL.md` 생성 | 🟢 낮음 |
| 통합 테스트 | myawsdb MCP + php-code-migrator-plus 연동 테스트 | 🟢 낮음 |

---

## ✅ 검증 계획

### 테스트 1: myawsdb MCP 표준 확인

```bash
# 1. myawsdb 서버 시작
node mcp-servers/myawsdb.js &

# 2. /tools 엔드포인트 확인
curl http://localhost:3004/tools | jq '.tools[0]'

# 예상 결과:
# {
#   "name": "execute_query",
#   "description": "SQL 쿼리 직접 실행",
#   "inputSchema": {
#     "type": "object",
#     "properties": { "query": { "type": "string" } },
#     "required": ["query"]
#   }
# }
```

### 테스트 2: php-code-migrator-plus 연동 확인

```bash
# 1. 마이그레이션 실행
cd plugins/php-code-migrator-plus
node index.js full --className LibFunctions --table_name posts

# 2. 샘플 데이터 조회 성공 확인
# ✅ Fetched 1 record(s) from posts
# ✅ Sample CSV saved: samples/posts_sample.csv

# 3. 생성된 CSV 확인
head samples/posts_sample.csv
```

### 테스트 3: 테스트 코드 실행

```bash
php output/test_libfunctions_data_validation.php
# 예상: ✅ All validation tests passed!
```

---

## 🎯 최종 목표 상태

```
✅ myawsdb
   ├─ MCP 표준 준수 (inputSchema 포함)
   ├─ 7개 도구 메타데이터 완성
   └─ /tools 엔드포인트 표준화

✅ php-code-migrator-plus
   ├─ SampleDataManager 포트 수정 (3009 → 3004)
   └─ myawsdb MCP와 통합

✅ 통합 워크플로우
   lib.php (원본)
   ↓
   lib_migrated.php (변환된 클래스)
   ↓
   test_libfunctions_data_validation.php (테스트 코드)
   ↓
   samples/posts_sample.csv (샘플 데이터 - myawsdb 기반)
```

---

## 📝 참고 자료

**ppomppu-crawler MCP 표준 구현 참고:**
- 파일: `mcp-servers/ppomppu-crawler/ppomppu-crawler.js`
- tools 배열 정의: 라인 33-132
- /tools 엔드포인트: 라인 544-548
- inputSchema 예시: 라인 39-49 (crawl_board)

**myawsdb 현재 구조:**
- 파일: `mcp-servers/myawsdb.js`
- tools 배열: 라인 439-468
- /tools 엔드포인트: 라인 474 (확인 필요)
- 포트: 3004

**SampleDataManager 현재 구조:**
- 파일: `plugins/php-code-migrator-plus/lib/SampleDataManager.js`
- axios 호출: 라인 27-53
- 포트 설정: 라인 12 (포트 오류 있음)

