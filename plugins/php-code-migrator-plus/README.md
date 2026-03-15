# PHP Code Migrator Plus

PHP 레거시 함수 기반 코드를 PHP 5.6 호환성을 유지하면서 현대식 **클래스 기반 코드**로 자동 변환하고, **데이터 검증 테스트 코드**를 자동 생성하는 플러그인입니다.

## ✨ 기능

### 1. 코드 마이그레이션
- ✅ PHP 함수 → Static 메서드 클래스로 자동 변환
- ✅ PHP 5.6 호환성 유지 (타입 힌트 미사용)
- ✅ 함수명 → 클래스명/메서드명 자동 변환 규칙
  - `get_user_by_id()` → `UserById::getUserById()`
  - `is_valid_email()` → `ValidEmailValidator::isValidEmail()`

### 2. 자동 테스트 코드 생성
- ✅ 데이터 검증 테스트 자동 생성 (PHP 5.6 assert 기반)
- ✅ 샘플 데이터 기반 테스트 케이스 생성
- ✅ 필드 타입 자동 감지 (int, string, datetime 등)
- ✅ 테스트 실행: `php test_*.php`

### 3. 샘플 데이터 관리
- ✅ myawsdb에서 실제 데이터 자동 조회
- ✅ 샘플 데이터를 CSV로 자동 저장
- ✅ 테스트 케이스에 자동 주입
- ✅ 1개 레코드만 조회 (개인정보 보호)

### 4. 마이그레이션 가이드 생성
- ✅ 기본 정보 가이드 (함수명, 클래스명, 메서드명)
- ✅ 변환 규칙 설명
- ✅ 마이그레이션 체크리스트 자동 생성

## 📦 설치

```bash
cd plugins/php-code-migrator-plus
npm install
```

## 🚀 사용법

### 기본: 전체 프로세스 실행

```bash
node index.js full --className Posts --table_name posts
```

**생성되는 파일:**
```
output/
├─ test_posts_data_validation.php    # 데이터 검증 테스트
├─ MIGRATION_GUIDE.md                 # 마이그레이션 가이드
└─ CHECKLIST_Posts.md                 # 체크리스트

samples/
└─ posts_sample.csv                    # 샘플 데이터
```

### 단계별 실행

#### 1️⃣ 데이터 검증 테스트 생성

```bash
node index.js generate-tests --className Posts
```

**출력:**
- `output/test_posts_data_validation.php`

**테스트 실행:**
```bash
php output/test_posts_data_validation.php

# 예상 결과:
# ✅ Sample data validation passed
# ✅ All validation tests passed!
```

#### 2️⃣ 샘플 데이터 조회

```bash
node index.js fetch-sample --table_name posts
```

**출력:**
- `samples/posts_sample.csv` (myawsdb에서 1개 레코드)

**CSV 예시:**
```csv
id,title,content,author_id,created_at,status
123,Sample Post Title,Post content here,456,2026-03-15 10:30:00,published
```

#### 3️⃣ 마이그레이션 가이드 생성

```bash
node index.js generate-guide --className Posts
```

**출력:**
- `output/MIGRATION_GUIDE.md` (기본 정보 가이드)
- `output/CHECKLIST_Posts.md` (체크리스트)

### 커스텀 옵션

```bash
node index.js full \
  --className MyCustomClass \
  --table_name custom_table \
  --sample_limit 1
```

## 🔧 생성되는 테스트 코드 예시

### 입력 샘플 데이터
```php
$data = array(
    'id' => 123,
    'title' => 'Sample Post',
    'content' => 'Content here',
    'author_id' => 456,
    'created_at' => '2026-03-15 10:30:00',
    'status' => 'published'
);
```

### 생성되는 테스트 코드
```php
<?php
class PostsDataValidationTest
{
    public function testSampleData()
    {
        $data = array(
            'id' => 123,
            'title' => 'Sample Post',
            ...
        );

        // 데이터 검증 assert
        assert(!empty($data['id']), 'id must not be empty');
        assert(is_int($data['id']), 'id must be integer');
        assert(!empty($data['title']), 'title must not be empty');
        assert(is_string($data['title']), 'title must be string');
        assert(!empty($data['created_at']), 'created_at must not be empty');
        assert(strtotime($data['created_at']), 'created_at must be valid datetime');

        echo "✅ Sample data validation passed\n";
        return true;
    }

    public function run()
    {
        try {
            $this->testSampleData();
            echo "\n✅ All validation tests passed!\n";
            return true;
        } catch (AssertionError $e) {
            echo "\n❌ Validation failed: " . $e->getMessage() . "\n";
            return false;
        }
    }
}

$test = new PostsDataValidationTest();
exit($test->run() ? 0 : 1);
```

### 실행 결과
```bash
$ php test_posts_data_validation.php

✅ Sample data validation passed

✅ All validation tests passed!
```

## 🔗 요구사항

### 필수
- Node.js 12.0.0+
- PHP 5.6+

### 선택
- myawsdb MCP 서버 (샘플 데이터 자동 조회 시)
  - 기본 주소: `http://localhost:3009`
  - 환경변수로 변경 가능: `MYAWSDB_URL=http://custom:3009`

## 📋 마이그레이션 규칙

### 함수명 → 클래스명 변환

| 패턴 | 예시 | 결과 |
|------|------|------|
| `get_*` | `get_user_by_id` | `UserById` 클래스 |
| `is_*` | `is_valid_email` | `ValidEmailValidator` 클래스 |
| `set_*` | `set_user_name` | `UserName` 클래스 |
| 일반 | `convert_text` | `ConvertText` 클래스 |

### 메서드명 변환

| 원본 함수 | 메서드명 |
|----------|---------|
| `get_user_by_id` | `getUserById` |
| `is_valid_email` | `isValidEmail` |
| `set_config_value` | `setConfigValue` |

## 🧪 테스트 케이스

### 데이터 타입별 테스트

```
✅ Integer 필드: is_int()
✅ String 필드: is_string()
✅ Datetime 필드: strtotime()
✅ Email 필드: 이메일 형식 검증
✅ URL 필드: URL 형식 검증
✅ Null/Empty 필드: 비어있음 체크
```

## 🔄 워크플로우

```
1. 레거시 PHP 파일 준비
   └─ work/legacy_posts.php

2. 플러그인 실행
   └─ node index.js full --className Posts --table_name posts

3. 생성된 파일 확인
   ├─ output/test_posts_data_validation.php
   ├─ output/MIGRATION_GUIDE.md
   ├─ output/CHECKLIST_Posts.md
   └─ samples/posts_sample.csv

4. 테스트 실행
   └─ php output/test_posts_data_validation.php

5. 마이그레이션 진행
   ├─ 원본 함수 동작 확인
   ├─ 테스트 코드 통과 확인
   └─ 기존 코드 업데이트
```

## ⚙️ 설정

### 환경변수

```bash
# myawsdb 주소 변경
export MYAWSDB_URL=http://localhost:3009

# PHP 버전 (기본값: 5.6)
export PHP_VERSION=5.6
```

### 커스텀 설정

`index.js` 생성 시 옵션 전달:

```javascript
const migrator = new PHPCodeMigratorPlus({
  outputDir: 'custom_output',
  samplesDir: 'custom_samples',
  myawsdbUrl: 'http://custom-host:3009',
  phpVersion: '7.0'
});
```

## 📊 CSV 형식

생성되는 샘플 CSV:

```csv
id,title,content,author_id,created_at,status
123,"Sample Post Title","Post content here",456,"2026-03-15 10:30:00","published"
```

**특징:**
- 첫 줄: 컬럼명 (헤더)
- 두 번째 줄: 데이터 (1개 레코드)
- 쉼표/따옴표 포함 값은 자동으로 이스케이프

## 🐛 문제 해결

### myawsdb 연결 실패

```
⚠️ Sample data fetch failed: ECONNREFUSED

💡 Tip: Make sure myawsdb is running on http://localhost:3009
```

**해결:**
```bash
# myawsdb 서버 시작
node mcp-servers/myawsdb.js

# 또는 포트 확인
curl http://localhost:3009/health
```

### PHP 문법 검증

```bash
# 생성된 PHP 파일 검증
php -l output/test_posts_data_validation.php
```

## 📝 라이선스

MIT

## 🤝 기여

버그 보고 및 기능 요청은 이슈 트래커에서 해주세요.

---

**Created with ❤️ by AI Assistant**
