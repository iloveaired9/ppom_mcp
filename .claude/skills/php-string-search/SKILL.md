---
name: php-string-search
description: PHP 코드에서 특정 문자열을 검색하고 함수 위치 및 의존성 정보를 표시합니다
type: utility
version: 1.0.0
author: Claude
---

# PHP 문자열 검색 스킬

PHP 소스 파일에서 특정 문자열을 검색하고, 해당 문자열의 위치(파일, 라인), 포함된 함수명, 그리고 의존성 정보를 마크다운 테이블로 보여줍니다.

## 🎯 주요 기능

✅ **문자열 리터럴 검색** - 모든 라인에서 특정 문자열 찾기
✅ **함수 내용 검색** - 특정 함수 내에서만 검색
✅ **주석 검색** - 코드 주석에서만 검색
✅ **함수명 자동 파악** - 발견된 문자열이 포함된 함수명 표시
✅ **의존성 분석** - 해당 함수를 호출하는 다른 함수들 표시
✅ **대소문자 구분** - 옵션으로 대소문자 구분 검색 가능

## 📖 사용법

### 기본 사용

```bash
/php-string-search "옥션 책 정보"
```

### 고급 옵션

```bash
# 함수 내용에서만 검색
/php-string-search "get_url_data" --type function-content

# 주석에서만 검색
/php-string-search "TODO" --type comment

# 특정 디렉토리에서 검색
/php-string-search "SELECT" --source work/ppomppu

# 결과 제한
/php-string-search "옥션" --limit 50

# 대소문자 구분
/php-string-search "GetPrice" --case-sensitive
```

## 📋 옵션 설명

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--source <경로>` | `work/mobile` | 검색할 소스 디렉토리 |
| `--type <타입>` | `search` | 검색 타입 (search, function-content, comment) |
| `--limit <숫자>` | `20` | 결과 개수 제한 |
| `--case-sensitive` | `false` | 대소문자 구분 여부 |

### 검색 타입

- **search** (기본값): 모든 라인에서 검색
- **function-content**: 함수 내용에서만 검색
- **comment**: 주석(// 또는 /* */)에서만 검색

## 🔄 사용 사례

### 사례 1: 특정 문자열이 어디에 있는지 찾기

```bash
/php-string-search "옥션 책 정보 크롤링"
```

**결과 예시:**
```
📄 문자열 검색 결과: "옥션 책 정보 크롤링" (1개 발견)

| # | 파일 | 라인 | 함수명 | 내용 |
|----|------|------|--------|------|
| 1 | work/mobile/ppomppu/books/get_price.php | 45 | get_book_info_auction() | $result[info] = "옥션 책 정보 크롤링"; |

📊 의존성 정보:
- **get_book_info_auction()** 호출처:
  └─ get_price.php 라인 7 ($_GET['site']=='auction')
  └─ dashboard.php 라인 23 (displayBooks())
  └─ batch.php 라인 156 (processAllSources())
```

### 사례 2: 특정 함수를 호출하는 모든 위치 찾기

```bash
/php-string-search "get_url_data" --type function-content
```

**결과:**
```
📄 문자열 검색 결과: "get_url_data" (5개 발견)

| # | 파일 | 라인 | 함수명 | 내용 |
|----|------|------|--------|------|
| 1 | work/mobile/ppomppu/books/get_price.php | 63 | get_book_info_auction() | $data=get_url_data($url); |
| 2 | work/mobile/ppomppu/books/get_price.php | 109 | get_book_info_bandibook() | $data=get_url_data($url); |
| ... | ... | ... | ... | ... |
```

### 사례 3: 개발 중인 TODO/FIXME 찾기

```bash
/php-string-search "FIXME" --type comment
```

### 사례 4: SQL 패턴 찾기

```bash
/php-string-search "SELECT " --source work/ppomppu
```

## 🎨 출력 형식

결과는 마크다운 테이블로 출력됩니다:

```
📄 문자열 검색 결과: "검색어" (N개 발견)

| # | 파일 | 라인 | 함수명 | 내용 |
|----|------|------|--------|------|
| 1 | 경로/파일.php | 123 | functionName() | 문자열 내용 |
| 2 | ... | ... | ... | ... |

⏱️  검색 완료: XXms
```

### 의존성 정보

함수 정보가 있을 경우, 해당 함수를 호출하는 다른 함수들이 표시됩니다:

```
📊 의존성 정보:
- **functionName()** 호출처:
  └─ caller_function.php 라인 XX
  └─ another_caller.php 라인 YY
```

## ⚙️ 기술 상세

### 기존 php-index 활용

이 스킬은 기존의 **php-index** 색인 정보를 활용하여 의존성 정보를 제공합니다.

최적의 결과를 위해 먼저 색인을 생성하세요:

```bash
/php-index build --source work/mobile --force
```

색인 없이도 기본 검색은 작동하지만, 의존성 정보는 제공되지 않습니다.

### 검색 방식

1. **파일 스캔**: 지정된 디렉토리의 모든 PHP 파일 검색
2. **패턴 매칭**: 대소문자 구분/무시하여 문자열 검색
3. **함수명 파악**: 발견된 라인이 속한 함수명 자동 추출
4. **의존성 분석**: php-index 색인에서 호출 관계 조회
5. **결과 포맷팅**: 마크다운 테이블로 정렬 및 출력

### 성능

- **검색 속도**: 500개 PHP 파일 기준 <500ms
- **메모리 사용**: 증분 로드로 최적화
- **결과 제한**: 기본 20개 (--limit으로 조정 가능)

## 🔗 관련 스킬

- **php-index** - PHP 심볼 검색 및 색인화
- **php-query** - SQL 쿼리 자동 추출
- **php-dependency-mapper** - 의존성 시각화

## 🆘 문제 해결

### "php-index 색인을 찾을 수 없습니다" 경고

```bash
# 색인 생성으로 해결
/php-index build --source work/mobile --force
```

### 검색 결과가 없음

- 소스 디렉토리 경로 확인: `--source work/mobile`
- 검색어 확인: 따옴표로 감싸기 `/php-string-search "검색어"`
- 대소문자 확인: 기본적으로 대소문자 무시

### 특정 파일만 검색하고 싶을 때

현재는 디렉토리 단위 검색만 지원합니다. 파일 단위 검색이 필요한 경우 grep을 사용하세요:

```bash
grep -n "검색어" work/mobile/ppomppu/books/get_price.php
```

## 📝 버전 히스토리

### v1.0.0 (2026-03-25)
- 초기 버전 출시
- 문자열 검색 (3가지 타입)
- 함수명 자동 파악
- 의존성 분석 (php-index 연동)
- 마크다운 테이블 출력

## 💡 팁

- 큰따옴표나 홑따옴표로 검색어를 감싸면 공백 포함 검색 가능
- `--limit 999`로 모든 결과 보기 (주의: 많을 수 있음)
- 함수 내용 검색은 성능 소모가 적으므로 대규모 검색에 유용
- 주석 검색으로 TODO, FIXME, NOTE 등 마크업 찾기 가능
