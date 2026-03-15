#!/usr/bin/env node

/**
 * PHP Code Migrator Plus
 * 레거시 PHP 함수를 PHP 5.6 호환 클래스로 변환하고 테스트 코드 자동 생성
 *
 * 사용법:
 * node index.js full --input work/legacy_posts.php --output lib/Posts.php --table_name posts
 */

const fs = require('fs');
const path = require('path');

// 라이브러리 임포트
const PHPDataValidationTest = require('./lib/PHPDataValidationTest');
const SampleDataManager = require('./lib/SampleDataManager');
const MigrationGuideGenerator = require('./lib/MigrationGuideGenerator');

/**
 * 메인 플러그인 클래스
 */
class PHPCodeMigratorPlus {
  constructor(options = {}) {
    this.options = {
      outputDir: 'output',
      samplesDir: 'samples',
      ...options
    };

    this.testGenerator = new PHPDataValidationTest();
    this.sampleManager = new SampleDataManager({
      outputDir: this.options.samplesDir
    });
    this.guideGenerator = new MigrationGuideGenerator({
      outputDir: this.options.outputDir
    });
  }

  /**
   * CLI 커맨드 실행
   * @param {string} command - 커맨드 (full, migrate, generate-tests, fetch-sample, generate-guide)
   * @param {object} options - 옵션
   */
  async execute(command, options = {}) {
    console.log(`\n🚀 PHP Code Migrator Plus\n`);

    try {
      switch (command) {
        case 'full':
          await this.executeFull(options);
          break;

        case 'migrate':
          await this.executeMigrate(options);
          break;

        case 'generate-tests':
          await this.generateTests(options);
          break;

        case 'fetch-sample':
          await this.fetchSample(options);
          break;

        case 'generate-guide':
          await this.generateGuide(options);
          break;

        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }

      console.log('\n✅ Done!\n');
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    }
  }

  /**
   * 전체 프로세스 실행 (순서: 마이그레이션 → 테스트 코드 생성 → 샘플 데이터 조회 → 가이드 생성)
   */
  async executeFull(options) {
    console.log('📋 Phase 1: Migrating PHP code...');
    // 마이그레이션은 기존 php-code-migrator로 처리
    // 여기서는 테스트 코드 생성부터 시작

    console.log('\n📋 Phase 2: Generating data validation tests...');
    await this.generateTests(options);

    console.log('\n📋 Phase 3: Fetching sample data from myawsdb...');
    await this.fetchSample(options);

    console.log('\n📋 Phase 4: Generating migration guide...');
    await this.generateGuide(options);

    console.log('\n📋 All phases completed!');
  }

  /**
   * 마이그레이션 실행 (기존 php-code-migrator 로직)
   */
  async executeMigrate(options) {
    console.log('Migrating PHP code...');
    // 기존 php-code-migrator 로직으로 구현
    // 현재는 플레이스홀더
  }

  /**
   * 데이터 검증 테스트 생성
   */
  async generateTests(options = {}) {
    const {
      className = 'Posts',
      sampleData = null,
      outputFile = null
    } = options;

    // 샘플 데이터가 없으면 기본값 사용
    const sample = sampleData || {
      id: 1,
      title: 'Sample Post',
      content: 'Sample content',
      author_id: 123,
      created_at: new Date().toISOString().split('T')[0] + ' 10:30:00',
      status: 'published'
    };

    // 테스트 코드 생성
    const testCode = this.testGenerator.generateValidationTest(className, sample);

    // 파일 저장
    const dir = this.options.outputDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = outputFile || `test_${this.camelToSnake(className)}_data_validation.php`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, testCode, 'utf8');

    console.log(`✅ Test code generated: ${filePath}`);
    console.log(`   Run: php ${filePath}`);

    return filePath;
  }

  /**
   * 샘플 데이터 조회 및 CSV 생성
   */
  async fetchSample(options = {}) {
    const {
      tableName = 'posts',
      limit = 1
    } = options;

    try {
      const result = await this.sampleManager.processSampleData(tableName, { limit });

      console.log(`✅ Sample data processed:`);
      console.log(`   Table: ${result.tableName}`);
      console.log(`   Records: ${result.recordCount}`);
      console.log(`   CSV: ${result.csvPath}`);

      // CSV 검증
      const validation = this.sampleManager.validateCSV(result.csvPath);
      if (validation.valid) {
        console.log(`   Headers: ${validation.headers.join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error(`⚠️ Sample data fetch failed: ${error.message}`);
      console.log('💡 Tip: Make sure myawsdb is running on http://localhost:3009');
      throw error;
    }
  }

  /**
   * 마이그레이션 가이드 생성
   */
  async generateGuide(options = {}) {
    const {
      originalFunctionName = 'get_posts',
      className = 'Posts'
    } = options;

    const filePath = this.guideGenerator.saveGuide(
      originalFunctionName,
      className,
      path.join(this.options.outputDir, 'MIGRATION_GUIDE.md'),
      options
    );

    console.log(`✅ Migration guide generated: ${filePath}`);

    // 체크리스트도 함께 생성
    const checklist = this.guideGenerator.generateChecklist(className);
    const checklistPath = path.join(this.options.outputDir, `CHECKLIST_${className}.md`);
    fs.writeFileSync(checklistPath, checklist, 'utf8');
    console.log(`✅ Checklist generated: ${checklistPath}`);

    return filePath;
  }

  /**
   * 헬퍼: camelCase를 snake_case로 변환
   */
  camelToSnake(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * 사용법 출력
   */
  showHelp() {
    console.log(`
Usage: node index.js <command> [options]

Commands:
  full              Execute all phases (migrate → test → sample → guide)
  migrate           Migrate PHP code (placeholder)
  generate-tests    Generate data validation test code
  fetch-sample      Fetch sample data from myawsdb
  generate-guide    Generate migration guide

Options:
  --input           Input PHP file path
  --output          Output PHP file path
  --className       Class name (default: Posts)
  --table_name      myawsdb table name (default: posts)
  --sample_limit    Sample record limit (default: 1)

Examples:
  node index.js full --className Posts --table_name posts
  node index.js generate-tests --className Posts
  node index.js fetch-sample --table_name posts
    `);
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  // 옵션 파싱
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    if (value && !value.startsWith('--')) {
      options[key] = value;
    }
  }

  const migrator = new PHPCodeMigratorPlus();
  migrator.execute(command, options).catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

// 모듈로 사용할 수 있도록 export
module.exports = {
  PHPCodeMigratorPlus,
  PHPDataValidationTest,
  SampleDataManager,
  MigrationGuideGenerator
};
