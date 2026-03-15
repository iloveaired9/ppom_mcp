# ppomppu-crawler-analysis 기술 설계

> MCP 서버에 분석 기능을 통합하기 위한 상세 기술 설계 문서

**Feature**: ppomppu-crawler-analysis
**Level**: Dynamic
**Design Date**: 2026-03-14
**Status**: 🔵 Design

---

## 📐 아키텍처 설계

### 1. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Client                          │
│         (Browser / CLI / API Client)                     │
└────────────────────┬────────────────────────────────────┘
                     │
        GET /analyze?board=freeboard&page=1
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          MCP Server: ppomppu-crawler                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Request Handler: /analyze                       │  │
│  └───────────┬────────────────────────────────────┬─┘  │
│              │                                    │     │
│              ▼                                    │     │
│  ┌──────────────────────┐                        │     │
│  │  Data Fetcher        │                        │     │
│  │  fetchBoard(board)   │                        │     │
│  └───────────┬──────────┘                        │     │
│              │                                    │     │
│              ▼                                    │     │
│  ┌──────────────────────────────────────────┐   │     │
│  │  Analysis Pipeline                       │   │     │
│  │  ┌──────────────────────────────────┐   │   │     │
│  │  │ analyzeTimeline(posts)           │   │   │     │
│  │  ├──────────────────────────────────┤   │   │     │
│  │  │ extractKeywords(posts, topN)     │   │   │     │
│  │  ├──────────────────────────────────┤   │   │     │
│  │  │ categorizePost(posts)            │   │   │     │
│  │  ├──────────────────────────────────┤   │   │     │
│  │  │ analyzeParticipation(posts)      │   │   │     │
│  │  ├──────────────────────────────────┤   │   │     │
│  │  │ getTopPosts(posts, topN)         │   │   │     │
│  │  └──────────────────────────────────┘   │   │     │
│  │              │                           │   │     │
│  │              ▼                           │   │     │
│  │  analyzeFreeboard(posts) → Analysis   │   │     │
│  └──────────────────────────────────────────┘   │     │
│              │                                    │     │
│              ▼                                    │     │
│  ┌──────────────────────────────────────────┐   │     │
│  │  Response Builder                        │   │     │
│  │  {                                       │   │     │
│  │    metadata: { board, page, total... }  │   │     │
│  │    analysis: { categories, keywords... }│   │     │
│  │  }                                       │   │     │
│  └──────────────────────────────────────────┘   │     │
│              │                                    │     │
└──────────────┼────────────────────────────────────┘     │
               │                                         │
               └─────────────────────────────────────────┘
                     JSON Response
```

### 2. 데이터 흐름

```javascript
// 요청
GET /analyze?board=freeboard&page=1

// 1️⃣ 요청 파싱
{
  board: "freeboard",
  page: 1
}

// 2️⃣ 데이터 수집 (fetchBoard)
[
  { no: 9871290, title: "...", author: "...", views: 100, recommends: "10-5", createdAt: "2026-03-14 00:13" },
  { no: 9871289, title: "...", author: "...", views: 90, recommends: "5-2", createdAt: "2026-03-14 00:15" },
  // ... 30개 게시물
]

// 3️⃣ 병렬 분석
{
  categories: analyzeTimeline(),     // 즉시 반환
  keywords: extractKeywords(),       // 즉시 반환
  topPosts: getTopPosts(),           // 즉시 반환
  participation: analyzeParticipation(), // 즉시 반환
  timeline: analyzeTimeline()        // 즉시 반환
}

// 4️⃣ 응답 생성
{
  metadata: { ... },
  analysis: { ... }
}

// 5️⃣ HTTP 응답
JSON (200 OK)
```

---

## 🔧 모듈 설계

### 1. Data Fetcher 모듈

**목적**: 게시판 데이터 수집

```javascript
async function fetchBoard(board, page = 1) {
  // 기존 ppomppu-crawler 로직 재사용
  // Return: Array<Post>

  // Post Interface:
  // {
  //   no: string,           // 게시물번호
  //   title: string,        // 제목
  //   author: string,       // 작성자
  //   views: number,        // 조회수
  //   recommends: string,   // "10-5" 형식 (추천-비추천)
  //   createdAt: string     // "2026-03-14 00:13" 형식
  // }
}
```

**입력**: board(string), page(number)
**출력**: Post[]
**성능**: < 300ms

---

### 2. Analysis Modules

#### 2.1 Timeline Analysis (시간대 분석)

```javascript
function analyzeTimeline(posts) {
  // 게시물이 집중된 시간대 분석

  return {
    hourlyDistribution: {
      "00": 5,  // 00시대 5개
      "01": 3,  // 01시대 3개
      "02": 2,
      // ...
    },
    peakHours: ["00", "01"],  // 피크 시간대
    peakHourCount: 8,         // 피크 시간대 게시물 수
    concentration: 26.7       // 집중도 (%)
  };

  // 로직:
  // 1. createdAt에서 시간(HH) 추출
  // 2. 시간대별 게시물 수 집계
  // 3. 가장 많은 시간대 계산
}
```

**입력**: Post[]
**출력**: TimelineAnalysis
**시간복잡도**: O(n)
**예상시간**: < 10ms

---

#### 2.2 Keyword Extraction (키워드 추출)

```javascript
function extractKeywords(posts, topN = 5) {
  // 제목에서 키워드 추출

  return {
    keywords: [
      { text: "검찰개혁", count: 8, score: 0.95 },
      { text: "이재명", count: 5, score: 0.92 },
      { text: "호르무즈", count: 4, score: 0.88 },
      { text: "야구", count: 3, score: 0.85 },
      { text: "포인트", count: 2, score: 0.80 }
    ],
    totalKeywords: 45,    // 추출된 전체 키워드 수
    uniqueKeywords: 32,   // 고유 키워드 수
    avgFrequency: 1.4     // 평균 빈도
  };

  // 로직:
  // 1. 각 제목에서 2글자 이상 명사 추출 (정규식)
  // 2. 빈도 계산
  // 3. Top N개 반환
  // 4. 점수 = 빈도 / 전체 * 중요도
}
```

**정규식 패턴**: `/([가-힣]{2,})/g`

**입력**: Post[], topN(number)
**출력**: KeywordAnalysis
**시간복잡도**: O(n * m) (m = 제목 길이)
**예상시간**: < 20ms

---

#### 2.3 Category Classification (카테고리 분류)

```javascript
function categorizePost(posts) {
  // 제목 키워드 매칭으로 자동 분류

  const categories = {
    "정치/검찰": [
      "검찰개혁", "검찰", "대통령", "윤석열",
      "이재명", "민주당", "여당", "야당"
    ],
    "국제": [
      "호르무즈", "이란", "미국", "이스라엘",
      "중국", "WBC", "해협", "기뢰"
    ],
    "스포츠": [
      "야구", "팀", "경기", "선수", "승리",
      "패배", "스포츠", "경기력"
    ],
    "연예/종교": [
      "김어준", "신천지", "영화", "드라마",
      "반지의제왕", "배우"
    ],
    "경제/쇼핑": [
      "포인트", "네이버", "페이", "구매",
      "쿠폰", "가격", "할인"
    ],
    "일상": [
      "고민", "의견", "이야기", "일상",
      "생활"
    ]
  };

  return {
    categoryDistribution: {
      "정치/검찰": { count: 12, percentage: 40 },
      "국제": { count: 5, percentage: 16.7 },
      "스포츠": { count: 3, percentage: 10 },
      "연예/종교": { count: 2, percentage: 6.7 },
      "경제/쇼핑": { count: 2, percentage: 6.7 },
      "일상": { count: 6, percentage: 20 }
    },
    topCategory: "정치/검찰",
    topCategoryCount: 12
  };

  // 로직:
  // 1. 각 게시물 제목 분석
  // 2. 카테고리별 키워드 매칭
  // 3. 가장 많이 매칭된 카테고리로 분류
  // 4. 분류 안 됨 → "기타"
}
```

**입력**: Post[]
**출력**: CategoryAnalysis
**시간복잡도**: O(n * k) (k = 카테고리 수)
**예상시간**: < 15ms

---

#### 2.4 Participation Analysis (참여도 분석)

```javascript
function analyzeParticipation(posts) {
  // 추천수 기반 참여도 분석

  // recommends 형식: "10-5" → 추천 10, 비추천 5

  return {
    recommends: {
      average: 285.3,      // 평균 추천수
      max: 1065,           // 최대 추천수
      min: 0,              // 최소 추천수
      median: 150,         // 중위수
      stdDev: 350.2        // 표준편차
    },
    dislikes: {
      average: 12.4,
      max: 50,
      min: 0
    },
    views: {
      average: 576,
      max: 2019,
      min: 100
    },
    engagement: {
      highEngagement: 8,   // 추천수 > 500인 게시물
      mediumEngagement: 15, // 100 < 추천수 <= 500
      lowEngagement: 7     // 추천수 <= 100
    },
    activityLevel: "높음"  // 평가: "높음" | "중간" | "낮음"
  };

  // 로직:
  // 1. recommends 파싱 (split("-"))
  // 2. 수치 계산 (평균, 최대, 중위수, 표준편차)
  // 3. 활동도 평가
}
```

**입력**: Post[]
**출력**: ParticipationAnalysis
**시간복잡도**: O(n)
**예상시간**: < 10ms

---

#### 2.5 Top Posts (상위 게시물)

```javascript
function getTopPosts(posts, topN = 5) {
  // 조회수 기준 상위 N개 게시물

  return [
    {
      no: "9871265",
      title: "내가 사람보는 눈이 없나 봅니다.",
      author: "nickname",
      views: 2019,
      recommends: { up: 34, down: 0 },
      createdAt: "2026-03-14 00:13",
      categoryGuess: "일상"
    },
    // ... topN개
  ];

  // 로직:
  // 1. posts를 views 기준으로 내림차순 정렬
  // 2. 상위 topN개 선택
  // 3. 필요한 필드만 반환
}
```

**입력**: Post[], topN(number)
**출력**: TopPost[]
**시간복잡도**: O(n log n)
**예상시간**: < 15ms

---

#### 2.6 Main Analysis Function (통합 분석)

```javascript
function analyzeFreeboard(posts) {
  // 모든 분석을 통합

  return {
    timeline: analyzeTimeline(posts),
    keywords: extractKeywords(posts, 5),
    categories: categorizePost(posts),
    participation: analyzeParticipation(posts),
    topPosts: getTopPosts(posts, 5),
    metadata: {
      totalPosts: posts.length,
      analyzedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime + "ms"
    }
  };
}
```

**입력**: Post[]
**출력**: FullAnalysis
**병렬성**: 5개 분석 함수는 독립적이므로 병렬 실행 가능
**예상시간**: < 70ms (순차) / < 25ms (병렬)

---

## 📡 API 설계

### 1. GET /analyze

#### 요청
```http
GET /analyze?board=freeboard&page=1

Query Parameters:
- board (optional): string (기본값: 'freeboard')
  * freeboard: 자유게시판 (기본값)
  * baseball: 야구 게시판
  * stock: 주식 게시판
  * (기타 지원하는 게시판)

- page (optional): integer (기본값: 1)
  * 페이지 번호
  * 범위: 1 ~ 999
```

#### 응답 (200 OK)
```json
{
  "metadata": {
    "board": "freeboard",
    "page": 1,
    "totalPosts": 30,
    "analyzedAt": "2026-03-14T10:30:00Z",
    "processingTime": "45ms"
  },
  "analysis": {
    "timeline": {
      "hourlyDistribution": { "00": 16, "01": 8, "02": 6 },
      "peakHours": ["00"],
      "peakHourCount": 16,
      "concentration": 53.3
    },
    "keywords": {
      "keywords": [
        { "text": "검찰개혁", "count": 8, "score": 0.95 },
        { "text": "이재명", "count": 5, "score": 0.92 },
        { "text": "호르무즈", "count": 4, "score": 0.88 },
        { "text": "야구", "count": 3, "score": 0.85 },
        { "text": "포인트", "count": 2, "score": 0.80 }
      ],
      "totalKeywords": 45,
      "uniqueKeywords": 32,
      "avgFrequency": 1.4
    },
    "categories": {
      "categoryDistribution": {
        "정치/검찰": { "count": 12, "percentage": 40 },
        "국제": { "count": 5, "percentage": 16.7 },
        "스포츠": { "count": 3, "percentage": 10 },
        "연예/종교": { "count": 2, "percentage": 6.7 },
        "경제/쇼핑": { "count": 2, "percentage": 6.7 },
        "일상": { "count": 6, "percentage": 20 }
      },
      "topCategory": "정치/검찰",
      "topCategoryCount": 12
    },
    "participation": {
      "recommends": {
        "average": 285.3,
        "max": 1065,
        "min": 0,
        "median": 150,
        "stdDev": 350.2
      },
      "dislikes": {
        "average": 12.4,
        "max": 50,
        "min": 0
      },
      "views": {
        "average": 576,
        "max": 2019,
        "min": 100
      },
      "engagement": {
        "highEngagement": 8,
        "mediumEngagement": 15,
        "lowEngagement": 7
      },
      "activityLevel": "높음"
    },
    "topPosts": [
      {
        "no": "9871265",
        "title": "내가 사람보는 눈이 없나 봅니다.",
        "author": "nickname",
        "views": 2019,
        "recommends": { "up": 34, "down": 0 },
        "createdAt": "2026-03-14 00:13",
        "categoryGuess": "일상"
      }
    ]
  }
}
```

#### 에러 응답

**400 Bad Request** - 유효하지 않은 파라미터
```json
{
  "error": "Invalid board parameter",
  "code": "INVALID_BOARD",
  "supportedBoards": ["freeboard", "baseball", "stock"]
}
```

**503 Service Unavailable** - ppomppu.co.kr 접속 불가
```json
{
  "error": "Unable to fetch board data",
  "code": "FETCH_ERROR",
  "details": "ppomppu.co.kr is unavailable"
}
```

---

## 🔄 구현 순서

### Step 1: 분석 함수 구현 (1시간)

```javascript
// mcp-servers/ppomppu-crawler.js 상단에 추가

// 1️⃣ 시간대 분석 함수
function analyzeTimeline(posts) { ... }

// 2️⃣ 키워드 추출 함수
function extractKeywords(posts, topN = 5) { ... }

// 3️⃣ 카테고리 분류 함수
function categorizePost(posts) { ... }

// 4️⃣ 참여도 분석 함수
function analyzeParticipation(posts) { ... }

// 5️⃣ 상위 게시물 함수
function getTopPosts(posts, topN = 5) { ... }

// 6️⃣ 통합 분석 함수
function analyzeFreeboard(posts) { ... }
```

### Step 2: API 엔드포인트 구현 (30분)

```javascript
// 기존 엔드포인트 아래에 추가

app.get('/analyze', async (req, res) => {
  try {
    const { board, page = 1 } = req.query;

    // 입력 검증
    if (!board) {
      return res.status(400).json({
        error: 'board parameter is required'
      });
    }

    // 데이터 수집
    const posts = await fetchBoard(board, page);

    // 분석 실행
    const analysis = analyzeFreeboard(posts);

    // 응답
    res.json({
      metadata: {
        board,
        page: parseInt(page),
        totalPosts: posts.length,
        analyzedAt: new Date().toISOString()
      },
      analysis
    });
  } catch (error) {
    console.error('[/analyze Error]', error);
    res.status(503).json({
      error: 'Unable to fetch board data',
      details: error.message
    });
  }
});
```

### Step 3: 테스트 (30분)

```bash
# 기본 요청
curl "http://localhost:3008/analyze?board=freeboard&page=1"

# 다른 페이지
curl "http://localhost:3008/analyze?board=freeboard&page=2"

# 에러 케이스
curl "http://localhost:3008/analyze"
```

---

## ⚠️ 에러 처리

### 1. 요청 검증
```javascript
if (!board) {
  return res.status(400).json({
    error: 'board parameter is required'
  });
}

if (page < 1 || page > 999) {
  return res.status(400).json({
    error: 'page must be between 1 and 999'
  });
}
```

### 2. 데이터 수집 실패
```javascript
try {
  const posts = await fetchBoard(board, page);
  if (!posts || posts.length === 0) {
    return res.status(503).json({
      error: 'No data available'
    });
  }
} catch (error) {
  res.status(503).json({
    error: 'Unable to fetch board data',
    details: error.message
  });
}
```

### 3. 분석 함수 오류
```javascript
try {
  const analysis = analyzeFreeboard(posts);
} catch (error) {
  console.error('Analysis error:', error);
  res.status(500).json({
    error: 'Analysis failed',
    posts: posts.length  // 디버깅용
  });
}
```

---

## 🧪 테스트 전략

### 단위 테스트
```javascript
// tests/analyze.test.js

describe('analyzeTimeline', () => {
  it('should extract hour distribution', () => {
    const posts = [
      { createdAt: '2026-03-14 00:13' },
      { createdAt: '2026-03-14 00:15' },
      { createdAt: '2026-03-14 01:20' }
    ];
    const result = analyzeTimeline(posts);
    expect(result.hourlyDistribution['00']).toBe(2);
    expect(result.hourlyDistribution['01']).toBe(1);
  });
});

describe('extractKeywords', () => {
  it('should extract top 5 keywords', () => {
    const posts = [
      { title: '검찰개혁 필요하다' },
      { title: '검찰개혁 논쟁' },
      // ...
    ];
    const result = extractKeywords(posts, 5);
    expect(result.keywords.length).toBeLessThanOrEqual(5);
    expect(result.keywords[0].text).toBe('검찰개혁');
  });
});
```

### 통합 테스트
```javascript
describe('GET /analyze', () => {
  it('should return analysis for freeboard page 1', async () => {
    const res = await request(app)
      .get('/analyze')
      .query({ board: 'freeboard', page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.metadata.board).toBe('freeboard');
    expect(res.body.analysis.keywords).toBeDefined();
    expect(res.body.analysis.categories).toBeDefined();
  });
});
```

### 성능 테스트
```javascript
// 응답시간 < 500ms 검증
console.time('analyze');
const res = await request(app).get('/analyze?board=freeboard&page=1');
console.timeEnd('analyze');
// 예상: analyze: 45-100ms
```

---

## 📊 성능 목표

| 메트릭 | 목표 | 예상 |
|--------|------|------|
| **Data Fetch** | < 300ms | 250ms |
| **analyzeTimeline** | < 10ms | 5ms |
| **extractKeywords** | < 20ms | 15ms |
| **categorizePost** | < 15ms | 10ms |
| **analyzeParticipation** | < 10ms | 8ms |
| **getTopPosts** | < 15ms | 12ms |
| **Total Response Time** | < 500ms | 300-350ms |

---

## 🔐 보안 고려사항

### 1. 입력 검증
- ✅ board 파라미터 화이트리스트 체크
- ✅ page 범위 검증
- ✅ SQL Injection 방지 (이미 처리됨)

### 2. Rate Limiting
- 향후 추가: 1분당 100 요청 제한

### 3. CORS
- 기존 ppomppu-crawler 설정 유지

---

## 📝 코드 예시

### 최종 파일 구조
```
mcp-servers/
├── ppomppu-crawler.js
│   ├── fetchBoard(board, page)        // 기존
│   ├── analyzeTimeline(posts)         // 신규
│   ├── extractKeywords(posts, topN)   // 신규
│   ├── categorizePost(posts)          // 신규
│   ├── analyzeParticipation(posts)    // 신규
│   ├── getTopPosts(posts, topN)       // 신규
│   ├── analyzeFreeboard(posts)        // 신규
│   ├── app.get('/freeboard', ...)     // 기존
│   └── app.get('/analyze', ...)       // 신규
└── ...

tests/
├── analyze.test.js                     // 신규
└── ...
```

---

## ✅ Design 완료 체크리스트

- [x] 아키텍처 설계
- [x] 데이터 흐름 다이어그램
- [x] API 상세 명세
- [x] 분석 함수별 설계
- [x] 에러 처리 전략
- [x] 구현 순서 상세화
- [x] 성능 목표 설정
- [x] 보안 고려사항

---

**Design 단계 완료!** 👍

**다음 단계**: `/pdca do ppomppu-crawler-analysis`

---

**작성자**: Claude (PDCA Design)
**작성일**: 2026-03-14
**상태**: ✅ Design Ready

