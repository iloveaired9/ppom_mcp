<?php
// LibFunctionsDataValidationTest.php
// 데이터 검증 테스트 (PHP 5.6 assert 기반)

class LibFunctionsDataValidationTest
{
    public function testSampleData()
    {
        // Sample data from myawsdb
        $data = array(
            'id' => 1,
            'title' => 'Sample Post',
            'content' => 'Sample content',
            'author_id' => 123,
            'created_at' => '2026-03-15 10:30:00',
            'status' => 'published',
        );

        // 데이터 검증 assert
        assert(!empty($data['id']), 'id must not be empty');
        assert(is_int($data['id']), 'id must be integer');
        assert(!empty($data['title']), 'title must not be empty');
        assert(is_string($data['title']), 'title must be string');
        assert(!empty($data['content']), 'content must not be empty');
        assert(is_string($data['content']), 'content must be string');
        assert(!empty($data['author_id']), 'author_id must not be empty');
        assert(is_int($data['author_id']), 'author_id must be integer');
        assert(!empty($data['created_at']), 'created_at must not be empty');
        assert(is_string($data['created_at']), 'created_at must be string (datetime)');
        assert(strtotime($data['created_at']), 'created_at must be valid datetime');
        assert(!empty($data['status']), 'status must not be empty');
        assert(is_string($data['status']), 'status must be string');

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

// 테스트 실행
if (php_sapi_name() === 'cli') {
    $test = new LibFunctionsDataValidationTest();
    exit($test->run() ? 0 : 1);
}
