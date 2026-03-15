# PHP Legacy Converter MCP 명세

> PHP 5.6 레거시 함수를 현대적인 Static 메소드 클래스로 자동 변환하는 MCP 서버

**버전**: 1.0.0
**마지막 업데이트**: 2026-03-13
**상태**: 구현 완료

---

## 📋 개요

### 목적
- PHP 5.6 레거시 코드의 절차지향적 함수를 현대적인 OOP 구조로 자동 변환
- 코드 마이그레이션 시간 단축
- 일관된 변환 규칙 적용

### 입력/출력
| 항목 | 설명 |
|------|------|
| **입력** | PHP 파일 (.php) - 절차지향 함수 모음 |
| **출력** | PHP 파일 (.php) - Static 메소드 클래스 |
| **인코딩** | UTF-8, UTF-16 (자동 감지/유지) |
| **호환성** | PHP 7.0+ |

---

## 🔄 변환 규칙

### 1. 함수 → 클래스 매핑

#### 클래스명 생성 규칙

**규칙**: `함수명_분석 → 의미있는_클래스명`

```
get_user_by_id       → UserGetter
calculate_tax        → TaxCalculator
url_encode           → UrlEncoder
is_valid_email       → EmailValidator
total_division       → DivisionTotal
plus_division        → DivisionPlus
member_info          → MemberInfo
get_data_user        → DataUserGetter
estimate_is_income   → EstimateIncomeValidator
```

**알고리즘**:
```
1. 함수명을 언더스코어로 분리: get_user_by_id → [get, user, by, id]
2. 첫 번째 단어 = action: get
3. 나머지 단어 = subject: user, by, id
4. subject를 PascalCase로 결합: User (+ By + Id 무시)
5. action을 PascalCase로: Get
6. 결과: UserGet

특수 규칙:
- "is_*" 함수 → "validator" 붙임 (is_valid_email → EmailValidator)
- "get_*" 함수 → "Getter" 붙임 (get_user → UserGetter)
- "set_*" 함수 → "Setter" 붙임 (set_config → ConfigSetter)
- "total_*" 함수 → "*Total" 형식 (total_division → DivisionTotal)
```

### 2. 메소드명 규칙

#### 메소드명 형식: snake_case 유지 (PHP 컨벤션)

```php
// PHP 5.6 원본
function get_user_by_id($id) { ... }

// 변환 후 (메소드명 유지)
class UserGetter {
    public static function get_user_by_id($id) { ... }
}

NOT: public static function getUserById($id)  // camelCase 사용 안 함
```

**메소드명 매핑**:
| 함수명 | 메소드명 |
|-------|---------|
| `total_division` | `total_division()` ✓ |
| `plus_division` | `plus_division()` ✓ |
| `getmicrotime` | `getmicrotime()` ✓ |
| `is_noname_id` | `is_noname_id()` ✓ |

### 3. 시그니처 (파라미터)

```php
// 원본 함수
function add_division($board_name = "") { ... }

// 변환 후
public static function add_division($board_name = "") { ... }

// 규칙:
// ✓ 파라미터 유지
// ✓ 기본값 유지
// ✓ 타입 힌트 유지 (있는 경우)
```

### 4. 함수 본체

```php
// 원본 함수
function plus_division($division) {
    global $m_connect, $t_division, $id;

    $sql = "update " . $t_division . "_" . $id . " set num = num + 1 where division = :division";
    $m_connect->execute($sql, array(":division" => $division));
}

// 변환 후 (본체 완전 포함)
public static function plus_division($division) {
    global $m_connect, $t_division, $id;

    $sql = "update " . $t_division . "_" . $id . " set num = num + 1 where division = :division";
    $m_connect->execute($sql, array(":division" => $division));
}
```

**규칙**:
- ✓ 함수 본체 전체 포함
- ✓ 문자열 내 중괄호 무시
- ✓ 주석 내 중괄호 무시
- ✓ 들여쓰기 자동 정규화

### 5. Namespace 및 구조

```php
<?php

namespace App\Legacy;

/**
 * DivisionTotal
 *
 * 자동 생성됨 (PHP Legacy Converter MCP)
 * 변환 시간: 2026-03-13T12:32:09.724Z
 */
class DivisionTotal {
    public static function total_division() { ... }
}
```

**규칙**:
- ✓ `namespace App\Legacy;` 적용
- ✓ 클래스별 독스트링 자동 생성
- ✓ 메소드별 @param, @return 자동 생성

---

## 🔧 기술 명세

### 함수 본체 추출

#### 중괄호 매칭 (Brace Matching)

**고려사항**:
```php
$json = '{"key": "value"}';      // 문자열 내 중괄호 무시 ✓
// { 주석 }                      // 주석 내 중괄호 무시 ✓
/* { 블록주석 } */              // 블록 주석 내 중괄호 무시 ✓
$code = "if { ... }";           // 문자열 내 브레이스 무시 ✓
```

**알고리즘**:
```
1. 함수 정의에서 { 위치 찾기
2. 상태 머신으로 추적:
   - inString: 문자열 내 여부 (싱글/더블/백틱)
   - inComment: 블록 주석 내 여부
   - inLineComment: 라인 주석 내 여부
3. 중괄호 카운트:
   - 문자열/주석 외에서만 카운트
   - { 만나면 +1
   - } 만나면 -1
4. 카운트가 0이 되는 지점 = 함수 종료
```

### 들여쓰기 정규화

**목표**: 원본의 불규칙한 들여쓰기를 정규화

```php
// 원본 (불규칙)
        global $x, $y;
            $sql = "...";
        $result = query($sql);

// 변환 후 (정규화)
        global $x, $y;
        $sql = "...";
        $result = query($sql);
```

**알고리즘**:
```
1. 함수 본체의 모든 라인 수집
2. 각 라인의 최소 들여쓰기 계산
3. 최소값만큼 제거
4. 클래스 메소드로 8칸(2 탭) 들여쓰기 추가
```

### 파일 인코딩 처리

**감지 순서**:
```
1. BOM 확인 (UTF-8, UTF-16LE, UTF-16BE)
2. 내용 분석 (UTF-8 유효성)
3. 기본값: UTF-8
```

**지원 인코딩**:
| 인코딩 | BOM | 감지 | 지원 |
|--------|-----|------|------|
| UTF-8 | O/X | ✓ | ✓ |
| UTF-16LE | O | ✓ | ✓ |
| UTF-16BE | O | ✓ | ✓ |

---

## 📡 MCP 서버 인터페이스

### 포트
```
3003 (기본값)
환경변수: PHP_CONVERTER_PORT=3004
```

### 엔드포인트

#### 1. `/tools` (GET)
**기능**: 사용 가능한 도구 목록 조회

**응답**:
```json
{
  "tools": [
    {
      "name": "convert_php_to_classes",
      "description": "PHP 함수를 Static 메소드 클래스로 변환"
    },
    {
      "name": "analyze_coding_guide",
      "description": "PHP 코딩 가이드 파일 분석"
    },
    {
      "name": "extract_functions",
      "description": "PHP 파일에서 함수 목록 추출"
    }
  ]
}
```

#### 2. `/convert` (POST)
**기능**: PHP 파일 변환

**요청**:
```json
{
  "phpFile": "lib.php",
  "guideFile": "class.Sample.inc"  // 선택사항
}
```

**응답 (성공)**:
```json
{
  "success": true,
  "data": {
    "convertedCode": "<?php\nnamespace App\\Legacy;\n...",
    "classes": ["DivisionTotal", "DivisionPlus", ...],
    "methodCount": 151,
    "functionCount": 151,
    "functions": ["total_division", "plus_division", ...],
    "encoding": "utf8",
    "sourceInfo": {
      "fileName": "lib.php",
      "fileEncoding": "utf8",
      "hasBOM": false,
      "isValidUtf8": true,
      "detectedEncoding": true
    }
  },
  "message": "151개 함수가 151개 클래스로 변환되었습니다 (인코딩: utf8, PHP 네이밍 유지, 함수 본체 포함)"
}
```

**응답 (오류)**:
```json
{
  "success": false,
  "error": "PHP 함수를 찾을 수 없습니다"
}
```

#### 3. `/health` (GET)
**기능**: 서버 상태 확인

**응답**:
```json
{
  "status": "ok",
  "server": "php-legacy-converter-mcp",
  "timestamp": "2026-03-13T12:33:53.278Z"
}
```

---

## 📊 변환 결과 예시

### 입력 (PHP 5.6)
```php
<?php
function total_division() {
    global $m_connect, $s_connect, $t_division, $id;

    $sql = "select max(division) from " . $t_division . "_" . $id;
    $temp = $s_connect->executeFetch($sql);
    return $temp[0];
}

function plus_division($division) {
    global $m_connect, $t_division, $id;

    $sql = "update " . $t_division . "_" . $id . " set
                num = num + 1
            where division = :division";
    $m_connect->execute($sql, array(":division" => $division));
}
```

### 출력 (PHP 8.0+)
```php
<?php

namespace App\Legacy;

/**
 * DivisionTotal
 *
 * 자동 생성됨 (PHP Legacy Converter MCP)
 * 변환 시간: 2026-03-13T12:33:53.278Z
 */
class DivisionTotal
{
    /**
     * total_division
     *
     * 원본 함수: total_division
     * @param
     * @return mixed
     */
    public static function total_division()
    {
        global $m_connect, $s_connect, $t_division, $id;

        $sql = "select max(division) from " . $t_division . "_" . $id;
        $temp = $s_connect->executeFetch($sql);
        return $temp[0];
    }

}

/**
 * DivisionPlus
 *
 * 자동 생성됨 (PHP Legacy Converter MCP)
 * 변환 시간: 2026-03-13T12:33:53.278Z
 */
class DivisionPlus
{
    /**
     * plus_division
     *
     * 원본 함수: plus_division
     * @param $division
     * @return mixed
     */
    public static function plus_division($division)
    {
        global $m_connect, $t_division, $id;

        $sql = "update " . $t_division . "_" . $id . " set
        num = num + 1
    where division = :division";
        $m_connect->execute($sql, array(":division" => $division));
    }

}
```

---

## ⚠️ 제약사항 및 주의사항

### 자동 변환 불가능한 경우
```php
// 1. 동적 함수 호출
$func = "get_user";
$user = $func($id);  // ❌ 자동 변환 불가

// 2. 함수 포인터
$callbacks[] = 'total_division';  // ❌ 자동 변환 불가

// 3. func_get_args 등 동적 파라미터
function process() {
    $args = func_get_args();  // ❌ 메소드 시그니처 생성 실패 가능
}
```

### 수동 작업 필요
| 항목 | 현황 | 비고 |
|------|------|------|
| Global 변수 → DI | ❌ 수동 필요 | 본체 포함되지만 global 유지 |
| 타입 힌트 추가 | ❌ 수동 필요 | PHP 7.0+ 타입 시스템 미지원 |
| Return 타입 | ❌ 수동 필요 | @return 주석만 추가 |
| 에러 처리 | ❌ 유지 | 원본 에러 처리 그대로 유지 |

### 파일 크기 증가
```
원본: lib.php (42KB)
변환: LegacyLib_improved.php (274KB)

증가 이유:
- 클래스 선언 오버헤드
- 독스트링 주석 추가
- Namespace 선언
- 각 메소드별 문서화
```

---

## 🚀 사용 예시

### 기본 변환
```bash
curl -X POST http://localhost:3003/convert \
  -H "Content-Type: application/json" \
  -d '{
    "phpFile": "lib.php"
  }'
```

### 가이드 파일 사용
```bash
curl -X POST http://localhost:3003/convert \
  -H "Content-Type: application/json" \
  -d '{
    "phpFile": "lib.php",
    "guideFile": "class.Sample.inc"
  }'
```

### Node.js에서 호출
```javascript
const result = await convertPhpToClasses({
  phpFile: 'lib.php',
  guideFile: 'class.Sample.inc'  // 선택
});

console.log(`${result.data.functionCount}개 함수가 ${result.data.classes.length}개 클래스로 변환됨`);
fs.writeFileSync('LegacyLib.php', result.data.convertedCode, result.data.encoding);
```

---

## 📝 버전 히스토리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0.0 | 2026-03-13 | 초기 구현 완료 |
| | | - 함수 본체 완전 추출 |
| | | - PHP 네이밍 유지 |
| | | - 인코딩 감지/유지 |
| | | - 들여쓰기 정규화 |

---

## 🔍 검증 기준

✅ **변환 완료 조건**:
- [ ] 151개 함수 → 151개 클래스 변환
- [ ] 모든 함수 본체 포함
- [ ] 파일 인코딩 UTF-8 유지
- [ ] 메소드명 snake_case 유지
- [ ] 클래스명 PascalCase 자동 생성
- [ ] 독스트링 자동 생성

---

**문서화자**: Claude (AI)
**마지막 검토**: 2026-03-13
