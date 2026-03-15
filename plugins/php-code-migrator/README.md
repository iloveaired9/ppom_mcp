# 🔄 PHP Code Migrator Plugin

PHP 5.6 레거시 함수를 현대적인 Static 메소드 클래스로 자동 변환하는 플러그인입니다.

## 📋 개요

| 항목 | 정보 |
|------|------|
| **버전** | 1.0.0 |
| **타입** | utility |
| **상태** | ✅ 운영 중 |
| **인코딩** | UTF-8, UTF-16, EUC-KR 지원 |

## 🎯 기능

### 1. PHP 함수 변환 (`convert`)
절차지향적 함수를 OOP Static 메소드 클래스로 변환합니다.

**입력:**
```php
<?php
function get_user_by_id($id) {
    global $db;
    return $db->query("SELECT * FROM users WHERE id = ?", [$id]);
}

function is_valid_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
```

**출력:**
```php
<?php
namespace App\Legacy;

class UserByIdGetter {
    public static function get_user_by_id($id) {
        global $db;
        return $db->query("SELECT * FROM users WHERE id = ?", [$id]);
    }
}

class ValidEmailValidator {
    public static function is_valid_email($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}
```

### 2. 파일 분석 (`analyze`)
변환 가능 여부 및 함수 정보를 분석합니다.

## 📊 변환 규칙

### 클래스명 생성
| 함수명 패턴 | 클래스명 | 예시 |
|------------|---------|------|
| `get_*` | `*Getter` | get_user → UserGetter |
| `is_*` | `*Validator` | is_valid_email → ValidEmailValidator |
| `set_*` | `*Setter` | set_config → ConfigSetter |
| `total_*` | `*Total` | total_division → DivisionTotal |
| `plus_*` | `*Plus` | plus_division → DivisionPlus |
| 기타 | PascalCase | convert_text → ConvertText |

### 메소드명
- snake_case 유지 (PHP 컨벤션)
- 파라미터 유지
- 함수 본체 완전 포함

### Namespace
- 기본값: `App\Legacy`
- 옵션으로 커스터마이징 가능

## 🚀 사용법

### JavaScript/Node.js

```javascript
const plugin = require('./plugins/php-code-migrator/index.js');

// 방법 1: 파일 변환
const result = await plugin.convertFile(
  './lib.php',
  './lib_migrated.php',
  {
    preserveEncoding: true,
    generateDocstring: true,
    phpNamespacePrefix: 'App\\Legacy'
  }
);

// 방법 2: 직접 코드 변환
const result = await plugin.execute('convert', {
  phpCode: phpCodeString,
  phpNamespacePrefix: 'App\\Migration'
});

// 방법 3: 파일 분석
const result = await plugin.execute('analyze', {
  phpCode: phpCodeString,
  fileName: 'lib.php'
});
```

### CLI

```bash
node plugins/php-code-migrator/index.js convert lib.php
```

## ⚙️ 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `preserveEncoding` | true | 원본 파일 인코딩 유지 |
| `generateDocstring` | true | 자동 독스트링 생성 |
| `phpNamespacePrefix` | `App\Legacy` | Namespace 설정 |

## 🔤 인코딩 지원

| 인코딩 | 감지 | 유지 | 비고 |
|--------|------|------|------|
| UTF-8 | ✅ | ✅ | BOM 확인 |
| UTF-16BE | ✅ | ✅ | BOM 확인 |
| UTF-16LE | ✅ | ✅ | BOM 확인 |
| EUC-KR | ✅ | ✅ | 한글 파일 |

## 📈 변환 성과

**lib.php 변환 예시:**
```
원본: 205 KB (151개 함수, EUC-KR)
변환: 256.5 KB (151개 클래스, EUC-KR)

변환 시간: 52ms
증가: 13.6 KB (51%)
```

## 🔍 구현 상세

### 핵심 로직

1. **인코딩 감지** (`detectEncoding`)
   - BOM 확인 (UTF-8, UTF-16)
   - EUC-KR 디코드 시도
   - 기본값: UTF-8

2. **함수 추출** (`extractFunctions`)
   - Regex + 상태 머신
   - 문자열/주석 내 중괄호 무시
   - 함수 본체 완전 추출

3. **클래스명 생성** (`generateClassName`)
   - 함수명 분석
   - 규칙 기반 변환
   - PascalCase 생성

4. **코드 변환** (`convertFunctionToClass`)
   - Static 메소드로 감싸기
   - 독스트링 추가
   - 들여쓰기 정규화

5. **저장** (`convertFile`)
   - iconv-lite로 인코딩
   - 원본 인코딩 유지

## ⚠️ 제약사항

- ❌ 동적 함수 호출 미지원
- ❌ 함수 포인터/콜백 미지원
- ✅ Global 변수 유지 (수동 리팩토링 필요)
- ✅ 모든 함수 본체 포함

## 📖 관련 문서

- [PHP_LEGACY_CONVERTER.md](../../docs/02-design/PHP_LEGACY_CONVERTER.md) - 상세 설계 명세
- [manifest.json](./manifest.json) - 플러그인 메타데이터

## 🛠️ 테스트

```bash
node -e "
const plugin = require('./plugins/php-code-migrator/index.js');
(async () => {
  const result = await plugin.convertFile('./work/output/lib.php', './lib_migrated.php');
  console.log(result.message);
})();
"
```

## 📝 변경이력

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0.0 | 2026-03-14 | 초기 버전 |
| | | - 함수 추출 및 클래스 변환 |
| | | - 인코딩 자동 감지/유지 |
| | | - 들여쓰기 정규화 |

---

**작성자:** Claude (AI)
**마지막 업데이트:** 2026-03-14
