# 뽐뿌 자유게시판 자동 분석 도구

> **Fetch and Summarize Freeboard** - 최신 freeboard 데이터를 자동으로 수집하고 분석하여 요약 리포트를 생성하는 자동화 도구

![Status](https://img.shields.io/badge/Status-Production-brightgreen) ![Version](https://img.shields.io/badge/Version-1.0-blue) ![License](https://img.shields.io/badge/License-MIT-orange)

---

## 📋 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
- [사용 방법](#사용-방법)
- [분석 결과](#분석-결과)
- [아키텍처](#아키텍처)
- [파일 구조](#파일-구조)
- [설치 및 설정](#설치-및-설정)
- [트러블슈팅](#트러블슈팅)
- [확장 기능](#확장-기능)
- [라이선스](#라이선스)

---

## 개요

### 목적
뽐뿌 자유게시판의 실시간 데이터를 수집하여 자동으로 분석하고, 카테고리별 분포, 핵심 키워드, 상위 게시물 등을 마크다운 형식의 요약 리포트로 생성합니다.

### 특징
- ⚡ **실시간 데이터 수집** - ppomppu-crawler MCP 서버 연동
- 🤖 **완전 자동화** - 한 줄 커맨드로 수집 → 분석 → 리포트 생성
- 📊 **지능형 분석** - 카테고리 자동 분류, 키워드 추출, 통계 계산
- 💾 **CSV 자동 저장** - 데이터 추적 및 비교 분석
- 📱 **Claude 통합** - `/fetch-and-summarize-freeboard` 커맨드로 즉시 사용
- 🔄 **확장 가능** - 다양한 옵션과 플러그인 지원

---

## 주요 기능

### 1. 데이터 수집
```
MCP 서버 (ppomppu-crawler)
    ↓
freeboard?page=1 API 호출
    ↓
JSON 30개 게시물 데이터
    ↓
CSV 변환 & 저장
```

**수집 항목:**
- 게시물번호, 제목, 작성자
- 작성시간, 조회수, 추천/비추천

### 2. 자동 분석

#### 📊 카테고리 분류 (7가지)
- **정치/검찰** - 검찰개혁, 정치인, 여야 논쟁
- **경제/투자** - 주식, 투자, 재테크
- **스포츠** - 야구, WBC, 경기 결과
- **국제** - 해외뉴스, 국제분쟁
- **연예/종교** - 연예인, 종교 이슈
- **생활** - 일상 이야기, 고민
- **기타** - 분류 불가 게시물

#### 🔥 키워드 추출
- 제목에서 2글자 이상 한글 단어 추출
- 빈도 기반 순위 계산 (상위 10개)
- 스코어링: `0.5 + (빈도 / 전체 × 0.5)`

#### 🏆 상위 게시물 선정
- **조회수 기준** - 최고 5개 게시물
- **메타데이터** - 작성자, 시간, 추천수 포함

#### ⏰ 시간대 분석
- 시간대별 게시물 분포
- 활발한 시간대 탐지
- 패턴 분석 및 인사이트

### 3. 리포트 생성

마크다운 형식으로 자동 생성:
```markdown
# 📊 뽐뿌 자유게시판 현황 분석

## 🎯 핵심 요약
- 총 게시물: 30개
- 가장 많은 카테고리: 정치/검찰 (13.3%)
- 최고 조회: 1268회

## 📊 카테고리별 분포
[테이블 형식]

## 🔥 핵심 키워드
1. 트럼프 - 2회
2. 야구 - 2회
...

## 🏆 최고 조회 게시물
[테이블 형식]
```

---

## 빠른 시작

### 최소 요구사항
- Node.js 18+
- Bash (Linux/macOS) 또는 WSL (Windows)
- ppomppu-crawler MCP 서버 (포트 3008)

### 1단계: 데이터 수집 및 분석

```bash
bash scripts/fetch-and-summarize.sh 1
```

**출력:**
```
━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 뽐뿌 자유게시판 자동 분석
━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] MCP 서버 상태 확인 중...
✅ MCP 서버 정상 (포트 3008)

[2/4] freeboard 페이지 1 데이터 수집 중...
✅ 데이터 수집 완료 (30개 게시물)

[3/4] 데이터 분석 중...
# 📊 뽐뿌 자유게시판 현황 분석
...

[4/4] 분석 완료

✅ 모든 작업 완료!

📁 생성된 파일:
   - freeboard-2026-03-14-page1.csv
```

### 2단계: 결과 확인
```bash
# CSV 파일 확인
cat freeboard-2026-03-14-page1.csv

# 이전 분석과 비교
diff freeboard-2026-03-13-page1.csv freeboard-2026-03-14-page1.csv
```

---

## 사용 방법

### 기본 사용

#### 특정 페이지 분석
```bash
# Claude 커맨드 사용 (권장)
/fetch-and-summarize-freeboard 1
/fetch-and-summarize-freeboard 2

# 또는 bash 스크립트 직접 사용
bash scripts/fetch-and-summarize.sh 1
bash scripts/fetch-and-summarize.sh 2
```

#### 여러 페이지 순차 분석
```bash
# 페이지 1, 2, 3 순서대로 분석
for page in 1 2 3; do
  bash scripts/fetch-and-summarize.sh $page
done
```

#### 병렬 분석 (고급)
```bash
# 페이지 1, 2, 3 동시 분석
bash scripts/fetch-and-summarize.sh 1 &
bash scripts/fetch-and-summarize.sh 2 &
bash scripts/fetch-and-summarize.sh 3 &
wait
```

### 커맨드 옵션

```bash
# 기본 실행
/fetch-and-summarize-freeboard

# 특정 페이지
/fetch-and-summarize-freeboard 2

# 여러 페이지
/fetch-and-summarize-freeboard 1 2 3
```

---

## 분석 결과

### 출력 형식: 마크다운

```markdown
# 📊 뽐뿌 자유게시판 현황 분석

**분석 시간**: 2026-03-14T02:46:30.128Z
**페이지**: 1
**총 게시물**: 30개

## 🎯 핵심 요약

| 지표 | 값 |
|------|-----|
| 가장 많은 카테고리 | 정치/검찰 (4개) |
| 최고 조회 | 1268회 |
| 최고 추천 | 1-0 |
| 분석 시간 | 02:46:30 |

## 📊 카테고리별 분포

| 카테고리 | 게시물 | 비율 |
|---------|--------|------|
| 정치/검찰 | 4 | 13.3% |
| 경제/투자 | 3 | 10.0% |
| 스포츠 | 2 | 6.7% |
| 기타 | 21 | 70.0% |

## 🔥 핵심 키워드 (TOP 10)

1. **트럼프** - 2회
2. **야구** - 2회
3. **좋아** - 2회
...

## 🏆 최고 조회 게시물 (TOP 5)

| 순위 | No | 제목 | 조회 | 작성자 |
|-----|-----|------|------|--------|
| 1 | 9872214 | 현대차에 2억 투자해서... | 1268 | Pixel99 |
| 2 | 9872209 | 김어준 방송에서 실종... | 1051 | 푸른날개482 |
...

## ⏰ 시간대 분석

- **11:00대**: 5개 (16.7%)
- **10:00대**: 4개 (13.3%)
```

### 저장되는 파일

**CSV 파일:**
```
freeboard-2026-03-14-page1.csv

구조:
게시물번호,제목,작성자,시간,조회,추천
9872214,"현대차에 2억 투자해서 성공한 30대 파이어족",Pixel99,11:35:55,1268,"1 - 0"
...
```

---

## 아키텍처

### 시스템 다이어그램

```
┌─────────────────────────────────────────────────────┐
│          Claude Code Interface                      │
│     /fetch-and-summarize-freeboard [page]          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        Bash Automation Layer                        │
│   scripts/fetch-and-summarize.sh                    │
│  - MCP 서버 상태 확인                                │
│  - JSON 데이터 수집                                  │
│  - 분석 엔진 호출                                    │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │ MCP    │ │ JSON → │ │Analysis│
    │Server  │ │ CSV    │ │Engine  │
    │:3008   │ │Convert │ │        │
    └────────┘ └────────┘ └────────┘
        │          │          │
        └──────────┼──────────┘
                   ▼
    ┌─────────────────────────────┐
    │ Output Files                │
    │ - CSV: freeboard-*.csv      │
    │ - Report: Markdown (stdout) │
    └─────────────────────────────┘
```

### 데이터 흐름

```
1. 사용자 입력
   /fetch-and-summarize-freeboard 1
        ↓
2. Bash 스크립트 실행
   fetch-and-summarize.sh 1
        ↓
3. MCP 서버 체크
   curl http://localhost:3008/health
        ↓
4. 데이터 수집
   curl http://localhost:3008/freeboard?page=1
        ↓
5. JSON 저장
   /tmp/freeboard-page1.json
        ↓
6. 분석 실행
   node scripts/analyze-json.js
        ↓
7. CSV 생성
   freeboard-2026-03-14-page1.csv
        ↓
8. 리포트 출력
   Markdown 형식의 요약
        ↓
9. 완료
   ✅ 모든 작업 완료!
```

---

## 파일 구조

```
project-root/
│
├── .claude/
│   ├── commands/
│   │   └── fetch-and-summarize-freeboard.md    ← 커맨드 정의
│   │
│   └── mcp.json                                ← MCP 설정
│
├── scripts/
│   ├── fetch-and-summarize.sh                  ← 메인 스크립트
│   └── analyze-json.js                         ← 분석 엔진
│
├── docs/
│   └── fetch-and-summarize-freeboard/
│       ├── README.md                           ← 이 문서
│       ├── ARCHITECTURE.md                     ← 아키텍처 설명
│       ├── USER_GUIDE.md                       ← 사용자 가이드
│       ├── DEVELOPER_GUIDE.md                  ← 개발자 가이드
│       └── API.md                              ← API 문서
│
├── freeboard-YYYY-MM-DD-page*.csv              ← 자동 생성된 CSV
│
└── README.md                                    ← 프로젝트 README
```

---

## 설치 및 설정

### 1. 사전 요구사항 확인

```bash
# Node.js 버전 확인
node --version
# v18.0.0 이상 필요

# Bash 확인
bash --version
# GNU bash 4.0 이상 필요

# curl 확인
curl --version
# 필수
```

### 2. MCP 서버 실행

```bash
# ppomppu-crawler MCP 서버 실행
npm start
# 포트 3008에서 실행되어야 함

# 다른 터미널에서 헬스 체크
curl http://localhost:3008/health
# {"status":"ok"} 응답
```

### 3. 스크립트 권한 설정

```bash
# 스크립트 실행 권한 부여
chmod +x scripts/fetch-and-summarize.sh
chmod +x scripts/analyze-json.js

# 확인
ls -la scripts/
# -rwxr-xr-x 1 user user ... fetch-and-summarize.sh
# -rwxr-xr-x 1 user user ... analyze-json.js
```

### 4. 커맨드 활성화

```bash
# Claude Code에서 커맨드 로드
# .claude/commands/fetch-and-summarize-freeboard.md가 자동 인식됨

# 확인
/fetch-and-summarize-freeboard
# 커맨드 실행 가능
```

---

## 트러블슈팅

### Q1: MCP 서버가 실행 중이지 않습니다.

```bash
# 에러 메시지
❌ ppomppu-crawler MCP 서버가 실행 중이지 않습니다.
   포트: 3008

# 해결 방법
1. npm start로 서버 시작
2. 다른 프로세스가 포트 3008을 사용 중인지 확인
   lsof -i :3008
   # 있으면 kill -9 [PID]로 종료
3. 다시 시도
```

### Q2: "Cannot read properties of undefined" 에러

```bash
# 원인: 시간대 데이터 누락 또는 형식 오류

# 해결 방법
1. JSON 파일 확인
   cat /tmp/freeboard-page1.json | head -100
2. time 필드 확인
   grep "time" /tmp/freeboard-page1.json
3. 필요시 analyze-json.js의 시간대 처리 수정
```

### Q3: CSV 파일이 생성되지 않았습니다.

```bash
# 확인 사항
1. 디스크 공간 확인
   df -h
2. 쓰기 권한 확인
   ls -ld .
   # drwxr-xr-x 권한이어야 함
3. 스크립트 로그 확인
   bash -x scripts/fetch-and-summarize.sh 1 2>&1 | tail -20
```

### Q4: 같은 페이지를 여러 번 분석해도 데이터가 변하지 않습니다.

```bash
# 이는 정상 동작입니다.
# ppomppu-crawler가 캐싱을 사용할 수 있으므로

# 강제 새로고침이 필요하면:
1. MCP 서버 재시작
   npm restart
2. 캐시 제거 (서버 구현 확인 필요)
3. 다시 실행
   bash scripts/fetch-and-summarize.sh 1
```

---

## 확장 기능

### 향후 계획

| 버전 | 기능 | 상태 | ETA |
|-----|------|------|-----|
| **v1.0** | 기본 수집 + 분석 | ✅ 완료 | - |
| **v1.1** | 이전 분석과 자동 비교 | 📋 계획 | 2주 |
| **v1.2** | 다중 페이지 병렬 분석 | 📋 계획 | 2주 |
| **v1.3** | 정기 자동 스케줄링 | 📋 계획 | 3주 |
| **v2.0** | DB 저장 + 히스토리 추적 | 📋 계획 | 1개월 |

### 커스터마이징

**카테고리 추가:**
```javascript
// scripts/analyze-json.js의 categories 객체 수정
const categories = {
  '새로운카테고리': /키워드1|키워드2|키워드3/i,
  // ... 기타
};
```

**분석 엔진 확장:**
- 감정 분석 추가
- 주제 모델링
- 실시간 트렌드 탐지
- 이미지 메타데이터 분석

---

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 지원 및 피드백

문제가 있거나 기능 제안이 있으면:
1. GitHub Issues 등록
2. 개발자에게 직접 문의
3. 디버그 로그 첨부

```bash
# 디버그 모드 실행
bash -x scripts/fetch-and-summarize.sh 1 > debug.log 2>&1
```

---

**마지막 업데이트**: 2026-03-14
**버전**: 1.0
**상태**: 프로덕션 배포 가능 ✅
