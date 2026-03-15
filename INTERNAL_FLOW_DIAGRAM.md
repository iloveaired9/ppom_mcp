# freeboard 1페이지 가져오기 - 내부 경로 분석

## 📍 전체 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│ 사용자 요청                                                        │
│ GET http://localhost:3008/freeboard?page=1                      │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 1] HTTP 서버 진입 (ppomppu-crawler.js)                     │
│                                                                  │
│ • Port: 3008                                                    │
│ • Method: GET                                                   │
│ • URL Path: /freeboard                                          │
│ • Query: { page: 1 }                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 2] 라우팅 매칭 (라인 428-448)                               │
│                                                                  │
│ if (pathname === '/freeboard' && req.method === 'GET') {        │
│   const page = parseInt(query.page) || 1;  // page = 1         │
│   const posts = await crawlBoard('freeboard', 1);              │
│ }                                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 3] crawlBoard() 함수 호출 (라인 121-181)                   │
│                                                                  │
│ async function crawlBoard(boardId, pageNum) {                   │
│   // boardId = 'freeboard'                                      │
│   // pageNum = 1                                                │
│ }                                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 4] axios로 뽐뿌 웹사이트 HTML 다운로드                       │
│                                                                  │
│ const url = 'https://www.ppomppu.co.kr/zboard/zboard.php'     │
│             + '?id=freeboard&page=1'                            │
│                                                                  │
│ const response = await axios.get(url, {                         │
│   headers: {                                                    │
│     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'  │
│     'Referer': 'https://www.ppomppu.co.kr/'                    │
│   },                                                            │
│   timeout: 10000,                                               │
│   responseType: 'arraybuffer'  // 바이너리 데이터                 │
│ });                                                             │
│                                                                  │
│ 📡 실제 네트워크 요청:                                            │
│    GET https://www.ppomppu.co.kr/zboard/zboard.php?id=freeboard&page=1
│    HTTP/1.1 200 OK                                              │
│    Content-Type: text/html; charset=euc-kr                      │
│    Content-Length: ~150KB                                       │
│                                                                  │
│ ⏱️ 시간: ~150ms                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 5] 인코딩 변환: EUC-KR → UTF-8                             │
│                                                                  │
│ const html = iconv.decode(response.data, 'cp949');             │
│                                                                  │
│ 원본:    [바이너리 EUC-KR 데이터] (응답.data)                     │
│   ↓ (iconv-lite 라이브러리)                                      │
│ 변환:    [UTF-8 문자열]                                          │
│   ↓                                                             │
│ 결과: "<!DOCTYPE html><html>..."                                │
│                                                                  │
│ 📌 왜 필요?                                                     │
│    뽐뿌 웹사이트는 EUC-KR 인코딩 사용                             │
│    Node.js는 UTF-8 기반이므로 변환 필수                          │
│                                                                  │
│ ⏱️ 시간: <5ms                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 6] cheerio로 HTML DOM 파싱                                │
│                                                                  │
│ const $ = cheerio.load(html);                                  │
│ const rows = $('tr.baseList');                                 │
│                                                                  │
│ 📌 HTML 구조 (뽐뿌 게시판 테이블):                               │
│                                                                  │
│ <table class="zboard_list">                                     │
│   <tr class="baseList">  ← 게시물 1                             │
│     <td class="baseList-numb">9873368</td>                      │
│     <td class="baseList-space">                                │
│       <a href="view.php?..." class="baseList-title">          │
│         <span>[제목]</span>                                      │
│       </a>                                                      │
│     </td>                                                       │
│     <td>행우니</td>       ← 작성자                              │
│     <td>2026-03-15 12:57:04</td> ← 날짜                        │
│     <td>1-0</td>         ← 추천-비추천                           │
│     <td>1149</td>        ← 조회수                               │
│   </tr>                                                         │
│   <tr class="baseList">  ← 게시물 2                             │
│   ...                                                           │
│   </tr>                                                         │
│   ... (약 30개 행)                                              │
│ </table>                                                        │
│                                                                  │
│ ⏱️ 시간: <2ms                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 7] 각 게시물 데이터 추출 (rows.each 반복) (라인 152-177)   │
│                                                                  │
│ FOR EACH row (총 30회 반복):                                     │
│                                                                  │
│   const cells = $(element).find('td');  // 7개 셀 선택         │
│                                                                  │
│   const no = $(cells[0]).text().trim();                        │
│             → "9873368"                                         │
│                                                                  │
│   const titleLink = $(cells[1]).find('a.baseList-title');      │
│   const title = titleLink.find('span').text().trim();          │
│             → "날이 풀린 명동 어젯밤 11시 .jpg"                   │
│                                                                  │
│   const link = titleLink.attr('href');                         │
│             → "view.php?id=freeboard&page=1&divpage=1844&no=9873368"
│                                                                  │
│   const author = $(cells[2]).text().trim();                    │
│             → "행우니"                                          │
│                                                                  │
│   const date = $(cells[3]).text().trim();                      │
│             → "2026-03-15 12:57:04"                            │
│                                                                  │
│   const recommend = $(cells[4]).text().trim();                 │
│             → "1-0"  (추천 1, 비추천 0)                         │
│                                                                  │
│   const views = $(cells[5]).text().trim();                     │
│             → "1149"  (조회수 1149회)                           │
│                                                                  │
│ ⏱️ 시간: ~50ms (30개 게시물)                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 8] URL 정규화 (상대 경로 → 절대 URL) (라인 163-170)        │
│                                                                  │
│ let fullUrl = link;                                             │
│                                                                  │
│ if (!link.startsWith('http')) {                                │
│   if (!link.startsWith('/')) {                                 │
│     fullUrl = `/zboard/${link}`;                               │
│   }                                                             │
│   fullUrl = `https://www.ppomppu.co.kr${fullUrl}`;            │
│ }                                                               │
│                                                                  │
│ 입력:  "view.php?id=freeboard&page=1&divpage=1844&no=9873368" │
│   ↓                                                             │
│ Step 1: "/zboard/view.php?id=freeboard&page=1&..."           │
│   ↓                                                             │
│ Step 2: "https://www.ppomppu.co.kr/zboard/view.php?..."       │
│                                                                  │
│ 출력: "https://www.ppomppu.co.kr/zboard/view.php?id=freeboard&page=1&divpage=1844&no=9873368"
│                                                                  │
│ ⏱️ 시간: <1ms                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 9] posts 배열에 게시물 객체 추가                             │
│                                                                  │
│ posts.push({                                                    │
│   no: "9873368",                                                │
│   title: "날이 풀린 명동 어젯밤 11시 .jpg",                        │
│   link: "view.php?id=freeboard&page=1&divpage=1844&no=9873368",│
│   author: "행우니",                                             │
│   date: "2026-03-15 12:57:04",                                 │
│   views: "1149",                                                │
│   recommend: "1-0",                                             │
│   url: "https://www.ppomppu.co.kr/zboard/view.php?..."        │
│ });                                                             │
│                                                                  │
│ 📌 반복: 30개 게시물 모두 반복 후                                 │
│ 결과: posts = [30개 게시물 객체 배열]                             │
│                                                                  │
│ ⏱️ 시간: <1ms                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 10] crawlBoard() 함수에서 posts 배열 반환                   │
│                                                                  │
│ console.log(`✅ 30개 게시물 발견`);                              │
│ return posts;  // 30개 게시물 배열                              │
│                                                                  │
│ ⏱️ 누적 시간: ~200ms                                            │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 11] HTTP 응답 생성 (라인 433-443)                         │
│                                                                  │
│ res.writeHead(200);                                             │
│ res.end(JSON.stringify({                                        │
│   success: true,                                                │
│   data: {                                                       │
│     boardId: 'freeboard',                                       │
│     page: 1,                                                    │
│     postCount: 30,                                              │
│     posts: [30개 객체],  ← posts 배열                           │
│     timestamp: "2026-03-15T04:04:18.108Z"                      │
│   },                                                            │
│   message: "자유게시판 1페이지에서 30개 게시물을 조회했습니다"      │
│ }, null, 2));                                                   │
│                                                                  │
│ ⏱️ 시간: <1ms (JSON 직렬화)                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ [Step 12] 클라이언트에 JSON 응답 전송                             │
│                                                                  │
│ HTTP/1.1 200 OK                                                 │
│ Content-Type: application/json; charset=utf-8                   │
│ Content-Length: ~120KB                                          │
│                                                                  │
│ {                                                               │
│   "success": true,                                              │
│   "data": {                                                     │
│     "boardId": "freeboard",                                     │
│     "page": 1,                                                  │
│     "postCount": 30,                                            │
│     "posts": [                                                  │
│       {                                                         │
│         "no": "9873368",                                        │
│         "title": "날이 풀린 명동 어젯밤 11시 .jpg",               │
│         "link": "view.php?id=freeboard&page=1&divpage=1844&no=9873368",
│         "author": "행우니",                                     │
│         "date": "2026-03-15 12:57:04",                         │
│         "views": "1149",                                        │
│         "recommend": "1-0",                                     │
│         "url": "https://www.ppomppu.co.kr/zboard/view.php?..."
│       },                                                        │
│       ... (29개 더)                                             │
│     ],                                                          │
│     "timestamp": "2026-03-15T04:04:18.108Z"                    │
│   },                                                            │
│   "message": "자유게시판 1페이지에서 30개 게시물을 조회했습니다"   │
│ }                                                               │
│                                                                  │
│ ⏱️ 시간: <1ms (네트워크 전송)                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ 최종 결과                                                         │
│                                                                  │
│ ✅ 완료: 30개 게시물 데이터                                       │
│ ⏱️ 전체 소요 시간: ~220ms                                        │
│                                                                  │
│ 응답 데이터 구조:                                                │
│ {                                                               │
│   success: true,                                                │
│   data: {                                                       │
│     boardId: 'freeboard',                                       │
│     page: 1,                                                    │
│     postCount: 30,                                              │
│     posts: [30개 게시물],                                        │
│     timestamp: '2026-03-15T04:04:18.108Z'                      │
│   }                                                             │
│ }                                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ 성능 분석

### 시간 구성:
```
전체: 220ms

  ├─ [Step 4] axios 다운로드: ~150ms  (68%)
  │  └─ 네트워크 지연
  │  └─ 뽐뿌 서버 응답 시간
  │
  ├─ [Step 5] 인코딩 변환: <5ms
  │
  ├─ [Step 6] cheerio 파싱: <2ms
  │
  ├─ [Step 7] 데이터 추출: ~50ms  (23%)
  │  └─ 30개 게시물 반복
  │  └─ 셀 선택 및 텍스트 추출
  │
  ├─ [Step 8] URL 정규화: <1ms
  │
  ├─ [Step 9] 배열 추가: <1ms
  │
  ├─ [Step 10] 함수 반환: <1ms
  │
  ├─ [Step 11] JSON 직렬화: <5ms
  │
  └─ [Step 12] 네트워크 전송: <10ms
```

### 병목 지점:
1. **axios 다운로드** (68%) - 뽐뿌 서버의 응답 시간
2. **데이터 추출** (23%) - cheerio로 30개 게시물 파싱
3. **기타** (9%) - 인코딩, JSON 직렬화 등

---

## 📊 메모리 흐름

```
Step 1: 요청 수신
  메모리: 매우 적음 (URL 문자열, 쿼리 파라미터)

Step 2-3: 라우팅 및 함수 호출
  메모리: 함수 스택 프레임

Step 4: HTML 다운로드
  메모리: ~150KB (원본 바이너리)

Step 5: 인코딩 변환
  메모리: ~150KB (UTF-8 문자열)

Step 6: cheerio 파싱
  메모리: ~200KB (DOM 객체 트리)

Step 7: 데이터 추출
  메모리: 증가 (posts 배열 구성)

Step 8-9: URL 정규화 및 배열 추가
  메모리: posts 배열 확대
  최종: ~120KB (JSON 직렬화 후)

Step 11-12: 응답 전송
  메모리: 해제 (가비지 컬렉션)
```

---

## 🔍 함수 호출 스택

```
Client (curl / browser)
   │
   └─> HTTP Server (Node.js http)
        │
        └─> [라우팅] if (pathname === '/freeboard')
             │
             └─> crawlBoard('freeboard', 1)
                  │
                  ├─> axios.get(url, headers)
                  │    └─> 뽐뿌 웹사이트 HTTP 요청
                  │         └─> 응답: HTML (EUC-KR 바이너리)
                  │
                  ├─> iconv.decode(response.data, 'cp949')
                  │    └─> EUC-KR → UTF-8 변환
                  │
                  ├─> cheerio.load(html)
                  │    └─> DOM 파싱
                  │
                  ├─> $('tr.baseList')
                  │    └─> 게시물 행 선택 (30개)
                  │
                  └─> rows.each((index, element) => {
                       ├─> $(element).find('td')
                       │    └─> 7개 셀 선택
                       │
                       ├─> 데이터 추출
                       │    ├─ $(cells[0]).text() → 번호
                       │    ├─ $(cells[1]).find('span').text() → 제목
                       │    ├─ $(cells[2]).text() → 작성자
                       │    ├─ $(cells[3]).text() → 날짜
                       │    ├─ $(cells[4]).text() → 추천
                       │    └─ $(cells[5]).text() → 조회
                       │
                       └─> posts.push(게시물 객체)
                  })
                  │
                  └─> return posts (30개 배열)
                       │
                       └─> JSON.stringify(응답)
                            │
                            └─> res.end(JSON 데이터)
                                 │
                                 └─> 클라이언트에 전송
                                      (HTTP 200 OK)
```

---

## 🎯 핵심 데이터 변환

```
원본 HTML (뽐뿌 웹사이트):
┌────────────────────────────┐
│ <tr class="baseList">      │
│   <td>9873368</td>         │
│   <td>                     │
│     <a ...>               │
│       <span>날이 풀린...</span>  │
│     </a>                  │
│   </td>                    │
│   <td>행우니</td>         │
│   <td>2026-03-15 12:57:04</td>
│   <td>1-0</td>             │
│   <td>1149</td>            │
│ </tr>                      │
└────────────────────────────┘
              ↓
       (cheerio 파싱)
              ↓
JavaScript 객체 (메모리):
┌────────────────────────────┐
│ {                          │
│   no: "9873368",           │
│   title: "날이 풀린...",     │
│   author: "행우니",        │
│   date: "2026-03-15...",   │
│   views: "1149",           │
│   recommend: "1-0",        │
│   url: "https://..."       │
│ }                          │
└────────────────────────────┘
              ↓
       (JSON.stringify)
              ↓
JSON 문자열 (HTTP 응답):
┌────────────────────────────┐
│ {                          │
│   "success": true,         │
│   "data": {                │
│     "posts": [{            │
│       "no": "9873368",     │
│       "title": "날이 풀린...",
│       ...                  │
│     }]                     │
│   }                        │
│ }                          │
└────────────────────────────┘
```

---

## 📋 체크리스트: 데이터 변환 각 단계

- [x] **Step 1**: HTTP 요청 수신
- [x] **Step 2**: 라우팅 매칭
- [x] **Step 3**: crawlBoard() 함수 호출
- [x] **Step 4**: axios로 HTML 다운로드
- [x] **Step 5**: EUC-KR → UTF-8 변환
- [x] **Step 6**: cheerio로 HTML 파싱
- [x] **Step 7**: 각 게시물 데이터 추출
- [x] **Step 8**: URL 정규화 (상대 → 절대)
- [x] **Step 9**: posts 배열에 추가
- [x] **Step 10**: crawlBoard() 함수 반환
- [x] **Step 11**: JSON 응답 생성
- [x] **Step 12**: 클라이언트에 전송

---

## 🚀 최적화 가능성

| 항목 | 현재 | 최적화 |
|------|------|--------|
| **캐싱** | 없음 | Redis/메모리 캐시 추가 (1시간 TTL) |
| **병렬 처리** | 순차 | Promise.all()로 다중 게시판 동시 조회 |
| **압축** | 미적용 | gzip 압축 (30KB → 10KB) |
| **페이징** | 없음 | 첫 10개만 로드 후 lazy loading |
| **인덱싱** | 없음 | cheerio 선택자 최적화 |

---

**최종 정리**: freeboard 1페이지는 **12단계**를 거쳐 **~220ms**에 30개 게시물을 수집합니다!
