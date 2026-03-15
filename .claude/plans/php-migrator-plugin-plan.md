# PHP 레거시 코드 마이그레이션 + 자동 테스트 코드 생성 플러그인 설계

## 📋 Context (배경)

기존의 `php-code-migrator` 플러그인은 **레거시 PHP 함수를 PHP 5.6 호환 클래스로 변환**하는 기능만 제공합니다.

**현재 상황:**
- 위치: `plugins/php-code-migrator/`
- 기능: PHP 함수 → Static 메서드 클래스로 변환
- 문제점:
  - 테스트 코드 자동 생성 없음
  - 샘플 데이터 기반 테스트 불가
  - 마이그레이션 가이드 없음
  - 데이터 검증 메커니즘 없음

**목표:**
기존 php-code-migrator를 **확장**하여:
1. ✅ 마이그레이션된 클래스에 대한 데이터 검증 테스트 자동 생성 (PHP 5.6 assert 기반)
2. ✅ myawsdb에서 샘플 데이터 1개 조회 (posts 테이블) → sample.csv 생성
3. ✅ 샘플 데이터 기반 검증 테스트 케이스 자동 생성
4. ✅ 마이그레이션 기본 정보 가이드 생성 (함수명, 클래스명)
5. ✅ Plugin 형태로 `/php-migrate` 스킬로 통합

---

## 🏗️ 구현 전략

### Phase 1: 코어 플러그인 확장 (php-code-migrator++)

**파일 구조:**
```
plugins/php-code-migrator-plus/
├─ index.js                          # 메인 플러그인 (확장)
├─ lib/
│  ├─ PHPCodeMigrator.js             # 기존 마이그레이션 로직 (재사용)
│  ├─ PHPDataValidationTest.js        # 데이터 검증 테스트 생성 (신규)
│  ├─ SampleDataManager.js            # 샘플 데이터 관리 (신규)
│  └─ MigrationGuideGenerator.js      # 가이드 생성 (신규)
├─ templates/
│  ├─ validation-test.template.php    # PHP 5.6 데이터 검증 테스트 템플릿
│  ├─ migration-guide.template.md     # 마이그레이션 가이드 템플릿
│  └─ sample.template.csv             # 샘플 데이터 템플릿
├─ manifest.json                      # 플러그인 메타데이터
└─ README.md                          # 사용 설명서
```

### Phase 2: PHPDataValidationTest (데이터 검증 테스트 생성)

**기능:**
```javascript
class PHPDataValidationTest {
  // 샘플 데이터로 데이터 검증 테스트 생성
  generateValidationTest(className, sampleData)

  // 샘플 데이터 기반 assert 문 생성
  generateAssertions(sampleRecord)

  // PHP 5.6 assert() 기반 테스트 (PHPUnit 없음)
  renderTestScript(assertions)
}
```

**생성되는 PHP 데이터 검증 테스트 예시:**
```php
<?php
// test_posts_data_validation.php
// 샘플 데이터 검증 테스트 (PHP 5.6 assert 기반)

require_once 'lib/Posts.php';

class PostsDataValidationTest
{
    private $postsClass;

    public function __construct()
    {
        $this->postsClass = new Posts();
    }

    public function testSampleDataStructure()
    {
        // Sample data from myawsdb.posts table
        $samplePost = array(
            'id' => 123,
            'title' => 'Sample Post Title',
            'content' => 'Post content here',
            'author_id' => 456,
            'created_at' => '2026-03-15 10:30:00',
            'status' => 'published'
        );

        // 데이터 검증 assert
        assert(is_array($samplePost), 'Data must be array');
        assert(!empty($samplePost['id']), 'id must not be empty');
        assert(is_numeric($samplePost['id']), 'id must be numeric');
        assert(!empty($samplePost['title']), 'title must not be empty');
        assert(is_string($samplePost['title']), 'title must be string');
        assert(!empty($samplePost['created_at']), 'created_at must not be empty');
        assert(strtotime($samplePost['created_at']), 'created_at must be valid datetime');

        echo "✅ Sample data validation passed\n";
    }

    public function testDataTypes()
    {
        $samplePost = array(
            'id' => 123,
            'author_id' => 456,
            'created_at' => '2026-03-15 10:30:00'
        );

        assert(is_int($samplePost['id']), 'id must be integer');
        assert(is_int($samplePost['author_id']), 'author_id must be integer');
        assert(is_string($samplePost['created_at']), 'created_at must be string');

        echo "✅ Data type validation passed\n";
    }

    public function run()
    {
        try {
            $this->testSampleDataStructure();
            $this->testDataTypes();
            echo "\n✅ All validation tests passed!\n";
            return true;
        } catch (AssertionError $e) {
            echo "\n❌ Validation failed: " . $e->getMessage() . "\n";
            return false;
        }
    }
}

// 테스트 실행
$test = new PostsDataValidationTest();
exit($test->run() ? 0 : 1);
```

**테스트 실행:**
```bash
php test_posts_data_validation.php
# 출력:
# ✅ Sample data validation passed
# ✅ Data type validation passed
# ✅ All validation tests passed!
```

### Phase 3: SampleDataManager (샘플 데이터 관리)

**기능:**
```javascript
class SampleDataManager {
  // myawsdb의 posts 테이블에서 샘플 레코드 1개 조회
  async fetchSampleRecord(tableName = 'posts', limit = 1)

  // 샘플 데이터를 CSV 생성
  generateSampleCSV(tableName, records)

  // 샘플 데이터를 PHP 배열로 변환
  convertToPhpArray(records, className)
}
```

**사용 흐름:**
```
1. myawsdb 연결 (HTTP API 이용)
2. posts 테이블에서 레코드 1개 조회
3. sample.csv 생성 (samples/ 디렉토리)
4. PHP 배열로 변환해서 테스트 코드에 주입
```

**생성되는 sample.csv 예시:**
```csv
id,title,content,author_id,created_at,status
123,Sample Post Title,Post content here,456,2026-03-15 10:30:00,published
```

### Phase 4: MigrationGuideGenerator (가이드 생성)

**생성 항목 (기본 정보만):**
```markdown
# 마이그레이션 가이드: Posts

## 원본 함수
get_post_by_id($post_id)

## 마이그레이션 클래스
App\Legacy\Posts::getPostById($post_id)

## 기본 정보
- 함수명: get_post_by_id
- 클래스명: Posts
- 메서드명: getPostById
- 변환 규칙: get_* → *Getter
```

### Phase 5: Plugin 통합 (CLI 커맨드)

**index.js 메인 함수:**
```javascript
module.exports = {
  name: 'php-code-migrator-plus',
  version: '2.0.0',

  async execute(command, options) {
    // 사용 가능 커맨드:
    // - migrate: 코드 마이그레이션
    // - generate-tests: 데이터 검증 테스트 생성
    // - fetch-sample: 샘플 데이터 조회 (posts 테이블)
    // - generate-guide: 마이그레이션 가이드 생성 (기본 정보만)
    // - full: 전체 프로세스 (위 4개 순서 실행)
  }
}
```

---

## 🔄 실행 흐름 (사용자 관점)

### 사용자 수행 작업:

**1단계: 레거시 PHP 파일 준비**
```bash
# 레거시 PHP 파일을 work/ 디렉토리에 복사
cp legacy_posts.php work/legacy_posts.php
```

**2단계: 플러그인 실행 (전체 프로세스)**
```bash
node plugins/php-code-migrator-plus/index.js full \
  --input work/legacy_posts.php \
  --output lib/Posts.php \
  --table_name posts \
  --sample_limit 1
```

**3단계: 생성되는 파일들**
```
output/
├─ Posts.php                        # 마이그레이션 된 클래스
├─ test_posts_data_validation.php   # 데이터 검증 테스트 코드
├─ samples/
│  └─ posts_sample.csv              # myawsdb에서 조회한 샘플 데이터
└─ MIGRATION_GUIDE.md               # 마이그레이션 기본 정보 가이드
```

**4단계: 테스트 실행**
```bash
# PHP 데이터 검증 테스트 실행
php output/test_posts_data_validation.php

# 샘플 데이터 확인
head output/samples/posts_sample.csv
```

---

## 📋 상세 구현 계획

### 1. PHPDataValidationTest.js

**입력:**
- 마이그레이션된 클래스 정보 (className, properties)
- 샘플 데이터 (배열 형식)
- PHP 버전 (5.6)

**출력:**
- PHP 5.6 assert 기반 데이터 검증 테스트 코드

**구현 핵심:**
```javascript
class PHPDataValidationTest {
  generateValidationTest(className, sampleData) {
    // 샘플 데이터의 각 필드 타입 분석
    const fieldTypes = this.analyzeFieldTypes(sampleData[0]);

    // 각 필드에 대한 assert 문 생성
    const assertions = this.generateAssertions(fieldTypes);

    // PHP 테스트 클래스 코드 렌더링
    return this.renderPhpTestClass(className, assertions);
  }

  generateAssertions(fieldTypes) {
    // fieldTypes = { id: 'int', title: 'string', created_at: 'datetime' }
    const assertions = [];

    for (const [field, type] of Object.entries(fieldTypes)) {
      assertions.push(this.createAssertForType(field, type));
    }

    return assertions;
  }

  createAssertForType(field, type) {
    // 타입별 assert 문 생성
    // int → assert(is_int($data['id']))
    // string → assert(is_string($data['title']))
    // datetime → assert(strtotime($data['created_at']))
  }
}
```

### 2. SampleDataManager.js

**입력:**
- myawsdb 연결 정보
- 테이블명 (기본값: 'posts')
- 조회 개수 (기본값: 1)

**출력:**
- 샘플 레코드 배열
- sample.csv 파일

**구현 핵심:**
```javascript
class SampleDataManager {
  async fetchSampleRecord(tableName = 'posts', options = {}) {
    const limit = options.limit || 1;

    // myawsdb MCP 서버 HTTP API 호출
    const response = await axios.post('http://localhost:3009/query', {
      tableName,
      limit,
      offset: 0
    });

    return response.data.records;
  }

  generateSampleCSV(tableName, records) {
    // records = [{ id: 123, title: 'Post', ... }]
    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(','),
      ...records.map(r =>
        headers.map(h => {
          const value = r[h];
          // 쉼표 포함 필드는 따옴표로 감싸기
          return value && value.toString().includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}
```

### 3. MigrationGuideGenerator.js

**입력:**
- 원본 함수명
- 변환된 클래스명
- 변환 규칙

**출력:**
- 마크다운 형식 마이그레이션 기본 정보 가이드

**생성 내용 (기본 정보만):**
- 원본 함수명
- 클래스명
- 메서드명
- 변환 규칙

---

## 🔌 Claude Code 스킬 통합

**.claude/skills/php-migrate/SKILL.md 생성:**
```markdown
# PHP 레거시 코드 마이그레이션

PHP 5.6 버전 호환성을 유지하면서 레거시 함수 기반 코드를
현대식 클래스 기반 코드로 마이그레이션합니다.

## 자동 생성 항목
1. 마이그레이션된 PHP 클래스 (PHP 5.6 호환)
2. 데이터 검증 테스트 코드 (PHP 5.6 assert 기반)
3. 샘플 데이터 CSV (myawsdb.posts에서 자동 조회)
4. 마이그레이션 기본 정보 가이드

## 사용 방법
1. 레거시 PHP 파일 준비: work/legacy_*.php
2. 명령 실행: node plugins/php-code-migrator-plus/index.js full
3. 생성된 파일 확인: output/
4. 데이터 검증 테스트 실행: php test_*_data_validation.php

## 지원 버전
- PHP 5.6 (레거시 유지)
- PHP 7.0+ (마이그레이션 대상)

## 포함 기능
- ✅ Static 메서드 클래스로 자동 변환
- ✅ 데이터 검증 테스트 코드 자동 생성 (PHP 5.6 assert)
- ✅ myawsdb.posts 샘플 데이터 자동 조회
- ✅ 마이그레이션 기본 정보 가이드 생성
```

---

## 📊 파일 수정 목록

### 신규 생성 파일:
1. `plugins/php-code-migrator-plus/index.js` (메인)
2. `plugins/php-code-migrator-plus/lib/PHPDataValidationTest.js`
3. `plugins/php-code-migrator-plus/lib/SampleDataManager.js`
4. `plugins/php-code-migrator-plus/lib/MigrationGuideGenerator.js`
5. `plugins/php-code-migrator-plus/templates/validation-test.template.php`
6. `plugins/php-code-migrator-plus/templates/migration-guide.template.md`
7. `plugins/php-code-migrator-plus/manifest.json`
8. `.claude/skills/php-migrate/SKILL.md`

### 기존 파일 수정:
1. `package.json` - 스크립트 추가 (`php:migrate`, `php:test` 등)

### 재사용 파일:
- `plugins/php-code-migrator/lib/PHPCodeMigrator.js` (기존 로직)

---

## ✅ 검증 계획

### 테스트 케이스:

**테스트 1: 기본 마이그레이션 + 데이터 검증 테스트 생성**
```bash
# 입력: work/legacy_posts.php (간단한 get_post_by_id 함수)
# 예상 출력:
# - output/Posts.php (마이그레이션 클래스)
# - output/test_posts_data_validation.php (데이터 검증 테스트)
# - output/samples/posts_sample.csv (1개 샘플 레코드)
# - output/MIGRATION_GUIDE.md (기본 정보 가이드)

# 검증:
# 1. 클래스 문법 검증: php -l output/Posts.php
# 2. 테스트 실행: php output/test_posts_data_validation.php
# 3. CSV 형식 검증: head output/samples/posts_sample.csv
# 4. 가이드 생성 확인: cat output/MIGRATION_GUIDE.md
```

**테스트 2: myawsdb 샘플 데이터 자동 조회**
```bash
# 입력: 테이블명 = 'posts' (myawsdb에 존재하는 테이블)
# 예상 출력:
# - samples/posts_sample.csv (myawsdb에서 1개 레코드 조회)

# 검증:
# 1. 파일 존재 확인: ls -lh samples/posts_sample.csv
# 2. 컬럼명 확인: head -1 samples/posts_sample.csv
# 3. 데이터 정합성: wc -l samples/posts_sample.csv (2줄 = 헤더 + 1개 데이터)
```

**테스트 3: PHP 데이터 검증 테스트 실행**
```bash
# 생성된 테스트 코드 실행
php output/test_posts_data_validation.php

# 예상 결과:
# ✅ Sample data validation passed
# ✅ Data type validation passed
# ✅ All validation tests passed!
```

---

## 🚀 다음 단계

이 계획이 승인되면:

**Phase 1: 코어 플러그인 개발** (1.5시간)
- PHPDataValidationTest 구현
- SampleDataManager 구현
- MigrationGuideGenerator 구현

**Phase 2: 템플릿 작성** (20분)
- 데이터 검증 테스트 템플릿
- 마이그레이션 가이드 템플릿

**Phase 3: Claude 스킬 통합** (30분)
- `/php-migrate` 스킬 생성
- npm 스크립트 추가

**Phase 4: 테스트 및 검증** (1시간)
- 샘플 PHP 파일로 테스트
- myawsdb 연동 테스트
- 전체 워크플로우 테스트

---

## 📝 Notes

- PHP 5.6 호환성 유지 (타입 힌트 미사용)
- myawsdb는 이미 MCP 서버(포트 3009)로 운영 중이므로 HTTP 호출로 연동 가능
- 샘플 데이터는 1개만 조회 (개인정보 보호)
- 테스트 코드는 PHP assert() 기반 (PHPUnit 미사용)
- 마이그레이션 가이드는 기본 정보만 포함 (함수명, 클래스명)

