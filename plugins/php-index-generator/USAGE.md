# PHP Index Generator - 사용 설명서

## 📚 목차

1. [설치](#설치)
2. [CLI 사용법](#cli-사용법)
3. [고급 기능](#고급-기능)
4. [Claude Code 스킬 통합](#claude-code-스킬-통합)
5. [설정 파일](#설정-파일)
6. [예제 및 시나리오](#예제-및-시나리오)
7. [문제 해결](#문제-해결)

---

## 설치

### 요구사항
- Node.js 14.x 이상
- npm 또는 yarn
- PHP 5.6 이상 (색인 대상, 레거시 코드 지원)

### 설치 단계

```bash
# 1. 프로젝트 디렉토리에서
cd ppom_mcp

# 2. 플러그인 디렉토리 확인
ls -la plugins/php-index-generator/

# 3. npm 의존성 설치
npm install

# 4. 플러그인 초기화 (선택사항)
npm run php:index:init

# 5. 첫 번째 색인 생성
npm run php:index:build -- --source work/mobile --force
```

---

## CLI 사용법

### 1. 색인 생성 (Build)

#### 기본 사용법
```bash
# 기본 설정으로 색인 생성 (증분)
npm run php:index:build

# 특정 디렉토리 색인화
npm run php:index:build -- --source work/mobile/app

# 강제 전체 재색인화 (캐시 무시)
npm run php:index:build -- --force

# 출력 디렉토리 지정
npm run php:index:build -- --source work/mobile --output ./my-index
```

#### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--source <dir>` | 색인할 소스 디렉토리 | `work/mobile` |
| `--output <dir>` | 색인 파일 저장 위치 | `plugins/php-index-generator/output` |
| `--force` | 캐시 무시하고 전체 재색인 | `false` |
| `--exclude <pattern>` | 제외할 파일 패턴 (반복 가능) | `vendor/*` |
| `--include <pattern>` | 포함할 파일 패턴 (반복 가능) | `**/*.php` |
| `--verbose` | 상세 로그 출력 | `false` |
| `--cache-dir <dir>` | 캐시 저장 위치 | `.claude/php-index-cache` |

#### 예제

```bash
# Laravel 프로젝트 색인화
npm run php:index:build -- \
  --source work/mobile/app \
  --exclude "*/migrations/*" \
  --exclude "*/seeders/*"

# 특정 네임스페이스만
npm run php:index:build -- \
  --source work/mobile \
  --include "app/Models/**" \
  --include "app/Controllers/**"

# 상세 로그와 함께
npm run php:index:build -- --verbose --force
```

#### 출력 예제 (실제)

```
🔍 PHP Index Generator - Build

📂 소스 디렉토리: work/mobile
📁 출력 위치: plugins/php-index-generator/output

📂 캐시 로드 중...
📋 PHP 파일 수집 중...
✓ 363개 파일 발견
🔄 변경된 파일 필터링 중...
✓ 1개 파일 변경됨

🔨 파일 처리 중 (1/363)...
  ✓ 1/363 파일 처리됨

✅ 색인 생성 완료!
  • 처리 파일: 363/363개
  • 총 심볼: 84개
  • 소요 시간: 0.29초
  • 모드: full
```

**증분 색인화 예제:**
```
🔄 변경된 파일 필터링 중...
✓ 1개 파일 변경됨
🔨 파일 처리 중 (1/363)...

✅ 색인 생성 완료!
  • 처리 파일: 1개 (363개 중)
  • 소요 시간: 0.08초
  • 모드: incremental
```

---

### 2. 검색 (Search)

#### 기본 사용법
```bash
# 심볼 검색
npm run php:index:search -- --symbol "User"

# 네임스페이스 포함
npm run php:index:search -- --symbol "App\\Models\\User"

# 타입별 검색
npm run php:index:search -- --symbol "create" --type "method"

# 정확 일치
npm run php:index:search -- --symbol "UserController" --exact
```

#### 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--symbol <name>` | 검색할 심볼명 | 필수 |
| `--type <type>` | 심볼 타입 필터 | 모든 타입 |
| `--exact` | 정확 일치만 | `false` |
| `--limit <n>` | 결과 개수 제한 | `10` |
| `--namespace <ns>` | 네임스페이스 필터 | - |

#### 예제

```bash
# NoticeAd 클래스 검색
npm run php:index:search -- --symbol "NoticeAd" --type "class"

# send_header 함수 검색
npm run php:index:search -- --symbol "send_header" --type "function"

# 부분 일치 (오타 자동 수정)
npm run php:index:search -- --symbol "NoticeAd" --limit 5
```

**참고:** PHP 5.6 코드이므로 네임스페이스가 없고, FQCN 형식은 `filename::symbol` 입니다

#### 출력 예제 (실제)

```
🔍 검색: "NoticeAd"

📌 결과 (10개 발견):

1. NoticeAd (class)
   📄 work\mobile\include\libraries\notice_ad.class.php:4
   📏 점수: 90%

2. send_header (function)
   📄 work\mobile\api\gcm\etc_alarm.php:3
   📏 점수: 0%

3. send_header (function)
   📄 work\mobile\api\gcm\hot_article.php:3
   📏 점수: 0%

... (계속)

💡 정확 일치 검색: npm run php:index:search -- --symbol "NoticeAd" --exact
```

---

### 3. 상세 정보 (Info)

```bash
# 심볼 상세 정보 조회
npm run php:index:info -- --symbol "App\\Models\\User"

# 파일의 모든 심볼
npm run php:index:info -- --file "app/Models/User.php"

# 네임스페이스 정보
npm run php:index:info -- --namespace "App\\Models"

# 색인 상태
npm run php:index:info -- --status
```

#### 출력 예제

```
📋 심볼 정보: App\Models\User

📄 파일: work/mobile/app/Models/User.php
📍 라인: 12
📦 네임스페이스: App\Models
🔗 상속: Model
✅ 인터페이스: Authenticatable, Arrayable

🔧 메서드:
  • public create(array $attributes): User (45줄)
  • public update(array $attributes): User (78줄)
  • public delete(): bool (95줄)
  • protected fillable(): array (102줄)
  ... (12개 더)

🏷️ 속성:
  • protected $table: string (20줄)
  • protected $fillable: array (25줄)
  • protected $hidden: array (30줄)
  ... (5개 더)

⏱️ 색인 생성: 2026-03-16 07:30:00
```

---

### 4. 목록 (List)

```bash
# 파일의 모든 심볼
npm run php:index:list -- --file "app/Models/User.php"

# 네임스페이스의 모든 심볼
npm run php:index:list -- --namespace "App\\Models"

# 타입별 목록
npm run php:index:list -- --type "class"

# 전체 심볼 목록 (CSV)
npm run php:index:list -- --output "symbols.csv" --format "csv"
```

---

### 5. 정의로 이동 (Goto)

```bash
# 정의 위치 찾기
npm run php:index:goto -- --symbol "UserController"

# 메서드 정의 찾기
npm run php:index:goto -- --symbol "App\\Models\\User::create"

# JSON 형식 출력
npm run php:index:goto -- --symbol "User" --format "json"
```

#### 출력 예제

```json
{
  "symbol": "App\\Models\\User",
  "type": "class",
  "file": "work/mobile/app/Models/User.php",
  "line": 12,
  "column": 7,
  "namespace": "App\\Models",
  "extends": "Model",
  "implements": ["Authenticatable"],
  "url": "file://work/mobile/app/Models/User.php:12"
}
```

---

## 고급 기능

### 증분 색인화

```bash
# 기본: 변경된 파일만 재색인
npm run php:index:build
# → 캐시에서 해시 확인, 변경된 파일만 파싱
# → 12개 변경됨 → 2.5초

# 강제 전체 재색인
npm run php:index:build -- --force
# → 모든 파일 파싱
# → 245개 모두 처리 → 15초
```

### 네임스페이스 검색

```bash
# App\Models 네임스페이스의 모든 클래스
npm run php:index:search -- \
  --namespace "App\\Models" \
  --type "class"

# App\Services 하위의 모든 메서드
npm run php:index:search -- \
  --namespace "App\\Services" \
  --type "method"
```

### 부분 일치 및 퍼지 검색

```bash
# 부분 일치 (마지막 부분)
npm run php:index:search -- --symbol "User"
# → App\Models\User, UserFactory, UserController 등

# 정확 일치만
npm run php:index:search -- --symbol "User" --exact
# → User 클래스만

# 퍼지 매칭 (오타 자동 수정)
npm run php:index:search -- --symbol "UserControler"  # 'r' 빠짐
# → UserController 제안 (score: 0.95)
```

---

## SQLite 기반 인덱싱 (개선사항)

### 저장소 구조

색인은 SQLite 데이터베이스와 JSON 파일 두 곳에 저장됩니다:

```
output/
├── index.db       # SQLite (영구 저장소)
│   ├── symbols    # 심볼 정보 (FQCN, 파일, 라인, JSON)
│   ├── files      # 파일 정보 (경로, 상대경로, 해시, 심볼 목록)
│   └── dependencies # 파일 의존성
├── index.db-shm   # WAL 공유 메모리
├── index.db-wal   # WAL 로그
└── index.json     # JSON 내보내기 (검색 전용)
```

### 배치 처리 메커니즘

```javascript
// BATCH_SIZE = 1 (파일당 즉시 저장)
const BATCH_SIZE = 1;

// 처리 흐름
1. 파일 읽기
2. PHP 파싱 → 심볼 추출
3. SQLite INSERT (즉시)
4. 메모리 해제 (GC)
5. 다음 파일로 진행
```

### 메모리 최적화

```bash
# 대용량 인덱싱 (1,000+ 파일)
NODE_OPTIONS="--max-old-space-size=8192" npm run php:index:build

# 또는 설정 파일 (package.json scripts)
"php:index:build": "node --max-old-space-size=8192 plugins/php-index-generator/index.js build"
```

### 동시성 (WAL 모드)

SQLite WAL (Write-Ahead Logging) 모드로 인덱싱 중에도 검색 가능:

```bash
# 터미널 1: 인덱싱 진행
npm run php:index:build

# 터미널 2: 동시에 검색 가능 (WAL 모드 덕분)
npm run php:index:search -- --symbol "User"
```

---

## Claude Code 스킬 통합

### 스킬 등록

```bash
# 스킬 자동 등록
npm run php:index:install-skill

# 또는 수동으로 .claude/skills/php-index/SKILL.md 생성
# (아래 참조)
```

### 스킬 사용

```
/php-index help                    # 도움말
/php-index build                   # 색인 생성
/php-index search User             # 검색
/php-index goto App\Models\User    # 정의로 이동
/php-index info UserController     # 정보 조회
```

### 스킬 파일 구조

```markdown
---
name: PHP Index Generator
description: PHP 코드 색인 및 Go to Definition
---

# PHP Index Generator 스킬

## 사용법

/php-index <command> [args]

## 명령어

- build: 색인 생성
- search: 심볼 검색
- goto: 정의로 이동
```

---

## 설정 파일

### .phpindexrc (프로젝트 루트)

```json
{
  "source": "work/mobile",
  "output": "plugins/php-index-generator/output",

  "excludePatterns": [
    "vendor/",
    "node_modules/",
    "tests/",
    "*.test.php",
    "*.tmp.php",
    ".git/"
  ],

  "includePatterns": [
    "app/**/*.php",
    "src/**/*.php",
    "config/**/*.php",
    "database/**/*.php"
  ],

  "cacheDir": ".claude/php-index-cache",
  "incremental": true,
  "followSymlinks": false,

  "parser": {
    "encoding": "utf-8",
    "strictMode": false
  }
}
```

### 환경 변수

```bash
# .env 파일
PHP_INDEX_SOURCE=work/mobile
PHP_INDEX_OUTPUT=plugins/php-index-generator/output
PHP_INDEX_CACHE_DIR=.claude/php-index-cache
PHP_INDEX_VERBOSE=true
```

---

## 예제 및 시나리오

### 시나리오 1: 레거시 PHP 프로젝트 시작

```bash
# 1. 초기 색인 생성
npm run php:index:build -- \
  --source work/mobile \
  --force --verbose

# 2. 전체 클래스 찾기
npm run php:index:list -- --type "class"

# 3. NoticeAd 클래스 정보 조회
npm run php:index:info -- --symbol "NoticeAd"

# 4. 정의 위치 찾기 (파일 및 라인 번호)
npm run php:index:goto -- --symbol "NoticeAd"
```

### 시나리오 2: 함수/메서드 호출 추적

```bash
# 1. Helper 클래스의 메서드 찾기
npm run php:index:search -- --symbol "cache_get" --type "function" --limit 10

# 2. 메서드의 정의 확인
npm run php:index:goto -- --symbol "cache_get"

# 3. 파일별 함수 목록
npm run php:index:list -- --file "work/mobile/include/libraries/notice_ad.class.php"
```

### 시나리오 3: 새로운 팀원 온보딩

```bash
# 1. 전체 프로젝트 색인 상태 파악
npm run php:index:info -- --status

# 2. 주요 클래스 탐색
npm run php:index:list -- --type "class"

# 3. 특정 클래스 상세 정보
npm run php:index:search -- --symbol "NoticeAd"
npm run php:index:goto -- --symbol "NoticeAd"
npm run php:index:info -- --symbol "NoticeAd"
```

### 시나리오 4: 자동화 스크립트

```bash
# #!/bin/bash
# rebuild-index.sh

echo "🔍 PHP 색인 재생성 중..."

npm run php:index:build -- \
  --source work/mobile \
  --verbose \
  --force

if [ $? -eq 0 ]; then
  echo "✅ 색인 생성 완료"
  npm run php:index:info -- --status
else
  echo "❌ 색인 생성 실패"
  exit 1
fi
```

---

## 문제 해결

### 문제 1: 파일 변경이 감지되지 않음

**증상**: 파일을 수정했으나 색인이 업데이트되지 않음

**원인**: SHA256 해시 캐시와 현재 파일의 해시가 다를 때 변경으로 감지됨

**해결책**:
```bash
# 1. 캐시 초기화 (모든 파일을 다시 색인)
rm -rf .claude/php-index-cache

# 2. 강제 전체 색인화
npm run php:index:build -- --force --verbose

# 3. 색인 상태 확인
npm run php:index:info -- --status
```

### 문제 2: 검색 결과가 없음

**증상**: `npm run php:index:search -- --symbol "NoticeAd"` 결과 없음

**원인:**
- 색인이 생성되지 않음
- 심볼이 파일에 없음 (파싱 실패)
- FQCN 형식이 다름 (PHP 5.6은 `filename::symbol` 형식)

**해결책**:
```bash
# 1. 색인 상태 확인
npm run php:index:info -- --status

# 2. 해당 파일의 심볼 목록 확인
npm run php:index:list -- --file "work/mobile/include/libraries/notice_ad.class.php"

# 3. 전체 클래스 목록 확인
npm run php:index:list -- --type "class"

# 4. 파일이 처리되지 않았으면 강제 재색인
npm run php:index:build -- --force --verbose
```

### 문제 3: 성능 및 메모리

**증상**: 색인 생성이 느리거나 메모리 부족

**개선된 성능 지표** (SQLite 배치 처리):
- 전체 색인: ~2-3초 (1,887개 파일, ppomppu)
- 증분 색인: <1초 (변경 파일만)
- 메모리 사용: ~20-50MB (대규모 프로젝트)
- SQLite DB 크기: ~11MB (2308개 심볼)

**최적화 기법**:
```bash
# 1. 현재 색인 상태 확인
npm run php:index:info -- --status

# 2. SQLite + JSON 병렬 사용
#    - SQLite: 저장소 (영구성)
#    - JSON: 검색용 (메모리 효율)

# 3. 증분 색인 사용 (권장)
npm run php:index:build
# → 변경된 파일만 배치 처리하여 빠름

# 4. 메모리 최적화 (필요시)
NODE_OPTIONS="--max-old-space-size=8192" npm run php:index:build

# 5. 배치 크기 조정 (lib/IndexBuilder.js)
# BATCH_SIZE = 1  (파일당 즉시 저장)
# GC 트리거 = 파일 > 1MB 후 자동 GC
```

**SQLite WAL 모드 (기본)**:
```
- WAL 모드로 동시성 향상
- index.db-shm, index.db-wal (임시 파일)
- 색인 완료 후 자동 정리
```

### 문제 4: 잘못된 심볼 추출

**증상**: 주석의 메서드명이 심볼로 인식됨

**해결책**: 파싱 규칙이 주석 라인을 걸러내야 함 (이미 구현됨)

```bash
# 디버깅
npm run php:index:build -- \
  --file "app/Models/User.php" \
  --verbose

# 파일 재검사
npm run php:index:list -- --file "app/Models/User.php"
```

---

## 📞 지원

질문이나 버그 리포트는 프로젝트 이슈 추적 시스템에 등록해주세요.
