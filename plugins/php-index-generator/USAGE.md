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
- PHP 5.7 이상 (색인 대상)

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

#### 출력 예제

```
🔍 PHP Index Generator - Build

📂 소스 디렉토리: work/mobile
📁 출력 위치: plugins/php-index-generator/output

🔄 캐시 로드 중... ✓
📋 PHP 파일 수집 중... ✓ (245개 파일)
🔍 변경 파일 필터링 중... ✓ (12개 파일 변경됨)

🔨 파일 처리 중:
  ✓ app/Models/User.php (3 클래스, 15 메서드)
  ✓ app/Controllers/UserController.php (1 클래스, 8 메서드)
  ✓ app/Services/UserService.php (1 클래스, 12 메서드)
  ... (12개 파일 총 처리)

🧬 심볼 병합 중... ✓
💾 색인 저장 중... ✓
🗄️  캐시 업데이트 중... ✓

✅ 완료!
  • 처리 파일: 12개
  • 추가 심볼: 87개
  • 제거 심볼: 5개
  • 총 심볼: 3421개
  • 소요 시간: 2.5초
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
# 클래스 검색
npm run php:index:search -- --symbol "User" --type "class"

# 메서드 검색
npm run php:index:search -- --symbol "create" --type "method" --limit 20

# 특정 네임스페이스 내 검색
npm run php:index:search -- \
  --symbol "Controller" \
  --namespace "App\\Http\\Controllers" \
  --type "class"
```

#### 출력 예제

```
🔍 검색: "User" (타입: 모든 타입)

📌 결과 (6개 발견, 상위 10개 표시):

1. App\Models\User (class)
   📄 work/mobile/app/Models/User.php:12
   👨 Members: 15 메서드, 5 속성
   📏 Score: 1.0 (정확 일치)

2. App\Factories\UserFactory (class)
   📄 work/mobile/database/factories/UserFactory.php:8
   👨 Members: 3 메서드
   📏 Score: 0.9

3. UserController (class)
   📄 work/mobile/app/Http/Controllers/UserController.php:15
   👨 Members: 8 메서드
   📏 Score: 0.85

... (계속)

💡 힌트: 더 자세한 정보는 'npm run php:index:info'를 사용하세요.
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

### 시나리오 1: Laravel 프로젝트 시작

```bash
# 1. 초기 색인 생성
npm run php:index:build -- \
  --source work/mobile/app \
  --exclude "*/migrations/*" \
  --exclude "*/seeders/*" \
  --force

# 2. 모델 찾기
npm run php:index:search -- \
  --namespace "App\\Models" \
  --type "class"

# 3. UserController 정보 조회
npm run php:index:info -- --symbol "App\\Http\\Controllers\\UserController"

# 4. 정의로 이동
npm run php:index:goto -- --symbol "UserController"
```

### 시나리오 2: 리팩토링 중 메서드 찾기

```bash
# 1. 사용되는 메서드 검색
npm run php:index:search -- --symbol "store" --type "method" --limit 20

# 2. 각 메서드의 정의 확인
npm run php:index:info -- --symbol "UserController::store"
npm run php:index:info -- --symbol "PostController::store"

# 3. 메서드 변경 시 영향도 분석
npm run php:index:list -- --type "method" --name "store"
```

### 시나리오 3: 새로운 팀원 온보딩

```bash
# 1. 전체 프로젝트 구조 파악
npm run php:index:info -- --status

# 2. 주요 네임스페이스 탐색
npm run php:index:list -- --namespace "App\\Models"
npm run php:index:list -- --namespace "App\\Controllers"

# 3. 특정 기능 찾기
npm run php:index:search -- --symbol "User" --type "class"
npm run php:index:goto -- --symbol "App\\Models\\User"
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

### 문제 1: 색인이 생성되지 않음

**증상**: `npm run php:index:build` 실행 후 색인 파일 없음

**해결책**:
```bash
# 1. 캐시 초기화
rm -rf .claude/php-index-cache

# 2. 강제 전체 색인화
npm run php:index:build -- --force --verbose

# 3. 소스 디렉토리 확인
ls -la work/mobile/app/*.php
```

### 문제 2: 검색 결과가 없음

**증상**: `npm run php:index:search -- --symbol "MyClass"` 결과 없음

**해결책**:
```bash
# 1. 색인 상태 확인
npm run php:index:info -- --status

# 2. 파일에 심볼이 있는지 확인
npm run php:index:list -- --file "app/Models/MyClass.php"

# 3. 전체 색인 재생성
npm run php:index:build -- --force

# 4. 정확 일치 아닌 부분 일치 시도
npm run php:index:search -- --symbol "MyClass" --exact false
```

### 문제 3: 성능 저하

**증상**: 색인 생성이 너무 오래 걸림

**해결책**:
```bash
# 1. 처리 파일 수 확인
npm run php:index:build -- --verbose

# 2. 불필요한 파일 제외
npm run php:index:build -- \
  --exclude "vendor/*" \
  --exclude "tests/*" \
  --exclude "node_modules/*"

# 3. 증분 색인 확인
npm run php:index:info -- --status

# 4. 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run php:index:build
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
