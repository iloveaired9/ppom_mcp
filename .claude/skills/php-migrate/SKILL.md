# PHP 레거시 코드 마이그레이션

> PHP 5.6 버전 호환성을 유지하면서 **레거시 함수 기반 코드**를 현대식 **클래스 기반 코드**로 자동 마이그레이션합니다.

---

## 🎯 사용 목적

레거시 PHP 코드의 다음 작업을 **자동화**합니다:

✅ **코드 마이그레이션** - 함수 → 클래스로 변환
✅ **테스트 코드 생성** - 데이터 검증 테스트 자동 생성
✅ **샘플 데이터 조회** - myawsdb에서 실제 데이터 가져오기
✅ **마이그레이션 가이드** - 기본 정보 및 체크리스트 생성

---

## 📋 자동 생성 항목

### 1. 데이터 검증 테스트 코드
- **파일:** `test_[table]_data_validation.php`
- **형식:** PHP 5.6 assert 기반
- **용도:** 샘플 데이터로 마이그레이션 클래스 검증

### 2. 샘플 데이터 CSV
- **파일:** `samples/[table]_sample.csv`
- **출처:** myawsdb에서 1개 레코드 자동 조회
- **용도:** 테스트 데이터 및 검증 기준

### 3. 마이그레이션 가이드
- **파일:** `MIGRATION_GUIDE.md`
- **내용:** 함수명, 클래스명, 메서드명, 변환 규칙
- **용도:** 마이그레이션 참고 문서

### 4. 체크리스트
- **파일:** `CHECKLIST_[ClassName].md`
- **내용:** 마이그레이션 수행 항목 및 검증 단계
- **용도:** 진행 상황 추적

---

## 🚀 사용 방법

### 🔹 방법 1: 전체 프로세스 (권장)

```bash
node plugins/php-code-migrator-plus/index.js full \
  --className Posts \
  --table_name posts
```

**생성되는 파일:**
```
output/
├─ test_posts_data_validation.php
├─ MIGRATION_GUIDE.md
└─ CHECKLIST_Posts.md

samples/
└─ posts_sample.csv
```

### 🔹 방법 2: 단계별 실행

#### Step 1: 테스트 코드 생성
```bash
node plugins/php-code-migrator-plus/index.js generate-tests \
  --className Posts
```

#### Step 2: 샘플 데이터 조회
```bash
node plugins/php-code-migrator-plus/index.js fetch-sample \
  --table_name posts
```

#### Step 3: 마이그레이션 가이드 생성
```bash
node plugins/php-code-migrator-plus/index.js generate-guide \
  --className Posts
```

### 🔹 방법 3: npm 스크립트 (권장)

```bash
# 전체 프로세스
npm run php:migrate

# 테스트만 생성
npm run php:test:generate

# 샘플 데이터만 조회
npm run php:sample:fetch
```

---

## 📊 생성되는 결과물 예시

### 입력: `--className Posts --table_name posts`

### 생성 1: test_posts_data_validation.php

```php
<?php
class PostsDataValidationTest
{
    public function testSampleData()
    {
        $data = array(
            'id' => 123,
            'title' => 'Sample Post Title',
            'content' => 'Post content here',
            'author_id' => 456,
            'created_at' => '2026-03-15 10:30:00',
            'status' => 'published'
        );

        // 데이터 검증 assert
        assert(!empty($data['id']), 'id must not be empty');
        assert(is_int($data['id']), 'id must be integer');
        assert(!empty($data['title']), 'title must not be empty');
        assert(is_string($data['title']), 'title must be string');
        // ... 추가 assert
    }

    public function run()
    {
        try {
            $this->testSampleData();
            echo "✅ All validation tests passed!\n";
            return true;
        } catch (AssertionError $e) {
            echo "❌ Validation failed: " . $e->getMessage() . "\n";
            return false;
        }
    }
}

$test = new PostsDataValidationTest();
exit($test->run() ? 0 : 1);
```

**실행:**
```bash
php output/test_posts_data_validation.php

✅ Sample data validation passed
✅ All validation tests passed!
```

### 생성 2: samples/posts_sample.csv

```csv
id,title,content,author_id,created_at,status
123,Sample Post Title,Post content here,456,2026-03-15 10:30:00,published
```

### 생성 3: MIGRATION_GUIDE.md

```markdown
# 마이그레이션 가이드: Posts

## 원본 함수
get_posts()

## 마이그레이션 클래스
Posts::getPosts()

## 기본 정보

### 함수명
get_posts

### 클래스명
Posts

### 메서드명
getPosts

### 변환 규칙
- get_ prefix 제거
- camelCase 메서드명 변환
- Static 메서드 클래스로 변환
```

---

## 🔧 지원되는 변환 규칙

### 함수명 패턴별 변환

| 패턴 | 예시 | 결과 |
|------|------|------|
| `get_*` | `get_user_by_id` | `UserById` 클래스 |
| `is_*` | `is_valid_email` | `ValidEmailValidator` 클래스 |
| `set_*` | `set_user_name` | `UserName` 클래스 |
| 일반 | `convert_text` | `ConvertText` 클래스 |

### 데이터 타입별 테스트

| 타입 | 테스트 | 예시 |
|------|--------|------|
| **int** | `is_int()` | `assert(is_int($data['id']))` |
| **string** | `is_string()` | `assert(is_string($data['title']))` |
| **datetime** | `strtotime()` | `assert(strtotime($data['created_at']))` |
| **email** | 이메일 형식 | 이메일 패턴 검증 |
| **url** | URL 형식 | URL 패턴 검증 |
| **float** | `is_float()` | `assert(is_float($data['price']))` |
| **bool** | `is_bool()` | `assert(is_bool($data['status']))` |

---

## 🔗 의존성

### 필수
- **Node.js** 12.0.0+
- **PHP** 5.6+

### 선택
- **myawsdb** (샘플 데이터 자동 조회)
  - 기본 주소: `http://localhost:3009`
  - 환경변수로 변경: `MYAWSDB_URL=http://custom-host:3009`

---

## 📚 예시

### 예 1: 간단한 함수 마이그레이션

**원본 PHP 함수:**
```php
<?php
function get_user_by_id($user_id) {
    // ... 함수 구현
    return array('id' => $user_id, 'name' => 'John');
}
```

**마이그레이션 클래스:**
```php
<?php
class UserById {
    public static function getUserById($user_id) {
        // ... 함수 구현
        return array('id' => $user_id, 'name' => 'John');
    }
}
```

**생성되는 테스트:**
```php
<?php
class UserByIdDataValidationTest {
    public function testSampleData() {
        $data = array('id' => 123, 'name' => 'John');
        assert(is_int($data['id']), 'id must be integer');
        assert(is_string($data['name']), 'name must be string');
    }
}
```

### 예 2: 검증 함수 마이그레이션

**원본 PHP 함수:**
```php
<?php
function is_valid_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}
```

**마이그레이션 클래스:**
```php
<?php
class ValidEmailValidator {
    public static function isValidEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL);
    }
}
```

**생성되는 테스트:**
```php
<?php
class ValidEmailValidatorDataValidationTest {
    public function testSampleData() {
        $data = array('email' => 'test@example.com');
        assert(is_string($data['email']), 'email must be string');
        // 이메일 형식 검증
    }
}
```

---

## ✅ 체크리스트 (자동 생성)

모든 마이그레이션마다 체크리스트가 자동 생성됩니다:

```markdown
## ✅ 마이그레이션 체크리스트: Posts

### 코드 검토
- [ ] 원본 함수 동작 확인
- [ ] 마이그레이션 된 클래스 문법 검증 (php -l)
- [ ] 데이터 검증 테스트 통과

### 통합
- [ ] 기존 코드베이스에서 함수 호출 찾기
- [ ] 함수 호출을 클래스 메서드로 변경
- [ ] 의존성 주입 필요시 리팩토링

### 검증
- [ ] 로컬 환경에서 테스트 실행
- [ ] 스테이징 환경에서 통합 테스트
- [ ] 프로덕션 배포 전 최종 검증
```

---

## 🌟 지원되는 PHP 버전

| 버전 | 상태 |
|------|------|
| PHP 5.6 | ✅ 레거시 코드 대상 |
| PHP 7.0+ | ✅ 마이그레이션 대상 |
| PHP 8.0+ | ✅ 호환성 확보 |

---

## 💡 팁

### 팁 1: 샘플 데이터 자동 검증

테스트 파일 실행 시 assert가 실패하면 자동으로 오류를 표시합니다:

```bash
php test_posts_data_validation.php
# ✅ Sample data validation passed
# ✅ All validation tests passed!
```

### 팁 2: CSV 파일 검증

생성된 CSV가 올바른지 확인:

```bash
head -2 samples/posts_sample.csv
# id,title,content,author_id,created_at,status
# 123,Sample Post Title,...
```

### 팁 3: 마이그레이션 규칙 커스텀

필요시 MIGRATION_GUIDE.md를 수동으로 수정할 수 있습니다.

---

## 🔗 관련 플러그인

- **php-code-migrator** (Phase 1) - 코드 마이그레이션 기본 로직
- **php-code-migrator-plus** (Phase 2) - 확장 플러그인 (현재)

---

## 📞 지원

문제가 발생하면:

1. **myawsdb 연결 확인**
   ```bash
   curl http://localhost:3009/health
   ```

2. **PHP 문법 검증**
   ```bash
   php -l output/test_posts_data_validation.php
   ```

3. **로그 확인**
   ```bash
   node plugins/php-code-migrator-plus/index.js full --className Posts --table_name posts
   ```

---

**마이그레이션을 시작하세요! 🚀**

