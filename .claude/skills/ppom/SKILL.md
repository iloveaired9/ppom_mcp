---
name: ppom
description: ppomppu-crawler MCP 서버 (빠른 조회)
version: 1.0.1
prompt: |
  사용자 명령어를 파싱하고 즉시 curl로 실행하세요.

  `/ppom help` 명령어 실행 시:
  - bash .claude/skills/ppom/help.sh 를 실행하고 결과를 표시 (도움말 + 실제 API 응답 명세 포함)

  기타 명령어:
  - `/ppom freeboard [page]` → curl -s "http://localhost:3008/freeboard?page=[page|1]" → 게시물 목록 (JSON 또는 테이블)
  - `/ppom baseball [page]` → curl -s "http://localhost:3008/baseball?page=[page|1]" → 게시물 목록
  - `/ppom ppomppu [page]` → curl -s "http://localhost:3008/ppomppu?page=[page|1]" → 게시물 목록
  - `/ppom stock [page]` → curl -s "http://localhost:3008/stock?page=[page|1]" → 게시물 목록
  - `/ppom analyze <board> [page]` → curl -s "http://localhost:3008/analyze?board=[board]&page=[page|1]" → 분석 결과
  - `/ppom tools` → curl -s "http://localhost:3008/tools" → 도구 목록 (JSON)
  - `/ppom status` → curl -s "http://localhost:3008/health" → 서버 상태

  출력 형식: 간결하게 (JSON, 테이블, 또는 마크다운)
---

# ppomppu-crawler 도움말

> `/ppom help` 처럼 편리하게 ppomppu-crawler 도구와 엔드포인트 정보 확인!

---

## 🚀 사용 가능한 명령어

### 기본 사용법
```bash
/ppom help                      # 이 도움말 표시
/ppom freeboard [page]          # 자유게시판 조회 (기본: 1페이지)
/ppom baseball [page]           # 야구 게시판 조회
/ppom ppomppu [page]            # 뽐뿌 일반 게시판 조회
/ppom stock [page]              # 주식 게시판 조회
/ppom analyze <board> [page]    # 게시판 분석 (키워드, 통계, 카테고리)
```

### 실제 예제
```bash
/ppom freeboard 1               # 자유게시판 1페이지 데이터 조회
/ppom analyze freeboard 1       # 자유게시판 1페이지 분석 (트렌드, 키워드, 통계)
/ppom baseball 1                # 야구 게시판 1페이지 조회
/ppom analyze baseball 1        # 야구 게시판 분석
```

### 출력 결과
- **데이터 조회** (`/ppom board page`):
  - 게시물 목록 (번호, 제목, 작성자, 조회수)

- **분석** (`/ppom analyze board page`):
  - 시간대별 분포
  - 핵심 키워드 (상위 5개)
  - 카테고리 분류
  - 참여도 통계 (추천, 댓글)
  - 상위 게시물

---

## 📋 제공하는 도구 (MCP Tools)

ppomppu-crawler MCP 서버는 다음 **6개의 도구**를 제공합니다:

### 1️⃣ crawl_board
**뽐뿌 게시판 페이지 크롤링 (모든 게시판)**
- 지원 게시판: freeboard, baseball, ppomppu, stock
- 파라미터: board (필수), page (1 이상)
- 엔드포인트: `POST /crawl`

### 2️⃣ analyze_board
**게시판 데이터 분석**
- 카테고리 분류, 키워드 추출, 통계 분석
- 지원 게시판: freeboard, baseball, ppomppu, stock
- 엔드포인트: `GET /analyze?board=freeboard&page=1`

### 3️⃣ get_freeboard
**자유게시판(freeboard) 조회**
- 엔드포인트: `GET /freeboard?page=1`

### 4️⃣ get_baseball
**야구 게시판(baseball) 조회**
- 엔드포인트: `GET /baseball?page=1`

### 5️⃣ get_ppomppu
**뽐뿌 일반 게시판(ppomppu) 조회**
- 엔드포인트: `GET /ppomppu?page=1`

### 6️⃣ get_stock
**주식 게시판(stock) 조회**
- 엔드포인트: `GET /stock?page=1`

---

## 🎯 사용 방법

### 방법 1: MCP 도구로 직접 사용
Claude에서 자동으로 ppomppu-crawler 도구를 발견하고 사용할 수 있습니다:
```
crawl_board(board='freeboard', page=1)
analyze_board(board='baseball', page=1)
```

### 방법 2: HTTP API (curl)
서버에 직접 요청:
```bash
# 도구 목록 확인
curl "http://localhost:3008/tools"

# freeboard 1페이지 조회
curl "http://localhost:3008/freeboard?page=1"

# baseball 데이터 분석
curl "http://localhost:3008/analyze?board=baseball&page=1"

# 도움말 보기
curl "http://localhost:3008/help"
curl "http://localhost:3008/help?topic=tools"
curl "http://localhost:3008/help?topic=boards"
curl "http://localhost:3008/help?topic=examples"
```

### 방법 3: npm 스크립트
```bash
# 도움말 표시
npm run ppom:help

# 도구 목록 확인
npm run ppom:tools

# 서버 상태 확인
npm run ppom:status

# 특정 토픽만 보기
npm run ppom:help:tools
npm run ppom:help:boards
npm run ppom:help:examples
```

---

## 📊 게시판 정보

| ID | 이름 | URL |
|-----|------|-----|
| freeboard | 자유게시판 | `/freeboard?page=1` |
| baseball | 야구 게시판 | `/baseball?page=1` |
| ppomppu | 뽐뿌 일반 | `/ppomppu?page=1` |
| stock | 주식 게시판 | `/stock?page=1` |

---

## 📡 엔드포인트 응답 명세

### 1️⃣ GET /tools - MCP 도구 목록 (6개)
**crawl_board**, **analyze_board**, **get_freeboard**, **get_baseball**, **get_ppomppu**, **get_stock**
- 각 도구는 JSON-RPC 스키마로 정의됨
- 입력 파라미터: board (필수), page (선택)

### 2️⃣ GET /freeboard?page=1 - 게시판 데이터
```json
{
  "success": true,
  "data": {
    "boardId": "freeboard",
    "page": 1,
    "postCount": 30,
    "posts": [
      {"no": "9873895", "title": "이동형이 김어준을...", "author": "예비역", "views": "278"},
      {"no": "9873894", "title": "뉴이재명 토론...", "author": "길냥이추워", "views": "251"}
    ]
  }
}
```
**응답 구조**: success, data.boardId, data.page, data.postCount, data.posts[]

### 3️⃣ GET /analyze?board=freeboard&page=1 - 분석 결과
```json
{
  "success": true,
  "metadata": {
    "board": "freeboard",
    "page": 1,
    "totalPosts": 30,
    "processingTime": "370ms"
  },
  "analysis": {
    "timeline": {"hourlyDistribution": {"21": 26}, "peakHours": ["21"]},
    "keywords": [
      {"text": "뉴이재명", "count": 3, "score": 0.55},
      {"text": "페북", "count": 2, "score": 0.53}
    ],
    "categories": {"정치/검찰": 8, "국제": 5}
  }
}
```
**응답 구조**: success, metadata, analysis.timeline, analysis.keywords[], analysis.categories

---

## 🌐 서버 정보

- **이름**: ppomppu-crawler
- **버전**: 2.0.0-mcp-standard
- **포트**: 3008 (기본값)
- **프로토콜**: HTTP (MCP 표준)
- **프레임워크**: Node.js http 모듈

### 서버 상태 확인
```bash
curl "http://localhost:3008/health"
```

---

## 💡 사용 예시

### 예시 1: 자유게시판 현황 파악
```bash
curl "http://localhost:3008/analyze?board=freeboard&page=1"
```

### 예시 2: 야구 게시판 핵심 키워드
```bash
curl "http://localhost:3008/analyze?board=baseball&page=1" | grep -A 5 "keywords"
```

### 예시 3: 도구 메타데이터 확인
```bash
curl "http://localhost:3008/tools" | jq '.tools[0]'
```

---

## 🔗 관련 링크

- 뽐뿌 웹사이트: https://www.ppomppu.co.kr/
- MCP 프로토콜: https://modelcontextprotocol.io/
- 프로젝트 설계 문서: `docs/02-design/PPOMPPU_PLUGIN_DESIGN.md`

---

## ❓ 도움말 더 보기

더 자세한 도움말을 보려면:

```bash
# 전체 도움말
curl "http://localhost:3008/help?topic=all"

# 특정 섹션만 보기
npm run ppom:help:tools      # 도구 목록
npm run ppom:help:boards     # 게시판 정보
npm run ppom:help:examples   # 사용 예시
```
