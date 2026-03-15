---
name: ppom
description: ppomppu-crawler MCP 서버의 도움말 및 API 호출
version: 1.0.0
prompt: |
  사용자가 ppomppu-crawler 관련 명령을 요청합니다.

  명령 형식:
  - /ppom help → 도움말 표시
  - /ppom freeboard [page] → 자유게시판 조회
  - /ppom baseball [page] → 야구 게시판 조회
  - /ppom ppomppu [page] → 뽐뿌 게시판 조회
  - /ppom stock [page] → 주식 게시판 조회
  - /ppom analyze <board> [page] → 게시판 분석

  당신은 다음을 자동으로 실행합니다:
  1. 사용자 명령 파싱
  2. 해당하는 curl 명령 실행 (localhost:3008)
  3. JSON 결과 수신
  4. 데이터 정리 및 표시
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

## 🔧 분석 기능

`/analyze` 엔드포인트는 다음 분석 정보를 제공합니다:

- **timeline**: 시간대별 게시물 분석
- **keywords**: 핵심 키워드 추출 (상위 5개)
- **categories**: 게시물 자동 카테고리 분류
- **participation**: 사용자 참여도 분석
- **topPosts**: 상위 게시물 (조회수 기준)

### 예시:
```bash
curl "http://localhost:3008/analyze?board=freeboard&page=1"
```

응답:
```json
{
  "analysis": {
    "timeline": { ... },
    "keywords": [ "검찰개혁", "김어준", ... ],
    "categories": { "정치": 12, "국제": 5, ... },
    "participation": { "avgRecommends": 285, "maxRecommends": 1065 },
    "topPosts": [ ... ]
  },
  "metadata": { ... }
}
```

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
