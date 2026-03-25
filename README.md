# PPOM MCP - 데이터 자동화 플랫폼

> Model Context Protocol 기반의 MySQL 데이터베이스 조작 및 웹 크롤링 자동화 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-9+-blue)](https://www.npmjs.com/)

---

## 🎯 주요 기능

| 기능 | 설명 | 포트 |
|------|------|------|
| **ppomppu-crawler** | 뽐뿌 게시판 크롤링 및 실시간 분석 | 3008 |
| **myawsdb** | MySQL 데이터베이스 CRUD 작업 | 3010 |
| **php-code-migrator** | PHP 5.6 레거시 코드 자동 변환 | - |
| **claude-skills** | Claude Code 자동화 스킬 4개 | - |

---

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 설정
```bash
cp .env.example .env
# .env 파일에서 데이터베이스 정보 설정
```

### 3. 서버 시작
```bash
# 뽐뿌 크롤러 (포트 3008)
npm run ppom

# MySQL 데이터베이스 (포트 3010)
npm run myawsdb
```

✅ **완료**: Claude Code에서 스킬 자동 감지됨

---

## 📋 프로젝트 구조

```
ppom_mcp/
├── mcp-servers/              # MCP 서버 구현
│   ├── ppomppu-crawler/      # 뽐뿌 크롤러 (포트 3008)
│   └── myawsdb.js            # MySQL 데이터베이스 (포트 3010)
│
├── .claude/skills/           # Claude Code 자동화 스킬
│   ├── myawsdb/              # DB 쿼리 스킬
│   ├── myawsdb-export/       # 데이터 내보내기 (CSV/JSON/TSV)
│   ├── php-migrate/          # PHP 코드 마이그레이션
│   └── ppom/                 # 뽐뿌 분석 스킬
│
├── plugins/                  # 플러그인 시스템
│   └── php-code-migrator/    # PHP 레거시 변환 플러그인
│
├── scripts/                  # 유틸리티 스크립트
│   ├── fetch-freeboard.js    # 게시판 데이터 수집
│   └── analyze-*.js          # 데이터 분석
│
└── docs/                     # 상세 문서
    ├── API.md                # API 명세서
    ├── ADDING_MORE_BOARDS.md # 게시판 추가 가이드
    └── 02-design/            # 기술 설계 문서
```

---

## 🔌 MCP 서버 상세

### ppomppu-crawler (포트 3008)
뽐뿌 게시판 데이터 수집 및 실시간 분석

```bash
# 원본 데이터 조회
/ppom freeboard 1

# 상세 분석 (키워드, 통계)
/ppom analyze freeboard 1

# 지원 게시판
/ppom baseball 1              # 야구 게시판
/ppom stock 1                 # 주식 게시판
/ppom ppomppu 1               # 뽐뿌 일반
```

**분석 제공 정보**:
- 📊 시간대별 게시물 분포
- 🔑 핵심 키워드 자동 추출
- 📁 게시물 카테고리 자동 분류
- 👥 사용자 참여도 통계
- ⭐ 상위 조회 게시물

---

### myawsdb (포트 3010)
MySQL 데이터베이스 CRUD 작업

```bash
# 데이터 조회
/myawsdb query posts limit 10

# 테이블 구조 확인
/myawsdb describe posts

# 데이터 삽입
/myawsdb insert posts {"name": "사용자", "subject": "제목"}

# 데이터 수정
/myawsdb update posts {...}

# 데이터 삭제
/myawsdb delete posts id=1
```

**지원 작업**:
- ✅ SELECT / INSERT / UPDATE / DELETE
- ✅ 테이블 구조 확인 (DESCRIBE)
- ✅ 모든 테이블 조회
- ✅ inputSchema 포함 (완전 MCP 표준)

---

## 🤖 Claude Code 스킬

### /myawsdb - 데이터베이스 쿼리
```bash
/myawsdb query posts limit 10
```
테이블 데이터 조회, SQL 쿼리 실행, 구조 확인

### /myawsdb-export - 데이터 내보내기
```bash
/myawsdb-export posts csv limit=100
/myawsdb-export posts json limit=50
/myawsdb-export posts tsv limit=200
```
CSV, JSON, TSV 형식 자동 변환 내보내기

### /ppom - 게시판 분석
```bash
/ppom freeboard 1              # 원본 데이터
/ppom analyze freeboard 1      # 상세 분석
```
실시간 게시판 분석 및 키워드 추출

### /php-migrate - PHP 레거시 변환
```bash
/php-migrate legacy-code.php
```
PHP 5.6 코드를 현대 문법으로 자동 변환

### /php-string-search - PHP 문자열 검색 ⭐ **NEW**
```bash
/php-string-search "옥션 책 정보"
/php-string-search "get_url_data" --type function-content
/php-string-search "TODO" --type comment --limit 50
```
PHP 코드에서 특정 문자열을 검색하여 위치, 함수명, 의존성 표시

**기능**:
- 📄 문자열 리터럴 검색
- 🔗 함수 자동 파악
- 👥 의존성 정보 표시
- 💾 색인화로 빠른 검색

---

## 🔍 PHP 코드 분석 & 쿼리 추출

### /php-index - PHP 심볼 색인 생성
PHP 파일의 함수, 클래스, 변수 등을 색인화하여 빠른 검색 가능

```bash
# 색인 생성 (필수!)
/php-index build --source work/mobile --force

# 색인 검색
/php-index search get_user

# 심볼 정보 조회
/php-index info get_user

# 의존성 분석
/php-index deps my_function
```

**주요 기능**:
- 🔍 심볼 검색 (함수, 클래스)
- 📊 의존성 분석 (호출 관계)
- 🔗 참조 추적 (어디서 호출되는지)
- 📋 구조 분석 (파일 구성)

---

### /php-query - SQL 쿼리 자동 추출
PHP 파일에서 SQL 쿼리를 자동으로 찾아 마크다운 테이블로 표시

```bash
# 쿼리 추출 (색인 필수)
/php-query work/mobile/ppomppu/books/get_price.php

# 결과 예시:
# | # | 함수명 | 라인번호 | SQL 쿼리 |
# |----|--------|---------|---------|
# | 1 | getPrice() | 12-25 | SELECT * FROM products WHERE id=? |
# | 2 | updatePrice() | 30-45 | UPDATE products SET price=? WHERE id=? |
```

**추출 대상**:
- ✅ SELECT 쿼리
- ✅ INSERT 쿼리
- ✅ UPDATE 쿼리
- ✅ DELETE 쿼리
- ✅ JOIN, UNION 등 복합 쿼리

**활용 사례**:
- 📊 **성능 분석** - 최적화할 쿼리 식별
- 🔗 **의존성 분석** - 테이블 사용 범위 파악
- 🔒 **보안 감사** - SQL 인젝션 취약점 찾기
- 🔄 **마이그레이션** - 레거시 코드 쿼리 패턴 분석

---

## 📊 대시보드

### PHP Index Dashboard (포트 3012)
PHP 파일의 심볼, 의존성, 쿼리를 시각화하는 웹 대시보드

```bash
# 대시보드 시작
npm run php:dashboard

# 개발 모드 (자동 새로고침)
npm run php:dashboard:dev
```

**접속 주소**: http://localhost:3012

**기능**:
- 🔍 심볼 검색 UI
- 📊 의존성 그래프
- 🔗 참조 관계 시각화
- 📋 쿼리 목록
- 💡 코드 인텔리센스

---

### System Dashboard (포트 3000)
시스템 전체 상태 및 성능 모니터링

```bash
npm run dashboard
```

**접속 주소**: http://localhost:3000

---

## 🔄 PHP 코드 분석 워크플로우

### 단계 1: 색인 생성
```bash
npm run php:index:build -- --source work/mobile --force
```
- 📂 소스 디렉토리의 모든 PHP 파일 스캔
- 🔍 함수, 클래스, 변수 추출
- 📊 의존성 그래프 생성
- 💾 색인 저장

### 단계 2: 쿼리 추출
```bash
/php-query work/mobile/ppomppu/books/get_price.php
```
- 📋 파일의 모든 SQL 쿼리 찾기
- 🔢 라인 번호 및 함수명 표시
- 📊 마크다운 테이블 형식 출력
- 💡 쿼리 패턴 분석

### 단계 3: 대시보드에서 시각화
```bash
npm run php:dashboard
```
- 🌐 브라우저 접속: http://localhost:3012
- 🔍 심볼 검색
- 📊 의존성 그래프 확인
- 💡 코드 구조 파악

---

## ⚙️ npm Scripts

```bash
# MCP 서버 실행
npm run ppom                          # ppomppu-crawler (포트 3008)
npm run myawsdb                       # myawsdb (포트 3010)

# PHP 코드 분석 (색인 생성)
npm run php:index:build               # 심볼 색인 생성
npm run php:index:search              # 심볼 검색
npm run php:index:deps                # 의존성 분석

# PHP 문자열 검색 ⭐ NEW
npm run php:string:search search "옥션"         # 문자열 검색
npm run php:string:index                        # 문자열 색인 생성
npm run php:string:analyze                      # 색인 분석
npm run php:string:list                         # 색인된 문자열 목록

# 대시보드
npm run dashboard                     # System Dashboard (포트 3000)
npm run php:dashboard                 # PHP Index Dashboard (포트 3012)
npm run php:dashboard:dev             # PHP Dashboard (개발 모드)

# 데이터 작업
npm run fetch-freeboard               # 게시판 데이터 수집
npm run analyze-all                   # 모든 데이터 분석
npm run query-posts                   # DB 쿼리

# 유틸리티
npm run status                        # 시스템 상태 확인
npm run help                          # 도움말
npm run build                         # 빌드
npm run test                          # 테스트
```

---

## 📚 상세 문서

### MCP 서버 & 대시보드
| 문서 | 내용 |
|------|------|
| [API 명세](docs/API.md) | 모든 엔드포인트 및 파라미터 문서 |
| [게시판 추가 가이드](docs/01-overview/ADDING_MORE_BOARDS.md) | 새로운 크롤러 추가하기 |

### PHP 코드 분석
| 문서 | 내용 |
|------|------|
| [.claude/skills/php-query/](\.claude/skills/php-query/) | PHP 쿼리 추출 스킬 가이드 |
| [.claude/skills/php-index/](\.claude/skills/php-index/) | PHP 색인 생성 스킬 가이드 |
| [plugins/php-code-migrator/README.md](plugins/php-code-migrator/README.md) | PHP 코드 마이그레이션 플러그인 |

### 기술 & 현황
| 문서 | 내용 |
|------|------|
| [기술 설계](docs/02-design/) | 아키텍처 및 설계 문서 |
| [프로젝트 현황](docs/01-overview/PROJECT_STATUS.md) | 완료된 작업 및 진행 상황 |
| [PDCA 인덱스](docs/01-overview/PDCA-INDEX.md) | 프로젝트 체계 및 진행 |

---

## 🛠️ 기술 스택

| 항목 | 기술 |
|------|------|
| **런타임** | Node.js 18+ |
| **웹 프레임워크** | Express.js |
| **HTML 파싱** | Cheerio |
| **DB 드라이버** | mysql2 |
| **인코딩** | iconv-lite (UTF-8, UTF-16, EUC-KR) |
| **자동화** | Claude Code + MCP |

---

## 📊 현재 상태

### MCP 서버 & 스킬
| 컴포넌트 | 상태 | 설명 |
|---------|------|------|
| **ppomppu-crawler** | ✅ 완성 | 4개 게시판 크롤링 + 분석 |
| **myawsdb** | ✅ 완성 | MySQL CRUD, inputSchema 포함 |
| **스킬 자동화** | ✅ 완성 | 4개 스킬 완전 자동화 |
| **데이터 내보내기** | ✅ 완성 | CSV/JSON/TSV 지원 |
| **PHP 마이그레이션** | ✅ 완성 | EUC-KR 인코딩 지원 |

### PHP 코드 분석 & 대시보드
| 컴포넌트 | 상태 | 설명 |
|---------|------|------|
| **php-index** | ✅ 완성 | PHP 심볼 색인 및 의존성 분석 |
| **php-query** | ✅ 완성 | SQL 쿼리 자동 추출 |
| **PHP Dashboard** | ✅ 완성 | 심볼, 의존성, 쿼리 시각화 (포트 3012) |
| **System Dashboard** | ✅ 완성 | 시스템 상태 모니터링 (포트 3000) |

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
2. 자동으로 클래스 생성 및 문서화
3. 151개 함수 → 151개 클래스 변환 (예: lib.php)
```

### 사례 4: PHP 코드 SQL 쿼리 분석
```
1. npm run php:index:build --source work/mobile --force    → 색인 생성
2. /php-query work/mobile/ppomppu/books/get_price.php      → 쿼리 추출
3. npm run php:dashboard                                    → 대시보드에서 시각화
4. 마크다운 테이블로 모든 쿼리 확인 및 최적화
```

### 사례 5: 데이터베이스 성능 감사
```
1. /php-query api/member.php              → 회원 관련 쿼리 추출
2. /php-query api/post.php                → 게시물 관련 쿼리 추출
3. 추출된 쿼리로 성능 최적화 포인트 식별
4. 인덱스 추가 또는 쿼리 개선
```

---

## 🎯 주요 특징

✅ **완전 자동화**: Claude Code 스킬로 클릭 한 번에 실행
✅ **MCP 표준 준수**: inputSchema 포함, 모든 도구 문서화
✅ **다중 인코딩**: UTF-8, UTF-16, EUC-KR 자동 감지 및 보존
✅ **HTTP API**: curl로 직접 API 호출 가능
✅ **실시간 분석**: 게시판 데이터 수집 후 즉시 분석
✅ **다중 형식 지원**: CSV, JSON, TSV 동시 지원

---

## 📋 요구사항

- **Node.js**: 18.0.0+
- **npm**: 9.0.0+
- **MySQL**: 5.7+ (myawsdb 사용 시, 선택사항)
- **Claude Code**: 최신 버전

---

## 📝 라이선스

MIT License - 자유로운 사용, 수정, 배포 가능

---

## 🔗 링크

- **GitHub**: https://github.com/iloveaired9/ppom_mcp
- **API 명세**: `docs/API.md`
- **설계 문서**: `docs/02-design/`
- **프로젝트 현황**: `docs/01-overview/PROJECT_STATUS.md`

---

## 👨‍💻 개발 정보

| 항목 | 정보 |
|------|------|
| **프로젝트 시작** | 2026-03-13 |
| **마지막 업데이트** | 2026-03-25 |
| **주요 기여** | Claude (AI-assisted development) |
| **상태** | 🟢 정상 운영 중 |

---

**문제 해결 팁**: 서버가 실행되지 않으면 포트 충돌 확인 또는 `.env` 파일 설정을 확인하세요.

