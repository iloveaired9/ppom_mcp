---
name: PHP Index Generator
description: PHP 코드 색인화 및 "Go to Definition" 기능 (PHP 5.6 특화)
---

# PHP Index Generator 스킬

PHP 소스 코드를 색인화하고 함수, 클래스, 메서드를 빠르게 검색할 수 있는 스킬입니다.

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

---

## 더 자세한 정보

더 자세한 정보는 다음 파일들을 참고하세요:
- `plugins/php-index-generator/README.md` - 개요
- `plugins/php-index-generator/ARCHITECTURE.md` - 아키텍처
- `plugins/php-index-generator/API.md` - API 문서
- `plugins/php-index-generator/USAGE.md` - 고급 사용법

🤖 Generated with Claude Code
