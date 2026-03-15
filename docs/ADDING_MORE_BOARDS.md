# 뽐뿌 MCP 서버에 새로운 게시판 추가 가이드

**작성**: 2026-03-14
**대상**: 개발자
**난이도**: 초급

---

## 📋 개요

이 문서는 뽐뿌 MCP 서버에 새로운 게시판 엔드포인트를 추가하는 방법을 설명합니다.

### 현재 지원하는 게시판
- ✅ `/freeboard` - 자유게시판
- ✅ `/ppomppu` - 뽐뿌 게시판
- ✅ `/baseball` - 야구 게시판
- ✅ `/stock` - 주식 게시판

---

## 🔧 단계별 추가 방법

### Step 1: 새 엔드포인트 정의

파일: `mcp-servers/ppomppu-crawler.js`

**패턴** (복사해서 사용):

```javascript
/**
 * GET /{boardId} - {게시판명} 조회 (쿼리 파라미터)
 * /{boardId}?page=1
 */
app.get('/{boardId}', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;

        const posts = await crawlBoard('{boardId}', page);

        res.json({
            success: true,
            data: {
                boardId: '{boardId}',
                page: page,
                postCount: posts.length,
                posts: posts,
                timestamp: new Date().toISOString()
            },
            message: `{게시판명} ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});
```

### 예시: 연예 게시판 추가

```javascript
/**
 * GET /entertainment - 연예 게시판 조회 (쿼리 파라미터)
 * /entertainment?page=1
 */
app.get('/entertainment', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;

        const posts = await crawlBoard('entertainment', page);

        res.json({
            success: true,
            data: {
                boardId: 'entertainment',
                page: page,
                postCount: posts.length,
                posts: posts,
                timestamp: new Date().toISOString()
            },
            message: `연예 게시판 ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});
```

---

### Step 2: /tools 응답에 새 도구 추가

파일: `mcp-servers/ppomppu-crawler.js` (라인 ~116-141)

**찾는 부분**:
```javascript
app.get('/tools', (req, res) => {
    res.json({
        tools: [
            // ...기존 도구들...
            {
                name: 'get_stock',
                description: '주식 게시판(stock) 특정 페이지 조회'
            }
            // ← 여기에 추가
        ]
    });
});
```

**추가할 내용**:
```javascript
            {
                name: 'get_entertainment',
                description: '연예 게시판(entertainment) 특정 페이지 조회'
            }
```

---

### Step 3: 서버 시작 메시지 업데이트

파일: `mcp-servers/ppomppu-crawler.js` (라인 ~619-623)

**찾는 부분**:
```javascript
    console.log(`📰 게시판 조회 (원본 데이터):`);
    console.log(`  GET  /freeboard?page=1   - 자유게시판`);
    console.log(`  GET  /ppomppu?page=1     - 뽐뿌 일반 게시판`);
    console.log(`  GET  /baseball?page=1    - 야구 게시판`);
    console.log(`  GET  /stock?page=1       - 주식 게시판\n`);
```

**추가할 내용**:
```javascript
    console.log(`  GET  /entertainment?page=1 - 연예 게시판\n`);
```

---

### Step 4: fetch-and-summarize.sh 스크립트 업데이트

파일: `scripts/fetch-and-summarize.sh` (라인 ~26-31)

**찾는 부분**:
```bash
declare -A BOARD_NAMES=(
    [freeboard]="자유게시판"
    [ppomppu]="뽐뿌 게시판"
    [baseball]="야구 게시판"
    [stock]="주식 게시판"
)
```

**추가할 내용**:
```bash
    [entertainment]="연예 게시판"
```

**결과**:
```bash
declare -A BOARD_NAMES=(
    [freeboard]="자유게시판"
    [ppomppu]="뽐뿌 게시판"
    [baseball]="야구 게시판"
    [stock]="주식 게시판"
    [entertainment]="연예 게시판"
)
```

---

## 🧪 테스트 방법

### 1. 서버 재시작

```bash
# 기존 프로세스 종료
pkill -f "node mcp-servers/ppomppu-crawler.js"

# 새로운 서버 시작
cd C:/rnd/claude/mcp/first
node mcp-servers/ppomppu-crawler.js &
sleep 2
```

### 2. 엔드포인트 테스트

```bash
# /tools 확인
curl http://localhost:3008/tools | grep entertainment

# 게시판 데이터 수집
curl http://localhost:3008/entertainment?page=1

# 분석 기능
curl "http://localhost:3008/analyze?board=entertainment&page=1"
```

### 3. 자동화 스크립트 테스트

```bash
bash scripts/fetch-and-summarize.sh entertainment 1
```

---

## 📊 뽐뿌 게시판 ID 목록

뽐뿌 사이트의 게시판별 ID:

| 게시판명 | ID | 다이렉트 URL |
|---------|----|----|
| 자유게시판 | freeboard | `zboard.php?id=freeboard` |
| 뽐뿌 게시판 | ppomppu | `zboard.php?id=ppomppu` |
| 야구 게시판 | baseball | `zboard.php?id=baseball` |
| 주식 게시판 | stock | `zboard.php?id=stock` |
| 연예 게시판 | entertainment | `zboard.php?id=entertainment` |
| 정치 게시판 | politics | `zboard.php?id=politics` |
| 해외뉴스 | news | `zboard.php?id=news` |
| 게이밍 | gaming | `zboard.php?id=gaming` |
| 애니메이션 | anime | `zboard.php?id=anime` |

---

## 🎯 체크리스트

새로운 게시판을 추가할 때 확인사항:

- [ ] Step 1: 새 엔드포인트 코드 추가 (ppomppu-crawler.js)
- [ ] Step 2: /tools 응답에 새 도구 추가
- [ ] Step 3: 서버 시작 메시지 업데이트
- [ ] Step 4: fetch-and-summarize.sh 스크립트 업데이트
- [ ] Step 5: 서버 재시작
- [ ] Step 6: curl로 엔드포인트 테스트
- [ ] Step 7: 자동화 스크립트 테스트

---

## 💡 고급: 게시판별 카테고리 커스터마이징

게시판마다 다른 카테고리 규칙을 적용하려면:

**파일**: `mcp-servers/ppomppu-crawler.js` (function categorizePost)

**현재**: 모든 게시판이 같은 카테고리 규칙 사용

```javascript
function categorizePost(posts, boardId = 'default') {
    let categories = {
        // 기본 카테고리
        '정치/검찰': ['검찰', '대통령', ...],
        '스포츠': ['야구', '팀', ...]
    };

    // 게시판별 커스터마이징
    if (boardId === 'baseball') {
        categories['야구'] = ['야구', 'WBC', '선수'];
        categories['팀'] = ['LG', '두산', '삼성'];
    } else if (boardId === 'stock') {
        categories['투자'] = ['주식', '투자', '수익'];
        categories['기업'] = ['삼성', '네이버', 'LG'];
    }

    // ...분류 로직...
}
```

---

## 🚀 확장 아이디어

1. **데이터베이스 저장**
   - 크롤링한 데이터를 SQLite/PostgreSQL에 저장
   - 히스토리 추적 가능

2. **실시간 모니터링**
   - 특정 키워드 감시
   - 새로운 게시물 알림

3. **감정 분석**
   - 댓글/추천으로 감정도 분석
   - 추세 그래프 생성

4. **게시판별 분석**
   - 게시판마다 다른 분석 로직
   - 특화된 키워드 추출

---

## 📞 문제 해결

### 문제: "Cannot GET /entertainment"
**원인**: 엔드포인트를 추가했지만 서버를 재시작하지 않음
**해결**: 서버를 종료하고 다시 시작

### 문제: "No posts found" or "0 개 게시물"
**원인**: 게시판 ID가 잘못되었거나 뽐뿌 사이트 구조가 변경됨
**해결**: 뽐뿌 사이트에서 실제 게시판 ID 확인

### 문제: 마크다운 분석이 생성되지 않음
**원인**: analyze-json.js에서 에러 발생
**해결**: 콘솔 에러 메시지 확인, 데이터 형식 검증

---

## 📝 참고

- **Generic Crawl Function**: `crawlBoard(boardId, pageNum)`은 모든 게시판을 지원
- **Reusable Pattern**: 각 엔드포인트는 동일한 패턴을 따름
- **No Backend Change**: 백엔드 로직 변경 없이도 새 게시판 추가 가능

---

**마지막 업데이트**: 2026-03-14
**상태**: ✅ 검증됨
