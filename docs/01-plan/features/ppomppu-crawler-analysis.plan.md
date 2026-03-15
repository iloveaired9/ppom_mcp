# ppomppu-crawler-analysis 기능 계획

> MCP 서버에 분석 기능을 통합하여 데이터 수집과 분석을 한 번에 처리하는 기능 계획

**Feature**: ppomppu-crawler-analysis
**Level**: Dynamic
**Created**: 2026-03-14
**Status**: 📋 Plan

---

## 🎯 기능 개요

### 현재 상태 (As-Is)
```
MCP 크롤러 (데이터 수집)
    ↓
JSON 응답
    ↓
CSV 파일 저장
    ↓
별도 분석 스크립트 실행
    ↓
리포트 생성
```

### 목표 상태 (To-Be)
```
MCP 크롤러 + 분석 통합
    ↓
/analyze 엔드포인트 호출
    ↓
즉시 분석 결과 JSON 응답
    ↓
CSV 파일 불필요
```

---

## 📊 요구사항 분석

### 1. 핵심 목표
- [ ] MCP 서버에 분석 기능 추가
- [ ] 데이터 수집 → 분석을 한 번에 처리
- [ ] 중간 파일(CSV) 제거
- [ ] 자동화 가능하게 만들기

### 2. 기능 요구사항

#### 2.1 분석 엔드포인트
```
GET /analyze?board=freeboard&page=1

응답:
{
  "metadata": {
    "board": "freeboard",
    "page": 1,
    "totalPosts": 30,
    "analyzedAt": "2026-03-14T10:30:00Z"
  },
  "analysis": {
    "categories": { ... },     // 카테고리 분류
    "keywords": { ... },       // 키워드 분석
    "topPosts": [ ... ],       // 상위 게시물
    "participation": { ... },  // 참여도 지표
    "timeline": { ... }        // 시간대 분석
  }
}
```

#### 2.2 분석 기능
| 기능 | 설명 | 우선순위 |
|------|------|---------|
| 카테고리 분류 | 정치, 국제, 스포츠 등 자동 분류 | 높음 |
| 키워드 추출 | TOP 5 키워드 추출 | 높음 |
| 상위 게시물 | 조회수/추천수 기준 TOP 5 | 높음 |
| 참여도 분석 | 평균/최대 추천수, 활발도 | 중간 |
| 시간대 분석 | 게시물 집중 시간 분석 | 중간 |
| 트렌드 분석 | 주제별 추이 분석 | 낮음 |

### 3. 기술 요구사항
- Node.js + Express.js (기존 기술 스택)
- Cheerio (HTML 파싱, 이미 사용 중)
- 추가 라이브러리: `natural` (키워드 추출) 또는 정규식 기반 구현
- 메모리: 30개 게시물 기준 < 1MB

### 4. 비기능 요구사항
- **성능**: 분석 응답시간 < 500ms
- **안정성**: 빈 응답/오류 처리
- **호환성**: 기존 `/freeboard` 엔드포인트와 독립적 운영
- **문서화**: API 명세 작성

---

## 📋 범위 (Scope)

### IN (포함)
✅ MCP 서버에 분석 기능 추가
✅ `/analyze` 엔드포인트 구현
✅ 5가지 분석 유틸리티 함수
✅ API 명세 문서화
✅ 통합 테스트 (실제 데이터)

### OUT (미포함)
❌ 데이터베이스 저장 (추후 추가)
❌ 모니터링 대시보드 (추후 추가)
❌ 차트/시각화 (프론트엔드 담당)
❌ 다국어 지원 (한국어만)

---

## 🏗️ 구현 계획

### Phase 1: 분석 유틸리티 함수 (Priority: 높음)

**목표**: 분석 로직을 재사용 가능한 함수로 분리

```javascript
// mcp-servers/ppomppu-crawler.js에 추가

// 1. 카테고리 분류
function categorizePost(posts) {
  // 정치/검찰, 국제, 스포츠 등으로 자동 분류
  // 키워드 매칭 기반
}

// 2. 키워드 추출
function extractKeywords(posts, topN = 5) {
  // 제목에서 명사/고유명사 추출
  // 빈도 순 정렬
}

// 3. 상위 게시물
function getTopPosts(posts, topN = 5) {
  // 조회수 기준 상위 N개
}

// 4. 참여도 분석
function analyzeParticipation(posts) {
  // 평균/최대 추천수, 활발도 계산
}

// 5. 시간대 분석
function analyzeTimeline(posts) {
  // 게시물이 집중된 시간대 분석
}

// 6. 전체 분석 통합
function analyzeFreeboard(posts) {
  return {
    categories: categorizePost(posts),
    keywords: extractKeywords(posts),
    topPosts: getTopPosts(posts),
    participation: analyzeParticipation(posts),
    timeline: analyzeTimeline(posts)
  };
}
```

**구현 순서**:
1. `analyzeTimeline()` - 가장 간단
2. `extractKeywords()` - 정규식 활용
3. `categorizePost()` - 키워드 매칭
4. `analyzeParticipation()` - 수치 계산
5. `getTopPosts()` - 정렬
6. `analyzeFreeboard()` - 통합

**테스트 데이터**: 기존 `freeboard.csv` 사용

---

### Phase 2: 엔드포인트 구현 (Priority: 높음)

```javascript
// GET /analyze
app.get('/analyze', async (req, res) => {
  try {
    const { board, page = 1 } = req.query;

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
    res.status(400).json({
      error: error.message
    });
  }
});

// 하위호환성: 기존 엔드포인트 유지
// GET /freeboard?page=1 (원본 데이터만)
// GET /analyze?board=freeboard&page=1 (분석 포함)
```

**테스트**:
```bash
curl "http://localhost:3008/analyze?board=freeboard&page=1"
```

---

### Phase 3: 문서화 (Priority: 중간)

**생성 파일**:
- `docs/02-design/features/ppomppu-crawler-analysis.design.md` - 기술 설계
- `API.md` - API 명세 (OpenAPI 형식)
- `EXAMPLES.md` - 사용 예시

**API 명세 예시**:
```markdown
### GET /analyze

분석 기능이 포함된 데이터 조회

#### 파라미터
- board (string): 게시판 ID (freeboard, baseball 등)
- page (number): 페이지 번호 (기본값: 1)

#### 응답 (200)
- metadata: 요청 메타데이터
- analysis: 분석 결과 (categories, keywords, topPosts 등)

#### 예시
GET /analyze?board=freeboard&page=1
```

---

## 📦 예상 결과물 (Deliverables)

### Code
- [ ] `mcp-servers/ppomppu-crawler.js` 수정 (분석 함수 + 엔드포인트)
- [ ] `scripts/analyze-utils.js` 생성 (재사용 가능한 분석 유틸리티)
- [ ] `tests/analyze.test.js` 생성 (유닛 테스트)

### Documentation
- [ ] `docs/02-design/features/ppomppu-crawler-analysis.design.md`
- [ ] `API.md` (API 명세)
- [ ] `EXAMPLES.md` (사용 예시)

### Integration
- [ ] `/analyze` 엔드포인트 운영
- [ ] 기존 코드와의 하위호환성 유지
- [ ] CSV 생성 제거 (선택사항)

---

## 📈 성공 기준

| 기준 | 판정 |
|------|------|
| **기능 완성** | `/analyze` 엔드포인트 정상 작동 |
| **성능** | 응답시간 < 500ms |
| **정확성** | 분석 결과가 freeboard.csv와 일치 |
| **문서화** | API 명세 및 예시 완성 |
| **호환성** | 기존 엔드포인트 작동 유지 |
| **코드 품질** | 함수 재사용성 80% 이상 |

---

## 🗓️ 일정 (Timeline)

| Phase | 작업 | 예상 시간 | 상태 |
|-------|------|---------|------|
| **Plan** | 현재 문서 작성 | 30분 | ✅ 진행중 |
| **Design** | 기술 설계 및 아키텍처 | 30분 | ⏳ 다음 |
| **Do** | 코드 구현 (분석 함수 + 엔드포인트) | 2시간 | ⏳ 예정 |
| **Check** | 테스트 및 검증 | 30분 | ⏳ 예정 |
| **Total** | - | **3.5시간** | - |

---

## 🚀 다음 단계

1. **이 계획 검토** → 변경사항 피드백
2. **Design 단계 진행** → `/pdca design ppomppu-crawler-analysis`
3. **구현 시작** → `/pdca do ppomppu-crawler-analysis`
4. **검증** → `/pdca analyze ppomppu-crawler-analysis`

---

## 📝 참고사항

### 기존 코드 참조
- ppomppu-crawler MCP: `mcp-servers/ppomppu-crawler.js`
- 분석 스크립트: `scripts/analyze-freeboard.js`
- 분석 커맨드: `.claude/commands/analyze-freeboard.md`

### 의존성 분석
- ✅ 수집 기능 (이미 구현됨)
- ✅ 분석 로직 (이미 스크립트로 구현됨)
- ❌ MCP 통합 (이번 작업)

### 위험 요소
- 기존 `/freeboard` 엔드포인트 수정 주의
- 성능 저하 모니터링 필요
- 에러 핸들링 철저히

---

## 📋 체크리스트

### Plan 단계
- [x] 기능 요구사항 정의
- [x] 범위 명확화
- [x] 구현 계획 수립
- [x] 일정 추정
- [ ] 스테이크홀더 승인

### 다음 단계 (Design)
- [ ] 아키텍처 설계
- [ ] 데이터 흐름 다이어그램
- [ ] 에러 처리 전략
- [ ] API 상세 명세

---

**작성자**: Claude (MCP)
**작성일**: 2026-03-14
**최종 검토**: 예정
**상태**: 🔵 Draft

---

## 💬 리뷰 피드백

> 여기에 검토 의견을 작성하세요.

| 항목 | 의견 | 작성자 |
|------|------|--------|
| 범위 | - | - |
| 일정 | - | - |
| 위험 | - | - |

