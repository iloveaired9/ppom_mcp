/**
 * MigrationGuideGenerator
 * PHP 레거시 코드 마이그레이션 가이드 생성 (기본 정보만)
 */

const fs = require('fs');
const path = require('path');

class MigrationGuideGenerator {
  constructor(options = {}) {
    this.options = {
      phpVersion: '5.6',
      outputDir: 'output',
      ...options
    };
  }

  /**
   * 마이그레이션 가이드 생성 (기본 정보만)
   * @param {string} originalFunctionName - 원본 함수명
   * @param {string} migratedClassName - 마이그레이션된 클래스명
   * @param {object} migrationInfo - 마이그레이션 정보
   * @returns {string} 마크다운 가이드
   */
  generateBasicGuide(originalFunctionName, migratedClassName, migrationInfo = {}) {
    const {
      description = '마이그레이션된 PHP 클래스',
      migrationRule = this.inferMigrationRule(originalFunctionName, migratedClassName),
      methodName = this.convertFunctionNameToMethodName(originalFunctionName)
    } = migrationInfo;

    return `# 마이그레이션 가이드: ${migratedClassName}

## 원본 함수
\`\`\`php
${originalFunctionName}()
\`\`\`

## 마이그레이션 클래스
\`\`\`php
${migratedClassName}::${methodName}()
\`\`\`

## 기본 정보

### 함수명
\`${originalFunctionName}\`

### 클래스명
\`${migratedClassName}\`

### 메서드명
\`${methodName}\`

### 변환 규칙
${migrationRule}

### 설명
${description}

---

## 사용 방법

### 변환 전
\`\`\`php
require_once 'legacy/${originalFunctionName}.php';

$result = ${originalFunctionName}($param1, $param2);
\`\`\`

### 변환 후
\`\`\`php
require_once 'lib/${migratedClassName}.php';

$${migratedClassName} = new ${migratedClassName}();
$result = $${migratedClassName}->${methodName}($param1, $param2);
\`\`\`

---

## 마이그레이션 날짜
${new Date().toISOString().split('T')[0]}

## PHP 버전
- 레거시 유지: PHP 5.6+
- 마이그레이션 대상: PHP 7.0+
`;
  }

  /**
   * 마이그레이션 규칙 추론
   * @param {string} originalFunctionName - 원본 함수명
   * @param {string} migratedClassName - 마이그레이션된 클래스명
   * @returns {string} 마이그레이션 규칙 설명
   */
  inferMigrationRule(originalFunctionName, migratedClassName) {
    const rules = [];

    // get_* → *Getter 규칙
    if (originalFunctionName.startsWith('get_')) {
      rules.push(`- **get_ prefix 제거**: \`get_user_by_id\` → \`UserById\` 클래스`);
      rules.push(`- **클래스명 형식**: ${migratedClassName} (PascalCase)`);
      rules.push(`- **메서드명**: 원본 함수명에서 get_ 제거 후 camelCase 변환`);
    }

    // is_* → *Validator 규칙
    if (originalFunctionName.startsWith('is_')) {
      rules.push(`- **is_ prefix 제거**: \`is_valid_email\` → \`ValidEmailValidator\` 클래스`);
      rules.push(`- **클래스명 형식**: ${migratedClassName} (PascalCase)`);
      rules.push(`- **메서드명**: 원본 함수명에서 is_ 제거 후 camelCase 변환`);
    }

    // set_* → *Setter 규칙
    if (originalFunctionName.startsWith('set_')) {
      rules.push(`- **set_ prefix 제거**: \`set_user_name\` → \`UserName\` 클래스`);
      rules.push(`- **클래스명 형식**: ${migratedClassName} (PascalCase)`);
      rules.push(`- **메서드명**: 원본 함수명에서 set_ 제거 후 camelCase 변환`);
    }

    // 일반 규칙
    if (rules.length === 0) {
      rules.push(`- **클래스명**: ${migratedClassName} (PascalCase)`);
      rules.push(`- **메서드명**: ${this.convertFunctionNameToMethodName(originalFunctionName)} (camelCase)`);
      rules.push(`- **Static 메서드**: 클래스 메서드로 변환 (인스턴스 생성 필요)`);
    } else {
      rules.push(`- **Static 메서드**: 클래스 메서드로 변환 (인스턴스 생성 필요)`);
    }

    return rules.map(r => '  ' + r).join('\n');
  }

  /**
   * 함수명을 메서드명으로 변환 (camelCase)
   * @param {string} functionName - 함수명
   * @returns {string} 메서드명
   */
  convertFunctionNameToMethodName(functionName) {
    // get_user_by_id → getUserById
    return functionName
      .replace(/^(get|set|is|has|can)_/, '') // prefix 제거
      .split('_')
      .map((part, index) => {
        if (index === 0) {
          return part.toLowerCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * 마이그레이션 가이드를 파일로 저장
   * @param {string} originalFunctionName - 원본 함수명
   * @param {string} migratedClassName - 마이그레이션된 클래스명
   * @param {string} outputPath - 출력 파일 경로
   * @param {object} options - 옵션
   * @returns {string} 저장된 파일 경로
   */
  saveGuide(originalFunctionName, migratedClassName, outputPath = null, options = {}) {
    try {
      const guide = this.generateBasicGuide(originalFunctionName, migratedClassName, options);

      const filePath = outputPath || path.join(
        this.options.outputDir,
        `MIGRATION_GUIDE_${migratedClassName}.md`
      );

      // 디렉토리 생성
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 파일 저장
      fs.writeFileSync(filePath, guide, 'utf8');

      console.log(`✅ Migration guide saved: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save guide: ${error.message}`);
      throw new Error(`Guide generation failed: ${error.message}`);
    }
  }

  /**
   * 다중 함수의 마이그레이션 가이드 생성
   * @param {array} functions - 함수 정보 배열 [{ originalName, className }, ...]
   * @param {object} options - 옵션
   * @returns {array} 생성된 파일 경로 배열
   */
  generateMultipleGuides(functions, options = {}) {
    const files = [];

    for (const func of functions) {
      try {
        const filePath = this.saveGuide(
          func.originalName,
          func.className,
          null,
          options
        );
        files.push(filePath);
      } catch (error) {
        console.error(`⚠️ Failed to generate guide for ${func.originalName}: ${error.message}`);
      }
    }

    return files;
  }

  /**
   * 마이그레이션 체크리스트 생성
   * @param {string} migratedClassName - 마이그레이션된 클래스명
   * @returns {string} 체크리스트 마크다운
   */
  generateChecklist(migratedClassName) {
    return `## ✅ 마이그레이션 체크리스트: ${migratedClassName}

### 코드 검토
- [ ] 원본 함수 동작 확인
- [ ] 마이그레이션 된 클래스 문법 검증 (\`php -l\`)
- [ ] 데이터 검증 테스트 통과

### 통합
- [ ] 기존 코드베이스에서 함수 호출 찾기
- [ ] 함수 호출을 클래스 메서드로 변경
- [ ] 의존성 주입 필요시 리팩토링

### 검증
- [ ] 로컬 환경에서 테스트 실행
- [ ] 스테이징 환경에서 통합 테스트
- [ ] 프로덕션 배포 전 최종 검증

### 배포
- [ ] 레거시 함수 파일 백업
- [ ] 새로운 클래스 배포
- [ ] 모니터링 설정
- [ ] 문제 발생 시 롤백 계획 확인
`;
  }
}

module.exports = MigrationGuideGenerator;
