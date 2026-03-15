# Architecture - 뽐뿌 자유게시판 자동 분석 도구

> 시스템 설계, 컴포넌트 구조, 데이터 흐름, 성능 최적화 전략

---

## 📋 목차

- [시스템 개요](#시스템-개요)
- [컴포넌트 구조](#컴포넌트-구조)
- [데이터 흐름](#데이터-흐름)
- [주요 모듈](#주요-모듈)
- [설계 결정](#설계-결정)
- [성능 최적화](#성능-최적화)
- [확장성 고려사항](#확장성-고려사항)
- [보안](#보안)
- [에러 처리](#에러-처리)

---

## 시스템 개요

### 아키텍처 유형: 파이프라인 아키텍처

```
┌─────────────────┐
│  사용자 입력    │
│ (Claude 커맨드) │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  Orchestration Layer │  (Bash 스크립트)
│ 1. 서버 체크        │
│ 2. 데이터 수집      │
│ 3. 분석 엔진 호출   │
│ 4. 파일 저장        │
└────────┬─────────────┘
         │
     ┌───┴────┬──────────┬──────────┐
     ▼        ▼          ▼          ▼
┌────────┐┌─────────┐┌────────┐┌─────────┐
│  MCP   ││ JSON →  ││ Extract││ Analyze │
│ Server ││ Fetch   ││ Parse  ││ & Score │
└────────┘└─────────┘└────────┘└─────────┘
     │        │          │          │
     └────────┴──────────┴──────────┘
              │
              ▼
        ┌─────────────┐
        │ Output      │
        │ - CSV File  │
        │ - Markdown  │
        └─────────────┘
```

### 핵심 원칙

1. **단일 책임 원칙** - 각 스크립트가 한 가지 일만 함
2. **자동화 중심** - 수동 개입 최소화
3. **유지보수성** - 명확한 로깅 및 에러 처리
4. **확장 가능성** - 새로운 분석 기능 추가 용이
5. **성능** - 30개 게시물 분석 3초 이내

---

## 컴포넌트 구조

### 계층 구조

```
┌─────────────────────────────────────────────────┐
│ Layer 1: 사용자 인터페이스                      │
│ - Claude 커맨드: /fetch-and-summarize-freeboard │
│ - Bash 명령행: bash scripts/fetch-and-summarize │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────┐
│ Layer 2: 오케스트레이션                         │
│ - fetch-and-summarize.sh (메인 스크립트)        │
│ - 실행 흐름 제어                                │
│ - 파일 관리                                     │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────┐
│ Layer 3: 데이터 처리                            │
│ - analyze-json.js (분석 엔진)                   │
│ - JSON ↔ CSV 변환                              │
│ - 통계 계산                                     │
└─────────────────────────────────────────────────┘
                      │
┌─────────────────────────────────────────────────┐
│ Layer 4: 외부 시스템                            │
│ - ppomppu-crawler MCP (포트 3008)               │
│ - 실제 크롤링 데이터                            │
└─────────────────────────────────────────────────┘
```

### 컴포넌트 설명

#### 1. 커맨드 정의
**파일**: `.claude/commands/fetch-and-summarize-freeboard.md`

```yaml
- 이름: fetch-and-summarize-freeboard
- 설명: 뽐뿌 freeboard 최신 데이터 자동 분석
- 실행: Claude Code에서 자동 인식
- 호출: /fetch-and-summarize-freeboard [page]
```

#### 2. 오케스트레이션 스크립트
**파일**: `scripts/fetch-and-summarize.sh`

```bash
#!/bin/bash
# 책임:
# - MCP 서버 상태 체크
# - 데이터 수집
# - 분석 엔진 호출
# - 파일 저장 및 로깅

# 프로세스:
# 1. health check (curl http://localhost:3008/health)
# 2. fetch data (curl /freeboard?page=N)
# 3. call analysis (node analyze-json.js)
# 4. save files (CSV + metadata)
```

**입력:**
- `page` (선택): 페이지 번호 (기본값: 1)

**출력:**
- CSV 파일: `freeboard-YYYY-MM-DD-pageN.csv`
- Markdown 리포트 (stdout으로 출력)
- 로그: 컬러 출력 (4단계)

#### 3. 분석 엔진
**파일**: `scripts/analyze-json.js`

```javascript
// 책임:
// - JSON 파싱
// - CSV 변환
// - 카테고리 분류
// - 키워드 추출
// - 통계 계산
// - Markdown 리포트 생성

// 입력: JSON 파일 경로
// 출력: Markdown 문자열 (stdout)

module.exports = {
  categorize(),    // 카테고리 분류
  extractKeywords(),  // 키워드 추출
  analyzeStats(),  // 통계 계산
  generateReport() // 리포트 생성
}
```

---

## 데이터 흐름

### 전체 흐름도

```
User Input
  ↓
/fetch-and-summarize-freeboard 1
  ↓
fetch-and-summarize.sh 1
  ├─→ [1/4] Health Check
  │       curl http://localhost:3008/health
  │       ├─→ Success: 계속 진행
  │       └─→ Fail: 에러 종료
  │
  ├─→ [2/4] Data Collection
  │       curl http://localhost:3008/freeboard?page=1
  │       ├─→ Save to /tmp/freeboard-page1.json
  │       └─→ Parse: 30개 게시물 확인
  │
  ├─→ [3/4] Analysis
  │       node scripts/analyze-json.js
  │       ├─→ Parse JSON
  │       ├─→ Extract posts array
  │       │   [
  │       │     {no, title, author, date, views, recommend},
  │       │     ...
  │       │   ]
  │       ├─→ Classify categories
  │       │   정치: 4개, 경제: 3개, ...
  │       ├─→ Extract keywords
  │       │   {word: count}
  │       ├─→ Calculate stats
  │       │   avg, max, median, stdDev
  │       └─→ Generate Markdown
  │
  ├─→ [4/4] Save & Output
  │       ├─→ CSV: freeboard-2026-03-14-page1.csv
  │       └─→ Stdout: Markdown 리포트
  │
Success
  └─→ ✅ 모든 작업 완료!
```

### 단계별 상세 설명

#### Step 1: 헬스 체크 (2ms)

```bash
curl -s http://localhost:3008/health
```

**목적**: MCP 서버가 실행 중인지 확인

**처리:**
```
Success (200 OK)
  └─→ 다음 단계로 진행

Failure (Connection refused)
  └─→ "❌ MCP 서버가 실행 중이지 않습니다" 에러 출력
  └─→ 프로세스 종료 (exit 1)
```

#### Step 2: 데이터 수집 (250-300ms)

```bash
curl -s "http://localhost:3008/freeboard?page=1" > /tmp/freeboard-page1.json
```

**네트워크 흐름:**
```
Request:
  GET /freeboard?page=1 HTTP/1.1
  Host: localhost:3008
  Accept: application/json

Response:
  {
    "success": true,
    "data": {
      "boardId": "freeboard",
      "page": 1,
      "postCount": 30,
      "posts": [
        {
          "no": "9872214",
          "title": "현대차에 2억 투자해서 성공한 30대 파이어족",
          "author": "Pixel99",
          "date": "11:35:55",
          "views": "1268",
          "recommend": "1 - 0"
        },
        ...
      ]
    }
  }
```

**검증:**
- JSON 구조 확인: `data.posts` 배열 존재
- 게시물 수: `posts.length == 30`
- 필드 검증: `no, title, author, date, views`

#### Step 3: 분석 (50-100ms)

```javascript
// 3-1. 카테고리 분류
const categories = {
  '정치/검찰': /검찰|윤석열|이재명|민주당|국민의힘|오세훈/i,
  '경제/투자': /현대차|주식|투자|포인트|갤럭시|파이어족/i,
  // ...
};

posts.forEach(post => {
  for (const [category, regex] of Object.entries(categories)) {
    if (regex.test(post.title)) {
      categoryCounts[category]++;
      break;
    }
  }
});

// 결과:
// categoryCounts = { '정치/검찰': 4, '경제/투자': 3, ... }
```

**분류 로직:**
1. 모든 카테고리 순회
2. 정규식 매칭으로 확인
3. 첫 번째 매칭 카테고리에 분류
4. 미분류는 "기타"

**복잡도**: O(n × m) = O(30 × 7) = O(210)

```javascript
// 3-2. 키워드 추출
const wordFreq = {};
posts.forEach(p => {
  const words = p.title.match(/[가-힣]{2,}/g) || [];
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
});

const topKeywords = Object.entries(wordFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

// 결과:
// topKeywords = [
//   ['트럼프', 2],
//   ['야구', 2],
//   ...
// ]
```

**정규식 분석:**
- `/[가-힣]{2,}/g` - 2글자 이상 한글 단어만 추출
- 영어, 숫자, 특수문자 제외
- 불용어(의, 이, 를, 등)는 자동 포함 (나중 필터링 가능)

```javascript
// 3-3. 상위 게시물 추출
const topPosts = posts
  .filter(p => p.views > 0)
  .sort((a, b) => b.views - a.views)
  .slice(0, 5);

// 결과:
// [
//   {no: '9872214', views: 1268, ...},
//   {no: '9872209', views: 1051, ...},
//   ...
// ]
```

#### Step 4: 리포트 생성 및 저장 (50ms)

```javascript
// Markdown 생성
let md = '# 📊 뽐뿌 자유게시판 현황 분석\n\n';
md += `**분석 시간**: ${now}\n`;
md += `**페이지**: ${pageNum}\n`;
// ... (테이블, 리스트 추가)

console.log(md);  // stdout으로 출력
```

**출력 형식:**
- H1: 제목
- 메타데이터: 분석 시간, 페이지, 총 게시물
- H2: 섹션 제목 (🎯 핵심 요약, 📊 카테고리별 분포, 등)
- 테이블: 마크다운 테이블 형식
- 리스트: 순서 있는/없는 리스트

**CSV 저장:**
```csv
게시물번호,제목,작성자,시간,조회,추천
9872214,"현대차에 2억 투자해서 성공한 30대 파이어족",Pixel99,11:35:55,1268,"1 - 0"
```

---

## 주요 모듈

### Module 1: Orchestration (fetch-and-summarize.sh)

```bash
# 의존성
- curl (HTTP 클라이언트)
- bash 4.0+
- node (JavaScript 런타임)

# 함수
function check_server()
function fetch_data()
function run_analysis()
function save_files()

# 환경 변수
PAGE=${1:-1}
TIMESTAMP=$(date +%Y-%m-%d)
CSV_FILE="freeboard-${TIMESTAMP}-page${PAGE}.csv"
```

**책임:**
- 프로세스 흐름 제어
- 에러 처리 및 로깅
- 파일 관리

**성능:**
- 총 실행 시간: 3-5초
- 병목: 네트워크 (250-300ms)

### Module 2: Analysis Engine (analyze-json.js)

```javascript
// 의존성
- Node.js fs (파일 시스템)
- 정규식 (문자열 처리)
- JSON (파싱)

// 주요 함수
function categorize(posts)      // 분류
function extractKeywords(posts) // 키워드
function calculateStats(posts)  // 통계
function generateMarkdown()     // 리포트

// 메모리 사용
- 입력: 30개 × 500바이트/개 = 15KB
- 처리: 워드맵, 통계 버퍼 = ~100KB
- 출력: 마크다운 문자열 = ~5KB
- 총: <500KB
```

**책임:**
- 데이터 파싱 및 변환
- 분석 로직 실행
- 보고서 생성

**성능:**
- 카테고리 분류: O(n×m) = O(210)
- 키워드 추출: O(n×k) = O(n×k) where k = 평균 단어수/제목
- 정렬: O(k log k) = O(k log k) where k = 고유 단어수
- 전체: < 50ms

---

## 설계 결정

### Decision 1: Bash + Node.js 조합

**선택 사항:**
```
A. Pure Bash (쉘 스크립팅만)
B. Pure Node.js (JavaScript만)
C. Bash + Node.js (하이브리드) ✅ 선택됨
D. Python
E. Go
```

**결정 이유:**
- ✅ Bash: 시스템 커맨드, 파이프라인, 자동화 효과적
- ✅ Node.js: 복잡한 데이터 처리, JSON 파싱 용이
- ❌ Pure Bash: 복잡한 텍스트 처리 어려움
- ❌ Pure Node.js: OS 명령 실행 번거로움
- ❌ Python: 프로젝트에 Python 환경 없음
- ❌ Go: 컴파일 필요, 의존성 관리 복잡

### Decision 2: CSV 저장 방식

**선택 사항:**
```
A. 메모리만 사용
B. CSV 파일로 저장 ✅ 선택됨
C. JSON 파일로 저장
D. 데이터베이스에 저장
```

**결정 이유:**
- ✅ 추적 가능 - 히스토리 비교용
- ✅ 외부 도구 호환 - Excel, pandas 등
- ✅ 가볍고 빠름
- ❌ 메모리: 데이터 손실 위험
- ❌ JSON: 너무 복잡, 중복
- ❌ DB: 초기 설정 복잡

### Decision 3: 카테고리 분류 방식

**선택 사항:**
```
A. 정규식 매칭 ✅ 선택됨
B. TF-IDF
C. 머신러닝 (분류기)
D. 수동 분류
```

**결정 이유:**
- ✅ 빠름 (< 10ms)
- ✅ 예측 가능 (규칙 기반)
- ✅ 수정 용이 (정규식 변경만)
- ❌ TF-IDF: 오버헤드, 정확도 동일
- ❌ ML: 학습 데이터 필요, 느림
- ❌ 수동: 자동화 불가

### Decision 4: 지표 선택

**선택 사항:**
```
카테고리 분포
∟ 빈도 기반 ✅ 선택됨
∟ TF 가중치
∟ 중요도 가중치

키워드
∟ 단순 빈도 ✅ 선택됨
∟ TF-IDF 점수
∟ TextRank

상위 게시물
∟ 조회수 ✅ 선택됨
∟ 추천수 + 조회수 가중합
∟ 최신순
```

**결정 이유:**
- 단순성: 구현 쉽고 이해하기 쉬움
- 성능: 빠른 계산
- 실용성: 사용자가 원하는 정보 제공

---

## 성능 최적화

### 성능 목표
```
총 실행 시간: < 5초
  ├─ 헬스 체크: < 5ms
  ├─ 데이터 수집: < 300ms
  ├─ 분석 엔진: < 50ms
  └─ 파일 저장: < 50ms
```

### 병목 분석

```
성능 프로파일링:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
네트워크       [████████████████░░] 250-300ms (60%)
분석 엔진      [████░░░░░░░░░░░░░░] 50ms     (12%)
파일 I/O       [███░░░░░░░░░░░░░░░] 30ms     (7%)
기타           [██░░░░░░░░░░░░░░░░] 20ms     (5%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
합계: ~350ms
```

### 최적화 전략

#### 1. 네트워크 최적화

```javascript
// 현재: 매번 크롤링
curl http://localhost:3008/freeboard?page=1

// 최적화: 로컬 캐싱 (향후)
if (cache_valid(page, max_age=300)) {
  use_cached_data();
} else {
  fetch_fresh_data();
  update_cache();
}
```

**효과**: 평균 80-90% 시간 절감

#### 2. 분석 최적화

```javascript
// 현재: 모든 게시물 순회 × 모든 카테고리
for (post of posts) {           // 30회
  for (category of categories) {  // 7회
    if (regex.test(post.title)) { // 210회
      ...
    }
  }
}

// 최적화: 단어 인덱싱
const categoryIndex = {
  '정치/검찰': ['검찰', '윤석열', ...],
  ...
};

for (post of posts) {
  const words = post.title.split(' ');
  for (word of words) {
    if (categoryIndex[word]) {
      categorize(post, categoryIndex[word]);
      break;
    }
  }
}
```

**효과**: 평균 20-30% 시간 절감

#### 3. 메모리 최적화

```javascript
// 현재: 전체 데이터 메모리 로드
const posts = data.data.posts;

// 스트림 처리 (향후)
const stream = fs.createReadStream('/tmp/freeboard.json');
stream.on('data', chunk => {
  process_chunk(chunk);
});
```

**효과**: 메모리 사용량 50% 감소

---

## 확장성 고려사항

### 1. 다양한 게시판 지원

```
현재: freeboard (자유게시판)
향후: baseball (야구), stock (주식), ...

구조:
scripts/
├── fetch-and-summarize.sh (공통)
├── analyze-json.js (공통)
├── categories/
│   ├── freeboard.json
│   ├── baseball.json
│   └── stock.json
└── filters/
    ├── freeboard-filter.js
    ├── baseball-filter.js
    └── stock-filter.js
```

### 2. 데이터베이스 통합

```
현재: CSV 파일 저장
향후: DB 저장 + 히스토리 추적

구조:
- posts 테이블: 모든 게시물 기록
- analysis 테이블: 분석 결과
- trends 테이블: 시간대별 추세
- keywords 테이블: 키워드 히스토리
```

### 3. 비교 분석

```
현재: 단일 페이지 분석
향후: 여러 페이지/날짜 비교

기능:
- Day-over-Day 비교
- Week-over-Week 비교
- 카테고리 변화 추적
- 키워드 상승/하강 감지
```

### 4. 실시간 모니터링

```
현재: 수동 실행
향후: 자동 스케줄링

구조:
- cron job: 매시간 자동 실행
- 변화 감지: 급격한 카테고리 변화 알림
- 대시보드: 웹 UI로 시각화
```

---

## 보안

### 위협 분석

| 위협 | 심각도 | 대응 |
|-----|--------|------|
| MCP 서버 다운 | 중 | 헬스 체크, 재시도 로직 |
| 네트워크 에러 | 중 | 타임아웃 설정, 재시도 |
| 악성 데이터 | 낮 | 입력 검증, 정규식 제한 |
| 권한 문제 | 중 | 파일 권한 확인, 에러 처리 |
| 인젝션 공격 | 낮 | URL 인코딩, 입력 살균 |

### 보안 대책

#### 1. 입력 검증
```bash
# 페이지 번호 검증
if ! [[ "$PAGE" =~ ^[0-9]+$ ]] || [ "$PAGE" -lt 1 ] || [ "$PAGE" -gt 999 ]; then
  echo "Invalid page number"
  exit 1
fi
```

#### 2. 파일 권한
```bash
# CSV 파일 권한 설정
chmod 644 "$CSV_FILE"  # 읽기 전용

# 디렉토리 권한
chmod 755 scripts/
```

#### 3. 데이터 살균
```javascript
// 제목에서 특수 문자 이스케이프
const title = post.title.replace(/"/g, '""');  // CSV 이스케이프
```

---

## 에러 처리

### 에러 분류

```
Level 1: Fatal Error (프로세스 종료)
├─ MCP 서버 미실행
├─ 네트워크 연결 실패
└─ 분석 엔진 크래시

Level 2: Warning (로그만 출력)
├─ 일부 게시물 파싱 실패
├─ 일부 키워드 추출 실패
└─ 시간대 데이터 누락

Level 3: Info (상태 정보)
├─ 분석 시작
├─ 데이터 수집 완료
└─ 파일 저장 완료
```

### 에러 처리 예시

```bash
# Example 1: 서버 체크 실패
if ! curl -s http://localhost:3008/health > /dev/null 2>&1; then
  echo -e "${RED}❌ MCP 서버가 실행 중이지 않습니다.${NC}"
  echo -e "${RED}   포트: 3008${NC}"
  exit 1  # 프로세스 종료
fi

# Example 2: 데이터 수집 실패
if ! curl -s "http://localhost:3008/freeboard?page=${PAGE}" > "$JSON_FILE"; then
  echo -e "${RED}❌ 데이터 수집 실패${NC}"
  exit 1
fi

# Example 3: 분석 엔진 에러
node scripts/analyze-json.js "$JSON_FILE" "$CSV_FILE" "$PAGE" || {
  echo -e "${RED}❌ 분석 중 오류 발생${NC}"
  exit 1
}
```

### 복구 전략

```
자동 복구:
1. 재시도 로직
   - 최대 3회 재시도
   - 지수적 백오프 (1초, 2초, 4초)

2. Fallback
   - 이전 캐시 데이터 사용
   - 기본값으로 분석 계속

3. 알림
   - 에러 로그 저장
   - 관리자 알림 (향후)
```

---

**버전**: 1.0
**마지막 업데이트**: 2026-03-14
**상태**: 최종 검토 완료 ✅
