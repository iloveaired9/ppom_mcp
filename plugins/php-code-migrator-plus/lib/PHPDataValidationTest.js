/**
 * PHPDataValidationTest
 * PHP 5.6 기반 데이터 검증 테스트 코드 생성
 */

class PHPDataValidationTest {
  constructor(options = {}) {
    this.options = {
      phpVersion: '5.6',
      useAssert: true,
      ...options
    };
  }

  /**
   * 샘플 데이터로부터 PHP 데이터 검증 테스트 클래스 생성
   * @param {string} className - 클래스명 (예: Posts)
   * @param {object} sampleRecord - 샘플 데이터 (예: { id: 123, title: '...' })
   * @returns {string} PHP 테스트 클래스 코드
   */
  generateValidationTest(className, sampleRecord) {
    // 필드 타입 분석
    const fieldAnalysis = this.analyzeFieldTypes(sampleRecord);

    // Assert 문 생성
    const assertions = this.generateAssertions(fieldAnalysis);

    // PHP 테스트 클래스 렌더링
    return this.renderPhpTestClass(className, assertions, sampleRecord);
  }

  /**
   * 샘플 데이터의 필드 타입 분석
   * @param {object} record - 샘플 레코드
   * @returns {object} 필드별 타입 정보
   */
  analyzeFieldTypes(record) {
    const analysis = {};

    for (const [field, value] of Object.entries(record)) {
      analysis[field] = {
        type: this.inferType(value),
        isEmpty: this.isEmpty(value),
        value: value,
        isNumeric: this.isNumeric(value),
        isDatetime: this.isDatetime(value)
      };
    }

    return analysis;
  }

  /**
   * 값의 타입 추론
   * @param {*} value
   * @returns {string} 타입 문자열
   */
  inferType(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (Number.isInteger(value)) {
      return 'int';
    }
    if (typeof value === 'number') {
      return 'float';
    }
    if (typeof value === 'boolean') {
      return 'bool';
    }
    if (typeof value === 'string') {
      // 문자열에서 특수 타입 추론
      if (this.isDatetime(value)) {
        return 'datetime';
      }
      if (this.isEmail(value)) {
        return 'email';
      }
      if (this.isUrl(value)) {
        return 'url';
      }
      return 'string';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    return 'object';
  }

  /**
   * 값이 비어있는지 확인
   * @param {*} value
   * @returns {boolean}
   */
  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * 값이 숫자인지 확인
   * @param {*} value
   * @returns {boolean}
   */
  isNumeric(value) {
    if (typeof value === 'number') return true;
    if (typeof value === 'string') {
      return !isNaN(value) && !isNaN(parseFloat(value));
    }
    return false;
  }

  /**
   * 값이 datetime 형식인지 확인
   * @param {*} value
   * @returns {boolean}
   */
  isDatetime(value) {
    if (typeof value !== 'string') return false;
    // 기본 datetime 패턴: YYYY-MM-DD HH:MM:SS 또는 YYYY-MM-DD
    const datetimePattern = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/;
    return datetimePattern.test(value);
  }

  /**
   * 값이 이메일 형식인지 확인
   * @param {*} value
   * @returns {boolean}
   */
  isEmail(value) {
    if (typeof value !== 'string') return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  }

  /**
   * 값이 URL 형식인지 확인
   * @param {*} value
   * @returns {boolean}
   */
  isUrl(value) {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 필드별 Assert 문 생성
   * @param {object} fieldAnalysis - 필드 분석 정보
   * @returns {array} Assert 문 배열
   */
  generateAssertions(fieldAnalysis) {
    const assertions = [];

    for (const [field, analysis] of Object.entries(fieldAnalysis)) {
      const fieldAssertions = this.createAssertForField(field, analysis);
      assertions.push(...fieldAssertions);
    }

    return assertions;
  }

  /**
   * 필드에 대한 assert 문 생성
   * @param {string} field - 필드명
   * @param {object} analysis - 필드 분석 정보
   * @returns {array} Assert 문 배열
   */
  createAssertForField(field, analysis) {
    const assertions = [];
    const { type, isEmpty, isNumeric, isDatetime, value } = analysis;

    // 비워있지 않은 필드는 not empty 체크
    if (!isEmpty && type !== 'null') {
      assertions.push({
        condition: `!empty($data['${field}'])`,
        message: `'${field} must not be empty'`
      });
    }

    // 타입별 assert
    switch (type) {
      case 'int':
        assertions.push({
          condition: `is_int($data['${field}'])`,
          message: `'${field} must be integer'`
        });
        break;

      case 'float':
        assertions.push({
          condition: `is_float($data['${field}'])`,
          message: `'${field} must be float'`
        });
        break;

      case 'string':
      case 'email':
      case 'url':
        assertions.push({
          condition: `is_string($data['${field}'])`,
          message: `'${field} must be string'`
        });
        break;

      case 'datetime':
        assertions.push({
          condition: `is_string($data['${field}'])`,
          message: `'${field} must be string (datetime)'`
        });
        assertions.push({
          condition: `strtotime($data['${field}'])`,
          message: `'${field} must be valid datetime'`
        });
        break;

      case 'bool':
        assertions.push({
          condition: `is_bool($data['${field}'])`,
          message: `'${field} must be boolean'`
        });
        break;

      case 'array':
        assertions.push({
          condition: `is_array($data['${field}'])`,
          message: `'${field} must be array'`
        });
        break;
    }

    return assertions;
  }

  /**
   * PHP 데이터 검증 테스트 클래스 렌더링
   * @param {string} className - 클래스명
   * @param {array} assertions - Assert 문 배열
   * @param {object} sampleRecord - 샘플 레코드
   * @returns {string} PHP 코드
   */
  renderPhpTestClass(className, assertions, sampleRecord) {
    const testClassName = className + 'DataValidationTest';
    const testMethodName = 'testSampleData';

    // 샘플 데이터를 PHP 배열로 변환
    const phpArrayCode = this.convertToPhpArray(sampleRecord);

    // Assert 문을 PHP 코드로 변환
    const phpAssertions = assertions
      .map(a => `        assert(${a.condition}, ${a.message});`)
      .join('\n');

    return `<?php
// ${testClassName}.php
// 데이터 검증 테스트 (PHP 5.6 assert 기반)

class ${testClassName}
{
    public function ${testMethodName}()
    {
        // Sample data from myawsdb
        $data = ${phpArrayCode};

        // 데이터 검증 assert
${phpAssertions}

        echo "✅ Sample data validation passed\\n";
        return true;
    }

    public function run()
    {
        try {
            $this->${testMethodName}();
            echo "\\n✅ All validation tests passed!\\n";
            return true;
        } catch (AssertionError $e) {
            echo "\\n❌ Validation failed: " . $e->getMessage() . "\\n";
            return false;
        }
    }
}

// 테스트 실행
if (php_sapi_name() === 'cli') {
    $test = new ${testClassName}();
    exit($test->run() ? 0 : 1);
}
`;
  }

  /**
   * 샘플 데이터를 PHP 배열로 변환
   * @param {object} record - 샘플 레코드
   * @returns {string} PHP 배열 코드
   */
  convertToPhpArray(record) {
    const lines = [];
    lines.push('array(');

    for (const [field, value] of Object.entries(record)) {
      const phpValue = this.convertToPhpValue(value);
      lines.push(`            '${field}' => ${phpValue},`);
    }

    lines.push('        )');

    return lines.join('\n');
  }

  /**
   * 값을 PHP 리터럴로 변환
   * @param {*} value
   * @returns {string} PHP 코드
   */
  convertToPhpValue(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      // 작은 따옴표로 감싸고 이스케이프
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `'${escaped}'`;
    }
    if (Array.isArray(value)) {
      return 'array(' + value.map(v => this.convertToPhpValue(v)).join(', ') + ')';
    }
    // 객체는 간단히 처리
    return "'{}'";
  }
}

module.exports = PHPDataValidationTest;
