# 🚀 PPOM MCP - Model Context Protocol 기반 데이터 자동화 플랫폼

> MySQL 데이터베이스 조작과 웹 스크래핑을 MCP를 통해 자동화하는 Next-Gen 개발 플랫폼

## 📋 프로젝트 개요

**PPOM MCP**는 Model Context Protocol을 활용하여 다음 기능을 제공합니다:

- 🗄️ **myawsdb**: MySQL 데이터베이스 쿼리 및 조작 (CRUD)
- 🌐 **ppomppu-crawler**: 한국 커뮤니티(뽐뿌) 게시판 크롤링 및 실시간 분석
- 🤖 **Claude Code Skills**: 자동화된 데이터 작업을 위한 4개의 커스텀 스킬
- 📊 **Zero-Script Analytics**: 로그 분석 기반의 자동 검증

---

## 🏗️ 프로젝트 구조

```
ppom_mcp/
├── mcp-servers/                      # MCP 서버 구현
│   ├── myawsdb.js                   # MySQL DB 쿼리 서버 (포트: 3010)
│   ├── ppomppu-crawler/
│   │   └── ppomppu-crawler.js       # 뽐뿌 크롤러 (포트: 3008)
│   └── README.md                    # MCP 서버 문서
│
├── .claude/skills/                   # Claude Code 스킬 (자동화)
│   ├── myawsdb/
│   │   └── SKILL.md                 # DB 쿼리 스킬
│   ├── myawsdb-export/
│   │   └── SKILL.md                 # 데이터 내보내기 (CSV/JSON/TSV)
│   ├── ppom/
│   │   └── SKILL.md                 # 뽐뿌 분석 스킬
│   └── php-migrate/
│       └── SKILL.md                 # PHP 레거시 코드 마이그레이션
│
├── scripts/                          # 유틸리티 스크립트
│   ├── fetch-freeboard.js           # 게시판 데이터 수집
│   ├── analyze-*.js                 # 데이터 분석 스크립트
│   └── query-posts.js               # DB 쿼리 유틸
│
├── docs/                             # 상세 문서
│   ├── 01-plan/                     # 기능 계획 문서
│   ├── 02-design/                   # 기술 설계 문서
│   ├── 03-analysis/                 # 분석 결과 문서
│   ├── 04-report/                   # 완료 보고서
│   ├── API.md                       # API 명세서
│   └── ADDING_MORE_BOARDS.md        # 게시판 추가 가이드
│
├── .env.example                      # 환경 변수 템플릿
├── package.json                      # npm 의존성
├── CLAUDE.md                        # Claude Code 설정 가이드
└── README.md                        # 이 파일
```

---

## 🚀 빠른 시작

### 1️⃣ 의존성 설치

```bash
npm install
```

### 2️⃣ 환경 설정

```bash
cp .env.example .env
# .env 파일에서 데이터베이스 정보 설정
```

### 3️⃣ MCP 서버 시작

```bash
# myawsdb 서버 (포트 3010)
npm run myawsdb

# ppomppu-crawler 서버 (포트 3008)
npm run ppom
```

✅ **결과**: 두 서버가 모두 실행되면 Claude Code에서 자동으로 인식됩니다.

---

## 🔌 MCP 서버 상세

### 1. myawsdb (포트: 3010)

**목적**: MySQL 데이터베이스에 대한 CRUD 작업

**지원 명령어**:
```bash
/myawsdb query posts limit 5           # 데이터 조회
/myawsdb describe posts                # 테이블 구조 확인
/myawsdb get_tables                    # 모든 테이블 목록
/myawsdb insert posts {...}            # 데이터 삽입
/myawsdb update posts {...}            # 데이터 수정
/myawsdb delete posts id=1             # 데이터 삭제
```

**API 엔드포인트**:
```
POST   http://localhost:3010/query      # SQL 쿼리 실행
POST   http://localhost:3010/describe   # 테이블 구조
GET    http://localhost:3010/tables     # 테이블 목록
POST   http://localhost:3010/execute    # 직접 SQL 실행
```

**지원 도구 (inputSchema 포함)**:
- execute_query
- get_tables
- describe_table
- query_records
- insert_record
- update_record
- delete_record

---

### 2. ppomppu-crawler (포트: 3008)

**목적**: 뽐뿌 게시판 데이터 수집 및 실시간 분석

**지원 게시판**:
- freeboard (자유게시판)
- baseball (야구 게시판)
- ppomppu (뽐뿌 일반)
- stock (주식 게시판)

**지원 명령어**:
```bash
/ppom freeboard 1                      # 게시판 데이터 조회
/ppom analyze freeboard 1              # 게시판 분석 (키워드, 통계)
/ppom baseball 1                       # 야구 게시판 조회
```

**API 엔드포인트**:
```
GET    http://localhost:3008/freeboard?page=1
GET    http://localhost:3008/analyze?board=freeboard&page=1
GET    http://localhost:3008/baseball?page=1
GET    http://localhost:3008/health
```

**분석 제공 정보**:
- timeline: 시간대별 게시물 분포
- keywords: 핵심 키워드 추출 (상위 5개)
- categories: 게시물 카테고리 자동 분류
- participation: 사용자 참여도 (추천, 댓글)
- topPosts: 상위 조회 게시물

---

## 🤖 Claude Code 스킬

### /myawsdb - 데이터베이스 조회

```bash
/myawsdb query posts limit 10
```

**기능**:
- 테이블 데이터 조회
- SQL 쿼리 실행
- 구조 확인

---

### /myawsdb-export - 데이터 내보내기

```bash
/myawsdb-export posts csv limit=100
/myawsdb-export posts json limit=50
/myawsdb-export posts tsv limit=200
```

**기능**:
- CSV/JSON/TSV 형식 내보내기
- 자동 인코딩 (UTF-8 with BOM)
- 타임스탐프 파일명 자동 생성

**출력 예**:
- `posts_20260315_152400.csv`
- `posts_20260315_152400.json`

---

### /ppom - 게시판 분석

```bash
/ppom freeboard 1                      # 원본 데이터 조회
/ppom analyze freeboard 1              # 실시간 분석
```

**분석 결과**:
- 시간대별 분포 (피크 시간 분석)
- 핵심 키워드 추출
- 카테고리 자동 분류
- 참여도 통계

**분석 예시**:
```
[시간대별 분석]
19시: 18개 (60.0%) ← 피크 시간
20시: 12개

[핵심 키워드]
1. 트렌드 (3회)
2. 영화 (2회)

[카테고리]
기타: 18개 (60.0%)
연예/종교: 5개 (16.7%)
```

---

### /php-migrate - PHP 레거시 코드 마이그레이션

```bash
/php-migrate legacy-code.php
```

**기능**:
- PHP 5.6 코드를 현대적 문법으로 변환
- 자동 테스트 코드 생성
- 마이그레이션 가이드 제공

---

## 📊 데이터베이스 스키마

### posts 테이블 (43개 컬럼)

**메타데이터** (게시물 기본 정보)
```
no (PK)          - 게시물 번호
division         - 게시판 구분
depth           - 답글 깊이
father, child   - 부모/자식 번호
```

**사용자 정보**
```
name            - 작성자명
email           - 이메일
ip              - IP 주소
password        - 비밀번호
```

**통계**
```
hit             - 조회수
vote            - 추천수
total_comment   - 댓글 수
download1/2     - 다운로드 수
```

**시간정보**
```
reg_date        - 등록 시간 (timestamp)
read_date       - 읽은 날짜
comment_date    - 댓글 날짜
```

---

## 🧪 사용 예시

### 예시 1: 데이터베이스 쿼리

```bash
# posts 테이블 구조 확인
/myawsdb describe posts

# 상위 10개 게시물 조회
/myawsdb query posts limit 10

# 특정 데이터 삽입
/myawsdb insert posts {
  "name": "사용자",
  "subject": "제목",
  "memo": "내용"
}
```

### 예시 2: 게시판 분석

```bash
# freeboard 원본 데이터 조회
/ppom freeboard 1

# freeboard 상세 분석 (키워드, 통계)
/ppom analyze freeboard 1

# 다른 게시판 분석
/ppom baseball 1
/ppom stock 1
```

### 예시 3: 데이터 내보내기

```bash
# CSV로 내보내기
/myawsdb-export posts csv limit=100

# JSON으로 내보내기
/myawsdb-export posts json limit=50

# 뽐뿌 데이터 분석 후 내보내기
/ppom analyze freeboard 1           # 분석 수행
# 결과가 자동으로 JSON 파일로 저장됨
```

---

## 🔧 npm Scripts

```bash
# MCP 서버 실행
npm run myawsdb                    # myawsdb 서버 (포트 3010)
npm run ppom                       # ppomppu-crawler (포트 3008)

# 데이터 작업 스크립트
npm run fetch-freeboard            # 게시판 데이터 수집
npm run query-posts                # DB 쿼리 실행
npm run analyze-all                # 모든 데이터 분석

# 유틸리티
npm run status                     # 시스템 상태 확인
npm run help                       # 도움말
```

---

## 📈 현재 진행 상황

| 컴포넌트 | 상태 | 설명 |
|---------|------|------|
| **myawsdb** | ✅ 완성 | MySQL 쿼리/조작, inputSchema 포함 |
| **ppomppu-crawler** | ✅ 완성 | 4개 게시판 크롤링 + 분석 |
| **스킬 자동화** | ✅ 완성 | prompt 섹션으로 완전 자동화 |
| **데이터 내보내기** | ✅ 완성 | CSV/JSON/TSV 지원 |
| **PHP 마이그레이션** | ✅ 완성 | Legacy 코드 변환 |

---

## 🎯 주요 특징

✅ **완전 자동화**: Claude Code 스킬로 클릭 한 번에 실행
✅ **MCP 표준 준수**: inputSchema 포함, 모든 도구 문서화
✅ **Zero-Script QA**: Docker 로그 기반 자동 검증
✅ **HTTP 기반 통신**: curl로 직접 API 호출 가능
✅ **실시간 분석**: 게시판 데이터 수집 후 즉시 분석
✅ **다중 형식 지원**: CSV, JSON, TSV 동시 지원

---

## 💡 사용 사례

### 사례 1: 뽐뿌 게시판 모니터링
```
1. /ppom freeboard 1          → 최신 게시물 조회
2. /ppom analyze freeboard 1  → 트렌드 분석
3. 자동 리포트 생성
```

### 사례 2: 데이터 마이그레이션
```
1. /myawsdb query source_table limit 1000   → 소스 DB 조회
2. /myawsdb-export source_table csv         → CSV 내보내기
3. /myawsdb insert target_table {...}       → 대상 DB 삽입
```

### 사례 3: 레거시 코드 현대화
```
1. /php-migrate old_code.php                → PHP 5.6 → 현대 문법
2. 테스트 코드 자동 생성
3. 마이그레이션 가이드 제공
```

---

## 🛠️ 개발 환경 요구사항

- **Node.js**: 18+
- **npm**: 9+
- **MySQL**: 5.7+ (myawsdb 사용 시)
- **Claude Code**: 최신 버전

---

## 📚 문서

- **[API 명세](docs/API.md)** - 모든 엔드포인트 문서
- **[설계 문서](docs/02-design/)** - 기술 아키텍처
- **[게시판 추가 가이드](docs/ADDING_MORE_BOARDS.md)** - 새로운 크롤러 추가
- **[PDCA 인덱스](docs/PDCA-INDEX.md)** - 프로젝트 진행 현황

---

## 🌟 핵심 기술

- **Model Context Protocol (MCP)**: 자동화 연동 표준
- **Node.js + Express**: HTTP 기반 MCP 서버
- **MySQL 2**: 데이터베이스 커넥션 풀
- **Claude Code**: AI 기반 자동화
- **curl + JSON**: 간단한 HTTP 통신

---

## 📝 라이선스

MIT

---

## 👨‍💻 개발자

- **프로젝트 시작**: 2026-03-13
- **마지막 업데이트**: 2026-03-15
- **주요 기여**: Claude (AI-assisted development)

---

## 🚀 다음 단계

- [ ] 추가 게시판 크롤러 (Reddit, HN, etc.)
- [ ] 실시간 알림 시스템
- [ ] 데이터 시각화 대시보드
- [ ] REST API 게이트웨이
- [ ] GraphQL 지원

---

**GitHub**: https://github.com/iloveaired9/ppom_mcp
