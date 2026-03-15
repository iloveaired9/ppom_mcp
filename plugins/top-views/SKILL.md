# Top Views Plugin - 조회수 기준 TOP N 게시물 조회

> 뽐뿌 게시판에서 **조회수 기준으로 상위 N개 게시물**을 빠르게 조회하는 스킬입니다.

## 🎯 기능

- 게시판의 **조회수 기준 TOP N 게시물** 추출
- 4개 게시판 지원 (자유게시판, 야구, 뽐뿌, 주식)
- 페이지 및 개수 커스터마이징 가능
- MCP 서버와 직접 크롤링 이중 지원

## 📊 사용 방법

### 기본 형식
```bash
/fetch-and-summarize-freeboard 조회수 기준 TOP 10 조회
```

### 실제 예제

**1️⃣ 기본 TOP 10 조회**
```bash
get_top_views board=freeboard
```
→ 자유게시판 1페이지의 조회수 TOP 10 게시물

**2️⃣ TOP 5 조회**
```bash
get_top_views board=freeboard limit=5
```

**3️⃣ 특정 페이지의 TOP 15**
```bash
get_top_views board=baseball page=2 limit=15
```

**4️⃣ 주식 게시판 TOP 3**
```bash
get_top_views board=stock limit=3
```

## 📋 지원하는 게시판

| 게시판 ID | 이름 | 기본값 |
|-----------|------|--------|
| `freeboard` | 자유게시판 | page=1, limit=10 |
| `baseball` | 야구 게시판 | page=1, limit=10 |
| `ppomppu` | 뽐뿌 일반 | page=1, limit=10 |
| `stock` | 주식 게시판 | page=1, limit=10 |

## 🔧 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `board` | string | ✅ | - | 게시판 ID |
| `page` | integer | ❌ | 1 | 페이지 번호 |
| `limit` | integer | ❌ | 10 | TOP N 개수 |

## 📤 응답 형식

```json
{
  "success": true,
  "metadata": {
    "board": "freeboard",
    "page": 1,
    "limit": 10,
    "totalPosts": 30,
    "topN": 10
  },
  "data": {
    "boardId": "freeboard",
    "page": 1,
    "limit": 10,
    "topPosts": [
      {
        "no": "9874059",
        "title": "호불호가 갈린다는 수술",
        "author": "Wkquqhah",
        "views": 712,
        "recommends": { "up": 2, "down": 0 },
        "createdAt": "23:13:12",
        "url": "https://www.ppomppu.co.kr/zboard/view.php?..."
      },
      // ... 9개 더
    ]
  }
}
```

## 🚀 시작하기

### 1. MCP 서버 시작 (필수)
```bash
npm run ppom:server
```

### 2. 스킬 실행
```bash
# 자유게시판 조회수 TOP 10
/fetch-and-summarize-freeboard 조회수 TOP 10

# 야구 게시판 TOP 5
get_top_views board=baseball limit=5
```

### 3. HTTP API로 직접 호출
```bash
curl "http://localhost:3008/top-views?board=freeboard&page=1&limit=10"
```

## 📊 실제 사용 예시

### 예시 1: 오늘의 인기 게시물 조회
```
자유게시판에서 가장 많이 읽힌 게시물 TOP 5는?
→ get_top_views board=freeboard limit=5
```

### 예시 2: 특정 페이지의 인기도 비교
```
야구 게시판 2페이지의 조회수 순위는?
→ get_top_views board=baseball page=2 limit=10
```

### 예시 3: 전체 인기도 분석
```
주식 게시판에서 가장 주목받는 게시물 TOP 3
→ get_top_views board=stock limit=3
```

## 🔗 관련 기능

- **조회수 기준 정렬**: 내림차순 (높은 순서대로)
- **추천 분석**: up/down 추천 수 분리 제공
- **중복 제거**: 동일 게시물 자동 필터링

## ⚙️ 기술 스택

- **크롤링**: axios + cheerio
- **인코딩**: iconv-lite (EUC-KR → UTF-8)
- **서버**: Node.js HTTP + MCP

## 📝 플러그인 구조

```
plugins/top-views/
├── index.js                    # 플러그인 진입점 & 도구 정의
├── top-views-analyzer.js       # 분석 로직
└── SKILL.md                   # 이 파일
```

## 🎯 MCP 도구

도구 이름: `get_top_views`

```javascript
{
  name: 'get_top_views',
  description: '게시판에서 조회수 기준 TOP N 게시물을 조회합니다',
  parameters: {
    board: { type: 'string', required: true },
    page: { type: 'integer', required: false, default: 1 },
    limit: { type: 'integer', required: false, default: 10 }
  }
}
```

## 💡 팁

1. **빠른 조회**: limit=5로 설정하면 응답이 빠름
2. **다중 페이지**: page 파라미터로 여러 페이지 비교 가능
3. **자동 폴백**: MCP 서버가 다운되면 자동으로 직접 크롤링 시도
4. **캐싱**: 같은 요청을 반복하면 캐시 활용 추천

## 🔧 트러블슈팅

### Q: "데이터 수집 실패" 에러?
**A:**
1. MCP 서버가 실행 중인지 확인: `npm run ppom:server`
2. 포트 3008이 열려 있는지 확인
3. 네트워크 연결 확인

### Q: 조회수가 표시되지 않음?
**A:** 뽐뿌 웹사이트의 HTML 구조가 변경되었을 수 있습니다.
- MCP 서버 로그 확인
- 직접 크롤링 폴백 동작

## 📡 엔드포인트

- **MCP 도구**: `get_top_views(board, page?, limit?)`
- **HTTP API**: `GET /top-views?board=freeboard&page=1&limit=10`
- **MCP 서버**: `http://localhost:3008`

---

**버전**: 1.0.0
**최종 업데이트**: 2026-03-16
**상태**: ✅ 활성화
