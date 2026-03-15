# Developer Guide - 뽐뿌 자유게시판 자동 분석

> 개발자를 위한 기술 문서 - 확장 및 커스터마이징

---

## 📋 목차

- [개발 환경 설정](#개발-환경-설정)
- [코드 구조](#코드-구조)
- [새 기능 추가](#새-기능-추가)
- [카테고리 커스터마이징](#카테고리-커스터마이징)
- [테스트](#테스트)
- [디버깅](#디버깅)
- [성능 최적화](#성능-최적화)
- [배포](#배포)

---

## 개발 환경 설정

### 1. 리포지토리 구조

```
project/
├── .claude/
│   ├── commands/
│   │   └── fetch-and-summarize-freeboard.md
│   ├── mcp.json
│   └── ...
│
├── scripts/
│   ├── fetch-and-summarize.sh          # 메인 오케스트레이션
│   └── analyze-json.js                 # 분석 엔진
│
├── docs/
│   └── fetch-and-summarize-freeboard/
│       ├── README.md                   # 사용자 가이드
│       ├── ARCHITECTURE.md             # 아키텍처
│       ├── USER_GUIDE.md              # 상세 사용법
│       └── DEVELOPER_GUIDE.md          # 이 파일
│
├── freeboard-YYYY-MM-DD-page*.csv      # 자동 생성 파일
├── package.json
└── ...
```

### 2. 개발 도구 설치

```bash
# Node.js 개발 의존성 (개선된 버전)
npm install -D prettier eslint nodemon

# 코드 포매팅
npx prettier --write scripts/

# 린트 체크
npx eslint scripts/analyze-json.js
```

### 3. 개발 서버 실행

```bash
# 자동 재시작과 함께 실행
npx nodemon scripts/analyze-json.js

# 또는 기본 실행
node scripts/analyze-json.js /tmp/freeboard-page1.json
```

---

## 코드 구조

### analyze-json.js 분석

```javascript
#!/usr/bin/env node

// 1. 입력 처리
const jsonFile = process.argv[2];
const csvFile = process.argv[3];
const pageNum = process.argv[4] || 1;

// 2. 파일 읽기
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const posts = jsonData.data.posts;

// 3. 분석 모듈

// 3-1. 카테고리 분류
const categories = { ... };
const categoryCounts = {};
posts.forEach(p => { ... });

// 3-2. 키워드 추출
const wordFreq = {};
posts.forEach(p => {
  const words = p.title.match(/[가-힣]{2,}/g) || [];
  // ...
});

// 3-3. 통계 계산
const topPosts = posts
  .filter(p => p.views > 0)
  .sort((a, b) => b.views - a.views)
  .slice(0, 5);

// 4. 리포트 생성
let md = '# 📊 뽐뿌 자유게시판 현황 분석\n\n';
// ... Markdown 생성

// 5. 출력
console.log(md);
```

### fetch-and-summarize.sh 분석

```bash
#!/bin/bash

# 색상 정의 (로깅)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 변수 설정
PAGE=${1:-1}
TIMESTAMP=$(date +%Y-%m-%d)
CSV_FILE="freeboard-${TIMESTAMP}-page${PAGE}.csv"
JSON_FILE="/tmp/freeboard-page${PAGE}.json"

# [1/4] 헬스 체크
echo -e "${YELLOW}[1/4]${NC} MCP 서버 상태 확인 중..."
if ! curl -s http://localhost:3008/health > /dev/null 2>&1; then
  echo -e "${RED}❌ ... ${NC}"
  exit 1
fi
echo -e "${GREEN}✅ ... ${NC}\n"

# [2/4] 데이터 수집
echo -e "${YELLOW}[2/4]${NC} freeboard 페이지 $PAGE 데이터 수집 중..."
curl -s "http://localhost:3008/freeboard?page=${PAGE}" > "$JSON_FILE"
echo -e "${GREEN}✅ ... ${NC}\n"

# [3/4] 분석
echo -e "${YELLOW}[3/4]${NC} 데이터 분석 중..."
node scripts/analyze-json.js "$JSON_FILE" "$CSV_FILE" "$PAGE"
echo -e "\n${GREEN}✅ ... ${NC}"

# 완료
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
```

---

## 새 기능 추가

### 기능 1: 새 카테고리 추가

**요구사항:** "음악" 카테고리 추가

**Step 1: 정규식 추가**

```javascript
// scripts/analyze-json.js

const categories = {
  '정치/검찰': /검찰|윤석열|이재명|민주당|국민의힘|오세훈/i,
  '경제/투자': /현대차|주식|투자|포인트|갤럭시|파이어족/i,
  '스포츠': /야구|WBC|경기|선수/i,
  '음악': /음악|노래|앨범|가수|콘서트|뮤직비디오/i,  // ← 추가
  '기타': /.*/
};
```

**Step 2: 테스트**

```bash
bash scripts/fetch-and-summarize.sh 1

# 결과에 "음악" 카테고리가 나타나는지 확인
grep "음악" /tmp/freeboard-page1.json  # 샘플 데이터 확인
```

### 기능 2: 불용어 필터 추가

**현재:** 모든 단어를 키워드로 추출

**개선:** 불용어(의, 이, 를, 등) 제거

**Step 1: 불용어 리스트 추가**

```javascript
// scripts/analyze-json.js

const stopwords = [
  '의', '이', '를', '에', '이', '다', '은', '도',
  '하', '것', '있', '되', '수', '같', '있'
];

// 키워드 추출 수정
posts.forEach(p => {
  const words = p.title.match(/[가-힣]{2,}/g) || [];
  words.forEach(word => {
    if (!stopwords.includes(word)) {  // ← 불용어 제외
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
});
```

**Step 2: 테스트**

```bash
bash scripts/fetch-and-summarize.sh 1

# "이", "의" 등이 키워드에서 제외되는지 확인
```

### 기능 3: 감정 분석 추가

**목표:** 게시물의 감정(긍정/부정/중립) 분석

**Step 1: 감정 분석 함수 추가**

```javascript
// scripts/analyze-json.js

function analyzeSentiment(posts) {
  const sentiments = {
    positive: /좋아|재미|최고|훌륭|멋|완벽/i,
    negative: /싫어|최악|불쾌|화났|거짓|사기/i,
    neutral: /.*/
  };

  let sentiment_counts = {
    positive: 0,
    negative: 0,
    neutral: 0
  };

  posts.forEach(p => {
    if (sentiments.positive.test(p.title)) {
      sentiment_counts.positive++;
    } else if (sentiments.negative.test(p.title)) {
      sentiment_counts.negative++;
    } else {
      sentiment_counts.neutral++;
    }
  });

  return sentiment_counts;
}

// 분석 단계에서 호출
const sentiments = analyzeSentiment(posts);
```

**Step 2: 리포트에 추가**

```javascript
// 마크다운 리포트 생성 시 추가
md += '## 💭 감정 분석\n\n';
md += `| 감정 | 개수 | 비율 |\n`;
md += `|------|------|------|\n`;
md += `| 긍정 | ${sentiments.positive} | ${(sentiments.positive/posts.length*100).toFixed(1)}% |\n`;
md += `| 부정 | ${sentiments.negative} | ${(sentiments.negative/posts.length*100).toFixed(1)}% |\n`;
md += `| 중립 | ${sentiments.neutral} | ${(sentiments.neutral/posts.length*100).toFixed(1)}% |\n\n`;
```

**Step 3: 테스트**

```bash
bash scripts/fetch-and-summarize.sh 1

# "💭 감정 분석" 섹션이 나타나는지 확인
grep "감정" freeboard-*.csv  # 아니, 마크다운 출력에서 확인
```

---

## 카테고리 커스터마이징

### 정규식 작성 팁

```javascript
// 기본 구조
const regex = /단어1|단어2|단어3/i;

// i: 대소문자 무시
/검찰/i  // "검찰", "검찰", "檢察" 모두 매칭

// |: 또는 (OR)
/검찰|윤석열|이재명/i  // 셋 중 하나 매칭

// 그룹화
/(검찰|검찰개혁|검찰청)/i  // 여러 단어 묶음

// 부정
/^(?!.*광고)/  // "광고"가 없는 문자열

// 예시
const categories = {
  '정치/검찰': /검찰|윤석열|이재명|민주당|국민의힘|오세훈|여론조사/i,
  '경제/투자': /현대차|주식|투자|포인트|갤럭시|파이어족|재테크|네이버페이/i,
  '스포츠': /야구|WBC|경기|선수|도미니카|류현진|오타니|타이완/i,
  '국제': /호르무즈|이란|미국|이스라엘|중국|트럼프|외교|제재/i,
  '연예/종교': /김어준|신천지|영화|드라마|반지의제왕|방송|예능/i,
};
```

### 테스트 데이터로 카테고리 검증

```bash
# 특정 제목이 올바른 카테고리로 분류되는지 확인
node -e "
const title = '트럼프가 호르무즈 해협 방문';
const regex = /호르무즈|트럼프/i;
console.log(regex.test(title));  // true
"

# 실제 데이터로 테스트
cat freeboard-*.csv | head -20 | cut -d',' -f2 | while read title; do
  echo \"Testing: $title\"
  node -e "console.log(/정치/.test('$title'))"
done
```

---

## 테스트

### 단위 테스트 추가

**파일:** `scripts/__tests__/analyze.test.js`

```javascript
const analyze = require('../analyze-json');

describe('Analysis Engine', () => {
  // 테스트 데이터
  const mockPosts = [
    {
      no: '1',
      title: '검찰개혁 관련 뉴스',
      author: 'test',
      date: '12:00:00',
      views: '100',
      recommend: '5 - 0'
    },
    {
      no: '2',
      title: '주식 투자 팁',
      author: 'test',
      date: '12:10:00',
      views: '50',
      recommend: '2 - 1'
    }
  ];

  // 테스트 케이스
  test('카테고리 분류', () => {
    const result = analyze.categorize(mockPosts);
    expect(result['정치/검찰']).toBe(1);
    expect(result['경제/투자']).toBe(1);
  });

  test('키워드 추출', () => {
    const result = analyze.extractKeywords(mockPosts);
    expect(result).toContain({ text: '검찰개혁', count: 1 });
  });

  test('상위 게시물', () => {
    const result = analyze.getTopPosts(mockPosts, 1);
    expect(result[0].no).toBe('1');
    expect(result[0].views).toBe(100);
  });
});
```

**실행:**

```bash
npm test

# 또는
npx jest scripts/__tests__/analyze.test.js
```

### 통합 테스트

```bash
#!/bin/bash

# test-integration.sh

echo "🧪 통합 테스트 시작"

# Test 1: 기본 실행
echo "Test 1: 기본 분석 실행"
bash scripts/fetch-and-summarize.sh 1
if [ $? -eq 0 ]; then
  echo "✅ 기본 분석 성공"
else
  echo "❌ 기본 분석 실패"
  exit 1
fi

# Test 2: CSV 파일 검증
echo "Test 2: CSV 파일 검증"
if [ -f "freeboard-2026-03-14-page1.csv" ]; then
  echo "✅ CSV 파일 생성 성공"
  lines=$(wc -l < freeboard-2026-03-14-page1.csv)
  if [ $lines -eq 31 ]; then  # 헤더 + 30개 게시물
    echo "✅ CSV 행 수 검증 성공"
  else
    echo "❌ CSV 행 수 검증 실패 (기대: 31, 실제: $lines)"
  fi
else
  echo "❌ CSV 파일 생성 실패"
  exit 1
fi

# Test 3: 마크다운 리포트 검증
echo "Test 3: 리포트 검증"
output=$(bash scripts/fetch-and-summarize.sh 1 2>&1)
if echo "$output" | grep -q "🎯 핵심 요약"; then
  echo "✅ 리포트 생성 성공"
else
  echo "❌ 리포트 생성 실패"
  exit 1
fi

echo "🎉 모든 테스트 통과!"
```

**실행:**

```bash
chmod +x test-integration.sh
./test-integration.sh
```

---

## 디버깅

### 로깅 추가

```javascript
// scripts/analyze-json.js에 디버그 로깅 추가

const DEBUG = process.env.DEBUG === 'true';

function log(message, data = '') {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, data);
  }
}

// 사용
log('카테고리 분류 시작', posts.length);
posts.forEach((post, i) => {
  log(`게시물 ${i}:`, post.title);
  // ...
});
log('분류 결과:', categoryCounts);
```

**실행:**

```bash
DEBUG=true node scripts/analyze-json.js /tmp/freeboard-page1.json freeboard.csv
```

### 단계별 실행

```bash
# Step 1: JSON 파일 확인
echo "Step 1: JSON 파일 확인"
curl -s http://localhost:3008/freeboard?page=1 > /tmp/test.json
head -30 /tmp/test.json | jq '.'

# Step 2: CSV 변환 확인
echo "Step 2: CSV 변환"
node scripts/analyze-json.js /tmp/test.json /tmp/test.csv 1 > /tmp/report.md

# Step 3: 결과 확인
echo "Step 3: 결과"
cat /tmp/test.csv | head -5
cat /tmp/report.md | head -20
```

### 에러 트레이싱

```bash
# Bash 디버그 모드
bash -x scripts/fetch-and-summarize.sh 1

# Node.js 디버그
node --inspect scripts/analyze-json.js /tmp/freeboard-page1.json freeboard.csv

# Chrome DevTools에서 접근:
# chrome://inspect
```

---

## 성능 최적화

### 프로파일링

```javascript
// scripts/analyze-json.js에 타이밍 추가

const start = Date.now();

function timeBlock(name) {
  return {
    start: Date.now(),
    end: function() {
      const elapsed = Date.now() - this.start;
      console.error(`[TIMING] ${name}: ${elapsed}ms`);
    }
  };
}

// 사용
let timer = timeBlock('카테고리 분류');
// ... 분류 로직
timer.end();

timer = timeBlock('키워드 추출');
// ... 키워드 로직
timer.end();
```

**실행:**

```bash
node scripts/analyze-json.js /tmp/freeboard-page1.json freeboard.csv 2>&1 | grep TIMING
```

### 메모리 사용량 최적화

```javascript
// 현재: 모든 데이터를 메모리에 로드
const posts = jsonData.data.posts;

// 최적화: 스트림 처리 (대용량 데이터)
const fs = require('fs');
const readline = require('readline');

// 또는 제너레이터 사용
function* postGenerator(posts) {
  for (const post of posts) {
    yield post;
  }
}

for (const post of postGenerator(posts)) {
  // 각 게시물 처리
}
```

---

## 배포

### 프로덕션 체크리스트

```bash
# 1. 코드 품질 검사
npm run lint
npm test

# 2. 성능 검증
time bash scripts/fetch-and-summarize.sh 1
# 목표: < 5초

# 3. 로그 레벨 설정
# DEBUG 변수 제거
unset DEBUG

# 4. 에러 처리 검증
# 모든 exit 1이 적절히 처리되는지 확인

# 5. 보안 검사
# 민감한 정보 노출 확인
grep -r "password\|token\|secret" scripts/
```

### 배포 스크립트

```bash
#!/bin/bash

# deploy.sh

echo "🚀 배포 시작"

# 1. 코드 가져오기
git pull origin main

# 2. 의존성 설치
npm install

# 3. 테스트
npm test || exit 1

# 4. 권한 설정
chmod +x scripts/fetch-and-summarize.sh
chmod +x scripts/analyze-json.js

# 5. 모듈 재로드
npm restart

# 6. 검증
sleep 2
curl http://localhost:3008/health || exit 1

echo "✅ 배포 완료"
```

### 버전 관리

```json
// package.json
{
  "name": "fetch-and-summarize-freeboard",
  "version": "1.0.0",
  "description": "뽐뿌 자유게시판 자동 분석",
  "scripts": {
    "test": "jest",
    "deploy": "bash deploy.sh",
    "lint": "eslint scripts/"
  }
}
```

**버전 업데이트:**

```bash
# 패치 버전 (1.0.0 → 1.0.1)
npm version patch

# 마이너 버전 (1.0.0 → 1.1.0)
npm version minor

# 메이저 버전 (1.0.0 → 2.0.0)
npm version major

# 변경사항 커밋
git add .
git commit -m "Version bump"
git push origin main
```

---

## 추가 리소스

### 코드 스타일 가이드

```javascript
// Good ✅
const categories = {
  '정치/검찰': /검찰|윤석열/i,
  '경제/투자': /주식|투자/i,
};

// Bad ❌
const categories={
  '정치/검찰':/검찰|윤석열/i,
  '경제/투자':/주식|투자/i
};
```

### 주석 작성

```javascript
// Good ✅
// 카테고리별 키워드 정의
// 정규식 i 플래그로 대소문자 무시
const categories = { ... };

// Bad ❌
// 카테고리들
const c = { ... };
```

### PR 체크리스트

```markdown
# Pull Request Checklist

- [ ] 코드 테스트 완료
- [ ] 린트 통과 (`npm run lint`)
- [ ] 성능 영향 없음 (< 5초)
- [ ] 에러 처리 추가됨
- [ ] 문서 업데이트됨
- [ ] 회귀 테스트 통과
```

---

**마지막 업데이트**: 2026-03-14
**상태**: ✅ 최종 검토 완료
