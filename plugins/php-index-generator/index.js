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

        case 'build-all':
          await this.cmdBuildAll(args);
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

        case 'refs':
        case 'references':
          await this.cmdReferences(args);
          break;

        case 'deps':
        case 'dependencies':
          await this.cmdDependencies(args);
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
   * 폴더별 순차 처리 (build-all 커맨드)
   */
  async cmdBuildAll(args) {
    const fs = require('fs');
    const path = require('path');

    console.log('\n🔨 PHP Index Generator - Build All (폴더별 순차 처리)\n');

    const sourceBase = args.source || 'work/mobile';

    // 주요 폴더 목록 (크기 순서)
    const folders = ['mobile', 'common', 'ppomppu'];
    const folderPaths = folders
      .map(folder => ({
        name: folder,
        path: path.join(sourceBase, folder),
        exists: fs.existsSync(path.join(sourceBase, folder))
      }))
      .filter(f => f.exists);

    if (folderPaths.length === 0) {
      console.log(`❌ 처리할 폴더가 없습니다. (${sourceBase})\n`);
      process.exit(1);
    }

    console.log(`📁 처리 대상 폴더 (${folderPaths.length}개):`);
    folderPaths.forEach((f, i) => {
      const fileCount = this.countPhpFiles(f.path);
      console.log(`  ${i + 1}. ${f.name} (${fileCount}개 파일)`);
    });
    console.log('');

    let totalSymbols = 0;
    let totalFiles = 0;
    const startTime = Date.now();

    // 폴더별 순차 처리
    for (let i = 0; i < folderPaths.length; i++) {
      const folder = folderPaths[i];
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 [${i + 1}/${folderPaths.length}] ${folder.name} 폴더 처리 중...`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // 각 폴더마다 새로운 IndexBuilder 생성 (메모리 초기화)
      const builder = new IndexBuilder({
        sourceDir: folder.path,
        outputDir: path.join(__dirname, 'output'),
        cacheDir: '.claude/php-index-cache'
      });

      const result = await builder.build({
        force: args.force === true,
        verbose: args.verbose === true
      });

      if (result.success) {
        totalSymbols += result.totalSymbols;
        totalFiles += result.processedFiles;

        console.log(`\n✅ ${folder.name} 완료!`);
        console.log(`  • 처리 파일: ${result.processedFiles}/${result.totalFiles}개`);
        console.log(`  • 심볼: ${result.totalSymbols}개`);
      } else {
        console.log(`\n❌ ${folder.name} 실패! 오류: ${result.error}`);
        process.exit(1);
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n\n🎉 모든 폴더 처리 완료!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  • 총 처리 파일: ${totalFiles}개`);
    console.log(`  • 총 심볼: ${totalSymbols}개`);
    console.log(`  • 총 소요 시간: ${totalTime.toFixed(2)}초\n`);
  }

  /**
   * 디렉토리의 PHP 파일 개수를 계산합니다.
   */
  countPhpFiles(dir) {
    const fs = require('fs');
    const path = require('path');
    let count = 0;

    function walk(currentPath) {
      try {
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
          const filePath = path.join(currentPath, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walk(filePath);
          } else if (file.endsWith('.php')) {
            count++;
          }
        }
      } catch (e) {
        // 접근 불가능한 디렉토리 무시
      }
    }

    walk(dir);
    return count;
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
   * references 커맨드 - 심볼 참조 찾기
   */
  async cmdReferences(args) {
    const { symbol, limit = 20 } = args;

    if (!symbol) {
      console.error('❌ --symbol 옵션을 지정해주세요.');
      console.error('   예: node index.js refs --symbol "NoticeAd"');
      process.exit(1);
    }

    console.log(`\n🔗 참조 찾기: "${symbol}"\n`);

    try {
      await this.searcher.loadIndex();

      // grep을 사용해서 참조 찾기
      const { execSync } = require('child_process');

      try {
        // PHP 파일에서 심볼 참조 찾기
        const grep = `grep -r "${symbol}" ${args.source || 'work/mobile'} --include="*.php" -n`;
        const output = execSync(grep, { encoding: 'utf8' });
        const lines = output.trim().split('\n').filter(l => l);

        if (lines.length === 0) {
          console.log(`❌ 참조를 찾을 수 없습니다.\n`);
          return;
        }

        // 결과 파싱 및 표시
        const results = [];
        for (const line of lines) {
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          if (match) {
            const [, file, lineNum, code] = match;
            results.push({
              file: file.replace(/\\/g, '/'),
              line: parseInt(lineNum),
              code: code.trim().substring(0, 80)
            });
          }
        }

        // 파일별로 정렬
        results.sort((a, b) => a.file.localeCompare(b.file));

        console.log(`📌 결과 (${results.length}개 발견):\n`);

        let currentFile = null;
        let count = 0;

        for (const result of results) {
          if (result.file !== currentFile) {
            currentFile = result.file;
            console.log(`📄 ${result.file}`);
          }

          count++;
          console.log(`   ${result.line.toString().padStart(4, ' ')} | ${result.code}`);

          if (count >= (limit || 20)) {
            console.log(`\n... 더 많은 결과 (총 ${results.length}개)\n`);
            break;
          }
        }

        if (count < results.length) {
          console.log(`\n📊 표시: ${count}개 / ${results.length}개 (전체)\n`);
        } else {
          console.log();
        }

      } catch (grepError) {
        if (grepError.status === 1) {
          console.log(`❌ 참조를 찾을 수 없습니다.\n`);
        } else {
          throw grepError;
        }
      }
    } catch (error) {
      console.error(`❌ 오류: ${error.message}\n`);
      process.exit(1);
    }
  }

  /**
   * dependencies 커맨드 - 의존성 분석
   */
  async cmdDependencies(args) {
    console.log(`\n📊 의존성 분석\n`);

    try {
      await this.searcher.loadIndex();

      // 고급 분석 옵션 (먼저 처리)
      if (args.circular) {
        return this.analyzeCircularDeps();
      }

      if (args.trace) {
        return this.analyzeCallTrace(args.trace);
      }

      if (args.depth) {
        return this.analyzeCallDepth(args.depth);
      }

      if (args.callers) {
        return this.analyzeCallers(args.callers);
      }

      // 기본 분석
      const deps = this.searcher.index.dependencies;

      if (!deps) {
        console.log('❌ 의존성 정보를 찾을 수 없습니다. 색인을 먼저 생성하세요.\n');
        return;
      }

      // 옵션별 처리
      if (args.file) {
        // 특정 파일의 의존성
        const fileDeps = deps.byFile[args.file];
        if (!fileDeps) {
          console.log(`❌ 파일 "${args.file}"의 의존성을 찾을 수 없습니다.\n`);
          return;
        }

        console.log(`📄 파일: ${args.file}\n`);

        // 함수 호출
        if (fileDeps.functionCalls.length > 0) {
          console.log('🔹 함수 호출:');
          const calls = fileDeps.functionCalls.filter(c => !c.builtin);
          calls.slice(0, 20).forEach(call => {
            console.log(`  • ${call.name} (${call.type})`);
          });
          if (calls.length > 20) {
            console.log(`  ... 외 ${calls.length - 20}개`);
          }
          console.log();
        }

        // 클래스 의존성
        if (fileDeps.classDependencies.length > 0) {
          console.log('🔹 클래스 의존성:');
          fileDeps.classDependencies.forEach(dep => {
            if (dep.type === 'extends') {
              console.log(`  • ${dep.class} extends ${dep.parent}`);
            } else if (dep.type === 'implements') {
              console.log(`  • ${dep.class} implements ${dep.interface}`);
            }
          });
          console.log();
        }

        // 파일 의존성
        if (fileDeps.fileDependencies.length > 0) {
          console.log('🔹 파일 의존성 (include/require):');
          fileDeps.fileDependencies.forEach(dep => {
            console.log(`  • ${dep.path} (${dep.type})`);
          });
          console.log();
        }

        return;
      }

      if (args.type === 'functions') {
        // 자주 호출되는 함수 TOP
        console.log('🔹 자주 호출되는 함수 (top 20):\n');
        const sorted = Object.entries(deps.functionCalls)
          .filter(([_, data]) => !this.isBuiltInFunction(_))
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20);

        sorted.forEach(([name, data], idx) => {
          console.log(`  ${idx + 1}. ${name} (${data.count}회, ${data.files.length}개 파일)`);
        });
        console.log();
        return;
      }

      if (args.type === 'classes') {
        // 클래스 상속 관계
        console.log('🔹 클래스 상속 관계:\n');
        deps.classDependencies.extends.forEach(dep => {
          console.log(`  • ${dep.child} extends ${dep.parent}`);
        });

        if (deps.classDependencies.implements.length > 0) {
          console.log('\n🔹 인터페이스 구현:\n');
          deps.classDependencies.implements.forEach(dep => {
            console.log(`  • ${dep.class} implements ${dep.interface}`);
          });
        }
        console.log();
        return;
      }

      if (args.type === 'files') {
        // include/require 의존성 TOP
        console.log('🔹 자주 포함되는 파일 (top 20):\n');
        const sorted = Object.entries(deps.fileDependencies)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 20);

        sorted.forEach(([path, data], idx) => {
          console.log(`  ${idx + 1}. ${path} (${data.type}, ${data.count}회, ${data.files.length}개 파일)`);
        });
        console.log();
        return;
      }

      // 기본: 전체 통계
      console.log('📈 의존성 통계:\n');
      console.log(`  • 총 함수 호출: ${Object.keys(deps.functionCalls).length}개`);
      console.log(`  • 클래스 상속: ${deps.classDependencies.extends.length}개`);
      console.log(`  • 인터페이스 구현: ${deps.classDependencies.implements.length}개`);
      console.log(`  • 포함된 파일: ${Object.keys(deps.fileDependencies).length}개\n`);

      console.log('💡 더 자세한 분석:');
      console.log('  node index.js deps --type functions      # 자주 호출되는 함수');
      console.log('  node index.js deps --type classes        # 클래스 상속 관계');
      console.log('  node index.js deps --circular            # 순환 의존성 감지');
      console.log('  node index.js deps --trace <symbol>      # 호출 경로 추적');
      console.log('  node index.js deps --depth <symbol>      # 호출 깊이 분석\n');

    } catch (error) {
      console.error(`❌ 오류: ${error.message}\n`);
      process.exit(1);
    }
  }

  /**
   * 순환 의존성 분석
   */
  analyzeCircularDeps() {
    const cycles = this.searcher.findCircularDependencies();

    if (cycles.length === 0) {
      console.log('✅ 순환 의존성을 찾을 수 없습니다.\n');
      return;
    }

    console.log(`🔴 순환 의존성 발견 (${cycles.length}개):\n`);

    cycles.slice(0, 10).forEach((cycle, idx) => {
      const path = cycle.join(' → ');
      console.log(`  ${idx + 1}. ${path}`);
    });

    if (cycles.length > 10) {
      console.log(`\n  ... 외 ${cycles.length - 10}개의 순환 의존성\n`);
    } else {
      console.log();
    }
  }

  /**
   * 호출 경로 추적
   */
  analyzeCallTrace(symbol) {
    const result = this.searcher.traceCallPath(symbol, 4);

    if (!result.found) {
      console.log(`❌ 심볼을 찾을 수 없습니다: ${symbol}\n`);
      return;
    }

    console.log(`📍 호출 경로: ${result.symbol}\n`);

    const printTree = (node, indent = '') => {
      console.log(`${indent}• ${node.symbol.split('::').pop()} (깊이: ${node.depth})`);
      if (node.calls && node.calls.length > 0) {
        node.calls.forEach((child, idx) => {
          const isLast = idx === node.calls.length - 1;
          printTree(child, indent + (isLast ? '  ' : '  │ '));
        });
      }
    };

    if (result.callTree) {
      printTree(result.callTree);
    }
    console.log();
  }

  /**
   * 호출 깊이 분석
   */
  analyzeCallDepth(symbol) {
    const result = this.searcher.analyzeCallDepth(symbol);

    if (!result.found) {
      console.log(`❌ 심볼을 찾을 수 없습니다: ${symbol}\n`);
      return;
    }

    console.log(`📈 호출 깊이 분석: ${result.symbol}\n`);
    console.log(`  • 최대 깊이: ${result.maxDepth}`);
    console.log(`  • 직접 호출 개수: ${result.directCallCount}\n`);

    if (Object.keys(result.calls).length > 0) {
      console.log('🔹 호출하는 함수들 (깊이):');
      Object.entries(result.calls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([name, depth]) => {
          console.log(`  • ${name.split('::').pop()} (깊이: ${depth})`);
        });
      console.log();
    }
  }

  /**
   * 호출자 분석
   */
  analyzeCallers(symbol) {
    const callers = this.searcher.findCallers(symbol);

    if (callers.length === 0) {
      console.log(`⚠️  "${symbol}"을(를) 호출하는 함수가 없습니다.\n`);
      return;
    }

    console.log(`📞 "${symbol}"을(를) 호출하는 함수들:\n`);
    callers.slice(0, 20).forEach((caller, idx) => {
      console.log(`  ${idx + 1}. ${caller}`);
    });

    if (callers.length > 20) {
      console.log(`\n  ... 외 ${callers.length - 20}개`);
    }
    console.log();
  }

  /**
   * 내장 함수인지 확인
   */
  isBuiltInFunction(name) {
    const builtins = new Set([
      'echo', 'print', 'var_dump', 'print_r', 'exit', 'die',
      'strlen', 'substr', 'strpos', 'str_replace', 'trim', 'explode', 'implode',
      'array_push', 'array_pop', 'count', 'sizeof', 'in_array'
    ]);
    return builtins.has(name);
  }

  /**
   * 도움말 표시
   */
  showHelp() {
    console.log(`📖 도움말\n`);
    console.log(`명령어:\n`);
    console.log(`  build       - 색인 생성`);
    console.log(`    옵션: --source <dir> --output <dir> --force --verbose`);
    console.log(`    예: node index.js build --source work/mobile --force\n`);

    console.log(`  build-all   - 폴더별 순차 처리 (mobile → common → ppomppu)`);
    console.log(`    옵션: --source <base-dir> --force --verbose`);
    console.log(`    예: node index.js build-all --source work/mobile --force\n`);

    console.log(`  search      - 심볼 검색`);
    console.log(`    옵션: --symbol <name> --type <type> --exact --limit <n>\n`);

    console.log(`  info        - 심볼 정보 조회`);
    console.log(`    옵션: --symbol <name> 또는 --status\n`);

    console.log(`  list        - 파일/타입별 심볼 목록`);
    console.log(`    옵션: --file <path> 또는 --type <type>\n`);

    console.log(`  goto        - 정의 위치 찾기`);
    console.log(`    옵션: --symbol <name> --format <json|plain>\n`);

    console.log(`  refs        - 심볼 참조 찾기`);
    console.log(`    옵션: --symbol <name> --source <dir> --limit <n>\n`);

    console.log(`  deps        - 의존성 분석 (기본 + 고급)`);
    console.log(`    기본: --type <functions|classes|files> --file <path>`);
    console.log(`    고급: --circular --trace <symbol> --depth <symbol> --callers <symbol>\n`);

    console.log(`  help        - 도움말 표시\n`);

    console.log(`예제:\n`);
    console.log(`  # 기본 색인 생성`);
    console.log(`  node index.js build --source work/mobile --force\n`);

    console.log(`  # 폴더별 순차 처리 (전체 대용량 데이터)`);
    console.log(`  node index.js build-all --source work/mobile --force\n`);

    console.log(`  # 심볼 검색`);
    console.log(`  node index.js search --symbol "manager"\n`);

    console.log(`  # 의존성 분석`);
    console.log(`  node index.js deps --type functions                  # 자주 호출되는 함수`);
    console.log(`  node index.js deps --circular                        # 순환 의존성`);
    console.log(`  node index.js deps --trace manager --depth 3         # 호출 경로`);
    console.log(`  node index.js deps --depth manager                   # 호출 깊이`);
    console.log(`  node index.js deps --callers "cache_get"             # 호출자 찾기\n`);
  }
}

// 메인 실행
const app = new PHPIndexGenerator();
app.run().catch(error => {
  console.error(`\n❌ 예기치 않은 오류: ${error.message}\n`);
  process.exit(1);
});
