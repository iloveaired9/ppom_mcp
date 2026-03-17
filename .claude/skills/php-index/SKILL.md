---
name: PHP Index Generator
description: PHP 코드 색인화, 심볼 검색, 고급 의존성 분석 (PHP 5.6 특화)
---

# PHP Index Generator 스킬

PHP 소스 코드를 색인화하고 함수, 클래스, 메서드를 빠르게 검색할 수 있는 스킬입니다. 고급 의존성 분석 기능으로 순환 호출, 호출 경로, 영향도를 분석할 수 있습니다.

## 🎯 핵심 기능

| 기능 | 명령어 | 용도 |
|------|--------|------|
| **기본 색인** | `build` | 363개 PHP 파일 색인화 |
| **심볼 검색** | `search` | 함수/클래스/메서드 찾기 |
| **정의 위치** | `goto` | 심볼 정의 파일과 줄 번호 |
| **심볼 정보** | `info` | 심볼의 상세 정보 조회 |
| **목록 조회** | `list` | 파일/타입별 심볼 목록 |
| 🆕 **순환 의존성** | `deps --circular` | 순환 호출 패턴 검출 |
| 🆕 **호출 경로 추적** | `deps --trace` | 함수의 전체 호출 트리 시각화 |
| 🆕 **호출 깊이** | `deps --depth` | 최대 호출 중첩 깊이 분석 |
| 🆕 **호출자 분석** | `deps --callers` | 특정 함수를 호출하는 모든 함수 |

## 사용법

```
/php-index <command> [options]
```

## 명령어

### build - 색인 생성

PHP 파일 색인을 생성하거나 업데이트합니다.

```bash
/php-index build --source work/mobile --force --verbose
```

**옵션:**
- `--source <dir>` - 소스 디렉토리 (기본: work/mobile)
- `--output <dir>` - 출력 디렉토리 (기본: plugins/php-index-generator/output)
- `--force` - 강제 전체 재색인화
- `--verbose` - 상세 로그 출력
- `--cache-dir <dir>` - 캐시 디렉토리

---

### search - 심볼 검색

PHP 코드에서 함수, 클래스, 메서드를 검색합니다.

```bash
/php-index search --symbol "Helper" --type class
/php-index search --symbol "cache_get" --type function
```

**옵션:**
- `--symbol <name>` - 검색할 심볼명 (필수)
- `--type <type>` - 심볼 타입 (class, function, method, property)
- `--exact` - 정확 일치만
- `--limit <n>` - 결과 개수 제한 (기본: 10)

**지원하는 검색 방식:**
- 정확 일치: `App::ClassName`
- 부분 일치: `ClassName` → 모든 ClassName 찾기
- 퍼지 매칭: 오타 자동 수정

---

### info - 심볼 정보 조회

심볼의 상세 정보를 조회합니다.

```bash
/php-index info --symbol "Helper::cache_get"
/php-index info --status
```

**옵션:**
- `--symbol <name>` - 조회할 심볼명
- `--file <path>` - 파일별 심볼 목록
- `--namespace <ns>` - 네임스페이스별 조회
- `--status` - 색인 상태 조회

---

### list - 심볼 목록

파일 또는 타입별 심볼 목록을 표시합니다.

```bash
/php-index list --file "lotto/index.php"
/php-index list --type class --limit 50
```

**옵션:**
- `--file <path>` - 파일별 심볼 목록
- `--type <type>` - 타입별 심볼 목록 (class, function, method, etc)

---

### goto - 정의 위치 찾기

심볼의 정의 위치(파일, 라인번호)를 찾습니다.

```bash
/php-index goto --symbol "Helper::cache_get"
/php-index goto --symbol "Helper::cache_get" --format json
```

**옵션:**
- `--symbol <name>` - 심볼명 (필수)
- `--format <format>` - 출력 형식 (json, plain)

---

### deps - 고급 의존성 분석 🔍

함수/클래스 간의 복잡한 의존성 관계를 분석합니다. 콜 그래프(Call Graph) 기반 정적 분석으로 호출 흐름, 순환 의존성, 깊이 분석을 제공합니다.

#### 순환 의존성 검출 (Circular Dependencies)

코드에서 순환 호출 관계(A→B→C→A)를 찾습니다. 순환 의존성은 리팩토링이 필요한 코드 스멜입니다.

```bash
/php-index deps --circular
/php-index deps --circular --verbose
```

**옵션:**
- `--circular` - 모든 순환 의존성 표시
- `--verbose` - 순환 경로 상세 정보 출력

**출력 예:**
```
🔴 순환 의존성 감지: 3개 사이클 찾음

사이클 #1:
  cache_get()
    → validate_cache()
    → update_cache()
    → cache_get()

사이클 #2:
  process_order()
    → calculate_total()
    → apply_discount()
    → process_order()
```

#### 호출 경로 추적 (Call Trace)

심볼의 전체 호출 트리를 시각화합니다. 함수가 어떤 함수들을 호출하는지 재귀적으로 표시합니다.

```bash
/php-index deps --trace "webp_getimagesize"
/php-index deps --trace "NoticeAd::getData" --max-depth 5
/php-index deps --trace "process_payment" --format json
```

**옵션:**
- `--trace <symbol>` - 추적할 심볼명 (필수)
- `--max-depth <n>` - 최대 깊이 (기본: 10)
- `--format <format>` - 출력 형식 (tree, json)

**출력 예:**
```
📞 호출 경로: webp_getimagesize

  webp_getimagesize()
  ├─ get_webp_info()
  │  ├─ parse_vp8_header()
  │  │  └─ read_file_header()
  │  └─ check_webp_signature()
  ├─ validate_dimensions()
  └─ cache_result()
```

**JSON 출력:**
```bash
/php-index deps --trace "getData" --format json
```

```json
{
  "symbol": "NoticeAd::getData",
  "root": {
    "name": "NoticeAd::getData",
    "depth": 0,
    "file": "work/mobile/new/m_header.php",
    "line": 156,
    "children": [
      {
        "name": "cache_get",
        "depth": 1,
        "direct_calls": 1
      },
      {
        "name": "db_query",
        "depth": 1,
        "direct_calls": 2
      }
    ]
  }
}
```

#### 호출 깊이 분석 (Call Depth)

심볼의 최대 호출 깊이를 계산합니다. 얼마나 깊게 중첩된 함수 호출이 있는지 파악합니다.

```bash
/php-index deps --depth "process_order"
/php-index deps --depth "PaymentProcessor::charge" --verbose
```

**옵션:**
- `--depth <symbol>` - 분석할 심볼명 (필수)
- `--verbose` - 깊이별 함수 목록 표시

**출력 예:**
```
📊 호출 깊이: process_order

  최대 깊이: 7

  깊이 0: process_order()
  깊이 1: validate_order(), calculate_total()
  깊이 2: check_inventory(), apply_discount()
  깊이 3: update_stock(), get_price_rules()
  깊이 4: cache_invalidate()
  깊이 5: log_transaction()
  깊이 6: send_notification()
  깊이 7: format_email()
```

#### 호출자 찾기 (Callers)

특정 심볼을 호출하는 모든 함수/메서드를 찾습니다. 특정 함수의 영향 범위를 파악할 때 유용합니다.

```bash
/php-index deps --callers "cache_get"
/php-index deps --callers "NoticeAd::getData"
/php-index deps --callers "update_database" --limit 20
```

**옵션:**
- `--callers <symbol>` - 호출자를 찾을 심볼명 (필수)
- `--limit <n>` - 결과 개수 제한 (기본: 50)
- `--format <format>` - 출력 형식 (plain, json)

**출력 예:**
```
🔗 호출자 분석: cache_get (7개 함수에서 호출)

  1. get_user_data()
     📄 work/mobile/mobile/lib/user.php:45
     호출 횟수: 3회

  2. fetch_menu()
     📄 work/mobile/mobile/lib/menu.php:102
     호출 횟수: 2회

  3. NoticeAd::getData()
     📄 work/mobile/new/m_header.php:156
     호출 횟수: 1회

  4. process_homepage()
     📄 work/mobile/mobile/index.php:8
     호출 횟수: 1회
```

---

### help - 도움말

도움말을 표시합니다.

```bash
/php-index help
```

---

## 예제

### 예제 1: 새로운 Helper 클래스 찾기

```bash
/php-index search --symbol "Helper" --type class
```

결과:
```
1. Helper (class)
   📄 work/mobile/new/m_header.php:50
   📏 점수: 100%
```

### 예제 2: 캐시 관련 메서드 모두 찾기

```bash
/php-index search --symbol "cache" --type method --limit 20
```

### 예제 3: 특정 파일의 모든 함수 조회

```bash
/php-index list --file "lotto/index.php"
```

결과:
```
📄 파일: work/mobile/lotto/index.php

  • getLottoData (function)
  • updateLottoNum (function)
  • LottoClass (class)
```

### 예제 4: 메서드의 정의 위치 찾기

```bash
/php-index goto --symbol "Helper::cache_get" --format json
```

결과:
```json
{
  "symbol": "work/mobile/new/m_header.php::Helper::cache_get",
  "type": "method",
  "file": "work/mobile/new/m_header.php",
  "line": 100,
  "column": 1,
  "namespace": ""
}
```

### 예제 5: 순환 의존성 검출

코드베이스에 숨겨진 순환 호출을 찾습니다:

```bash
/php-index deps --circular --verbose
```

결과:
```
🔴 순환 의존성 감지: 2개 사이클 찾음

사이클 #1: cache_get → validate_cache → cache_get
사이클 #2: process_payment → record_transaction → process_payment
```

### 예제 6: 함수의 전체 호출 경로 추적

특정 함수가 호출하는 모든 함수를 트리 구조로 표시:

```bash
/php-index deps --trace "NoticeAd::getData" --max-depth 5
```

결과:
```
📞 호출 경로: NoticeAd::getData

  NoticeAd::getData()
  ├─ cache_get("notice_list")
  │  └─ validate_cache()
  ├─ db_query("SELECT * FROM notice")
  │  └─ execute_query()
  │     └─ log_query()
  └─ format_result()
```

### 예제 7: 함수의 호출 깊이 측정

얼마나 깊게 중첩된 호출 관계가 있는지 확인:

```bash
/php-index deps --depth "process_homepage"
```

결과:
```
📊 호출 깊이: process_homepage

  최대 깊이: 4

  깊이 0: process_homepage()
  깊이 1: fetch_menu(), render_ads()
  깊이 2: cache_get(), db_query()
  깊이 3: validate_cache()
  깊이 4: write_log()
```

### 예제 8: 특정 함수의 모든 호출자 찾기

어떤 함수들이 특정 함수를 호출하는지 확인 (영향도 분석):

```bash
/php-index deps --callers "cache_get"
```

결과:
```
🔗 호출자 분석: cache_get (5개 함수에서 호출)

  1. get_user_data()
     📄 work/mobile/mobile/lib/user.php:45
     호출 횟수: 3회

  2. fetch_menu()
     📄 work/mobile/mobile/lib/menu.php:102
     호출 횟수: 2회

  3. NoticeAd::getData()
     📄 work/mobile/new/m_header.php:156
     호출 횟수: 1회

  4. render_homepage()
     📄 work/mobile/mobile/index.php:28
     호출 횟수: 1회
```

---

## 색인 구조

색인은 다음과 같은 구조로 저장됩니다:

```
plugins/php-index-generator/
├── output/
│   └── index.json          # 생성된 색인 파일
├── lib/
│   ├── IndexCache.js       # 캐시 관리
│   ├── PHPParser.js        # PHP 파서
│   ├── IndexBuilder.js     # 색인 생성기
│   └── IndexSearcher.js    # 검색 엔진
└── index.js                # CLI
```

색인은 자동으로 생성되며, 변경된 파일만 재색인화됩니다 (증분 색인).

---

## 성능 지표

- **색인 생성 시간**: 150개 PHP 파일 기준 2-3초
- **검색 속도**: <50ms (메모리 캐시)
- **메모리 사용량**: ~15-20MB
- **색인 파일 크기**: ~2-5MB

---

## 💡 사용 시나리오

### 1. 코드 리팩토링 시작 단계

기존 함수/클래스를 수정하기 전에 영향 범위를 파악하세요:

```bash
# 1단계: 함수 정의 위치 찾기
/php-index goto --symbol "old_function"

# 2단계: 이 함수를 호출하는 모든 코드 찾기
/php-index deps --callers "old_function"

# 3단계: 호출 깊이 확인 (영향 범위의 복잡도)
/php-index deps --depth "old_function"
```

### 2. 레거시 코드의 기술 부채 파악

순환 의존성과 깊은 호출 체인을 찾아 리팩토링 우선순위를 정하세요:

```bash
# 순환 호출 패턴 검출 (높은 우선순위)
/php-index deps --circular --verbose

# 깊이가 5를 초과하는 함수들 찾기
/php-index list --type function --limit 100 |
  xargs -I {} /php-index deps --depth "{}"
```

### 3. 새로운 팀원의 코드 학습

특정 기능의 전체 호출 흐름을 이해하세요:

```bash
# 홈페이지 렌더링 로직의 전체 구조 파악
/php-index deps --trace "render_homepage" --max-depth 10

# JSON 형식으로 프로그래밍적 처리
/php-index deps --trace "getData" --format json
```

### 4. 버그 추적 및 영향 분석

특정 버그의 원인을 찾고 영향받은 모든 함수를 파악하세요:

```bash
# 문제의 근본 원인인 함수 찾기
/php-index search --symbol "cache_bug_function"

# 이 함수를 호출하는 모든 곳 파악
/php-index deps --callers "cache_bug_function"

# 호출 경로로 버그 전파 경로 추적
/php-index deps --trace "main_function"
```

### 5. 성능 최적화 대상 선정

깊이가 깊은 함수들은 성능 최적화의 좋은 대상입니다:

```bash
# 깊이 분석 (높은 깊이 = 성능 병목)
/php-index deps --depth "process_expensive_operation"

# 많은 곳에서 호출되는 함수 (영향 범위 큼)
/php-index deps --callers "frequently_used_function" --limit 50
```

---

## PHP 5.6 특화 기능

이 스킬은 레거시 PHP 5.6 코드를 지원합니다:

- ✅ 짧은 태그 `<?` 지원
- ✅ 네임스페이스 없는 코드 (전역 함수, 클래스)
- ✅ include/require 의존성 추적
- ✅ HTML 섞인 PHP 파일 처리
- ✅ 주석 다양성 처리 (<!-- --> HTML, /* */ PHP)

---

## 자주 묻는 질문

**Q: 색인이 생성되지 않았습니다.**
A: 다음을 시도하세요:
```bash
npm run php:index:build -- --source work/mobile --force --verbose
```

**Q: 검색 결과가 없습니다.**
A: 먼저 색인을 생성한 후 검색하세요. 부분 일치나 퍼지 매칭을 사용해보세요.

**Q: 캐시를 초기화하려면?**
A: 다음 명령으로 캐시를 초기화할 수 있습니다:
```bash
rm -rf .claude/php-index-cache
npm run php:index:build -- --force
```

**Q: 순환 의존성이 무엇입니까?**
A: 순환 의존성은 A→B→C→A와 같은 순환 호출 패턴입니다. 이는 코드 냄새(code smell)이며 리팩토링이 필요합니다.
```bash
/php-index deps --circular --verbose
```

**Q: 함수의 영향도(어디서 쓰이는지)를 알고 싶습니다.**
A: `--callers` 옵션으로 특정 함수를 호출하는 모든 함수를 찾을 수 있습니다:
```bash
/php-index deps --callers "cache_get"
```

**Q: 함수 호출이 얼마나 깊습니다.**
A: `--depth` 옵션으로 최대 호출 깊이를 확인할 수 있습니다:
```bash
/php-index deps --depth "process_order" --verbose
```

**Q: 함수의 전체 호출 흐름을 시각화하고 싶습니다.**
A: `--trace` 옵션으로 트리 구조의 호출 경로를 확인할 수 있습니다:
```bash
/php-index deps --trace "NoticeAd::getData" --max-depth 5
```

---

## 더 자세한 정보

더 자세한 정보는 다음 파일들을 참고하세요:
- `plugins/php-index-generator/README.md` - 개요
- `plugins/php-index-generator/ARCHITECTURE.md` - 아키텍처
- `plugins/php-index-generator/API.md` - API 문서
- `plugins/php-index-generator/USAGE.md` - 고급 사용법

🤖 Generated with Claude Code
