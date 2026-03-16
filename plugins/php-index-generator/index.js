#!/usr/bin/env node

/**
 * index.js
 * PHP Index Generator CLI 진입점
 *
 * 사용법:
 *   node index.js build --source work/mobile --force
 *   node index.js search --symbol "Helper"
 *   node index.js info --symbol "Helper::cache_get"
 *   node index.js list --file "lotto/index.php"
 *   node index.js goto --symbol "Helper"
 */

const IndexBuilder = require('./lib/IndexBuilder');
const IndexSearcher = require('./lib/IndexSearcher');
const path = require('path');

class PHPIndexGenerator {
  constructor() {
    this.builder = new IndexBuilder({
      sourceDir: 'work/mobile',
      outputDir: path.join(__dirname, 'output'),
      cacheDir: '.claude/php-index-cache'
    });

    this.searcher = new IndexSearcher(path.join(__dirname, 'output', 'index.json'));
  }

  /**
   * 메인 실행 함수
   */
  async run() {
    const command = process.argv[2];
    const args = this.parseArgs(process.argv.slice(3));

    try {
      switch (command) {
        case 'build':
          await this.cmdBuild(args);
          break;

        case 'search':
          await this.cmdSearch(args);
          break;

        case 'info':
          await this.cmdInfo(args);
          break;

        case 'list':
          await this.cmdList(args);
          break;

        case 'goto':
          await this.cmdGoto(args);
          break;

        case 'help':
        case '-h':
        case '--help':
          this.showHelp();
          break;

        default:
          console.log('🔍 PHP Index Generator\n');
          this.showHelp();
          process.exit(0);
      }
    } catch (error) {
      console.error(`\n❌ 오류: ${error.message}\n`);
      process.exit(1);
    }
  }

  /**
   * 커맨드라인 인수를 파싱합니다.
   */
  parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith('--')) {
        const key = argv[i].substring(2);
        const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
        args[key] = value;
        if (value !== true) i++;
      }
    }
    return args;
  }

  /**
   * build 커맨드
   */
  async cmdBuild(args) {
    console.log('\n🔍 PHP Index Generator - Build\n');

    // 옵션 적용
    if (args.source) {
      this.builder.options.sourceDir = args.source;
    }
    if (args.output) {
      this.builder.options.outputDir = args.output;
    }
    if (args['cache-dir']) {
      this.builder.options.cacheDir = args['cache-dir'];
    }

    console.log(`📂 소스 디렉토리: ${this.builder.options.sourceDir}`);
    console.log(`📁 출력 위치: ${this.builder.options.outputDir}\n`);

    const result = await this.builder.build({
      force: args.force === true,
      verbose: args.verbose === true
    });

    if (result.success) {
      console.log('\n✅ 색인 생성 완료!');
      console.log(`  • 처리 파일: ${result.processedFiles}/${result.totalFiles}개`);
      console.log(`  • 총 심볼: ${result.totalSymbols}개`);
      console.log(`  • 소요 시간: ${(result.buildTime / 1000).toFixed(2)}초`);
      console.log(`  • 모드: ${result.mode}\n`);
    } else {
      console.log('\n❌ 색인 생성 실패!');
      console.log(`  • 오류: ${result.error}\n`);
      process.exit(1);
    }
  }

  /**
   * search 커맨드
   */
  async cmdSearch(args) {
    if (!args.symbol) {
      console.error('❌ --symbol 옵션이 필요합니다.');
      process.exit(1);
    }

    console.log(`\n🔍 검색: "${args.symbol}"\n`);

    await this.searcher.loadIndex();

    const results = this.searcher.search(args.symbol, {
      type: args.type || null,
      exact: args.exact === true,
      limit: parseInt(args.limit || '10'),
      namespace: args.namespace || null
    });

    if (results.length === 0) {
      console.log('검색 결과가 없습니다.\n');
      return;
    }

    console.log(`📌 결과 (${results.length}개 발견):\n`);

    results.forEach((result, index) => {
      const displayName = result.name.split('::')[1] || result.name;
      console.log(`${index + 1}. ${displayName} (${result.type})`);
      console.log(`   📄 ${result.file}:${result.line}`);
      console.log(`   📏 점수: ${(result.score * 100).toFixed(0)}%\n`);
    });
  }

  /**
   * info 커맨드
   */
  async cmdInfo(args) {
    await this.searcher.loadIndex();

    if (args.status === true) {
      // 색인 상태 조회
      const stats = this.searcher.getStats();
      console.log('\n📋 색인 상태\n');
      console.log(`  • 파일: ${stats.totalFiles}개`);
      console.log(`  • 심볼: ${stats.totalSymbols}개`);
      if (stats.metadata) {
        console.log(`  • PHP 버전: ${stats.metadata.php_version || 'N/A'}`);
        console.log(`  • 빌드 시간: ${stats.metadata.buildTime || 'N/A'}ms`);
      }
      console.log();
      return;
    }

    if (!args.symbol) {
      console.error('❌ --symbol 옵션이 필요합니다.');
      process.exit(1);
    }

    const info = this.searcher.getSymbolInfo(args.symbol);

    if (!info) {
      console.log(`\n❌ 심볼을 찾을 수 없습니다: ${args.symbol}\n`);
      return;
    }

    console.log(`\n📋 심볼 정보: ${args.symbol}\n`);
    console.log(`📄 파일: ${info.file}`);
    console.log(`📍 라인: ${info.line}`);
    console.log(`🔗 타입: ${info.type}`);

    if (info.extends) {
      console.log(`👨 상속: ${info.extends}`);
    }

    if (info.implements && info.implements.length > 0) {
      console.log(`✅ 인터페이스: ${info.implements.join(', ')}`);
    }

    if (info.members && Object.keys(info.members).length > 0) {
      console.log('\n🔧 멤버:');
      for (const [name, member] of Object.entries(info.members)) {
        console.log(`  • ${name} (${member.type}, ${member.visibility || 'N/A'}) @ ${member.line}줄`);
      }
    }

    console.log();
  }

  /**
   * list 커맨드
   */
  async cmdList(args) {
    await this.searcher.loadIndex();

    if (args.file) {
      // 파일별 심볼 조회
      const results = [];
      for (const [fqcn, symbol] of Object.entries(this.searcher.index.symbols)) {
        if (symbol.file === args.file) {
          results.push({ name: fqcn, ...symbol });
        }
      }

      if (results.length === 0) {
        console.log(`\n파일 ${args.file}에서 심볼을 찾을 수 없습니다.\n`);
        return;
      }

      console.log(`\n📄 파일: ${args.file}\n`);
      results.forEach(r => {
        console.log(`  • ${r.name.split('::')[1]} (${r.type})`);
      });
      console.log();
      return;
    }

    if (args.type) {
      // 타입별 심볼 조회
      const results = this.searcher.searchByType(args.type, 100);

      console.log(`\n🔗 타입: ${args.type} (${results.length}개)\n`);
      results.slice(0, 20).forEach(r => {
        console.log(`  • ${r.name}`);
      });

      if (results.length > 20) {
        console.log(`  ... 외 ${results.length - 20}개`);
      }
      console.log();
      return;
    }

    console.error('❌ --file 또는 --type 옵션이 필요합니다.');
    process.exit(1);
  }

  /**
   * goto 커맨드 (정의로 이동)
   */
  async cmdGoto(args) {
    if (!args.symbol) {
      console.error('❌ --symbol 옵션이 필요합니다.');
      process.exit(1);
    }

    await this.searcher.loadIndex();

    const location = this.searcher.findDefinition(args.symbol);

    if (!location) {
      console.log(`\n심볼을 찾을 수 없습니다: ${args.symbol}\n`);
      return;
    }

    if (args.format === 'json') {
      console.log(JSON.stringify(location, null, 2));
    } else {
      console.log(`\n📍 정의 위치\n`);
      console.log(`  심볼: ${location.symbol}`);
      console.log(`  파일: ${location.file}`);
      console.log(`  라인: ${location.line}`);
      console.log(`  타입: ${location.type}`);
      console.log(`  URL: file://${location.file}:${location.line}\n`);
    }
  }

  /**
   * 도움말 표시
   */
  showHelp() {
    console.log(`📖 도움말\n`);
    console.log(`명령어:\n`);
    console.log(`  build       - 색인 생성`);
    console.log(`    옵션: --source <dir> --output <dir> --force --verbose\n`);

    console.log(`  search      - 심볼 검색`);
    console.log(`    옵션: --symbol <name> --type <type> --exact --limit <n>\n`);

    console.log(`  info        - 심볼 정보 조회`);
    console.log(`    옵션: --symbol <name> 또는 --status\n`);

    console.log(`  list        - 파일/타입별 심볼 목록`);
    console.log(`    옵션: --file <path> 또는 --type <type>\n`);

    console.log(`  goto        - 정의 위치 찾기`);
    console.log(`    옵션: --symbol <name> --format <json|plain>\n`);

    console.log(`  help        - 도움말 표시\n`);

    console.log(`예제:\n`);
    console.log(`  node index.js build --source work/mobile --force`);
    console.log(`  node index.js search --symbol "Helper" --type class`);
    console.log(`  node index.js goto --symbol "Helper::cache_get" --format json\n`);
  }
}

// 메인 실행
const app = new PHPIndexGenerator();
app.run().catch(error => {
  console.error(`\n❌ 예기치 않은 오류: ${error.message}\n`);
  process.exit(1);
});
