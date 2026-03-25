#!/usr/bin/env node

/**
 * PHP String Finder Plugin - 진입점
 * 색인 생성, 검색, 분석을 수행합니다
 */

const StringIndexer = require('./lib/StringIndexer');
const path = require('path');

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(args) {
  const result = {
    command: args[0] || 'help',
    options: {}
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--source' && args[i + 1]) {
      result.options.source = args[++i];
    } else if (arg === '--force') {
      result.options.force = true;
    } else if (arg === '--limit' && args[i + 1]) {
      result.options.limit = parseInt(args[++i]);
    } else if (arg === '--case-sensitive') {
      result.options.caseSensitive = true;
    } else if (arg === '--help' || arg === '-h') {
      result.command = 'help';
    } else if (!arg.startsWith('--') && !result.searchTerm) {
      result.searchTerm = arg;
    }
  }

  return result;
}

/**
 * 도움말
 */
function printHelp() {
  console.log(`
🔍 PHP String Finder Plugin

명령어:
  search <문자열>  - 색인에서 문자열 검색
  index            - 문자열 색인 생성/갱신
  analyze          - 색인 분석
  list             - 색인된 문자열 목록 조회
  clear            - 색인 초기화
  help             - 도움말 출력

옵션:
  --source <경로>           소스 디렉토리 (기본: work/mobile)
  --force                   강제 재생성
  --limit <숫자>            결과 제한
  --case-sensitive          대소문자 구분

예시:
  npm run php:string:search search "옥션"
  npm run php:string:search index --source work/mobile --force
  npm run php:string:search analyze
  npm run php:string:search list --limit 50
  `);
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  const indexer = new StringIndexer({
    sourceDir: parsed.options.source || 'work/mobile'
  });

  try {
    switch (parsed.command) {
      case 'search':
        if (!parsed.searchTerm) {
          console.error('❌ 검색어를 입력해주세요.');
          console.error('   사용법: npm run php:string:search search "검색어"');
          process.exit(1);
        }
        await handleSearch(indexer, parsed);
        break;

      case 'index':
        await handleIndex(indexer, parsed);
        break;

      case 'analyze':
        await handleAnalyze(indexer);
        break;

      case 'list':
        await handleList(indexer, parsed);
        break;

      case 'clear':
        indexer.clear();
        break;

      case 'help':
      default:
        printHelp();
    }
  } catch (err) {
    console.error('❌ 오류:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

/**
 * search 명령어 처리
 */
async function handleSearch(indexer, parsed) {
  console.log(`\n🔍 검색: "${parsed.searchTerm}"`);
  console.log(`📂 소스: ${indexer.sourceDir}\n`);

  const results = indexer.search(parsed.searchTerm, {
    caseSensitive: parsed.options.caseSensitive,
    limit: parsed.options.limit || 20
  });

  if (results.length === 0) {
    console.log('❌ 검색 결과가 없습니다.\n');
    return;
  }

  // 결과 출력
  console.log(`📄 검색 결과: "${parsed.searchTerm}" (${results.length}개)\n`);
  console.log('| # | 파일 | 라인 | 함수명 | 타입 | 내용 |');
  console.log('|----|------|------|--------|------|------|');

  results.forEach((result, idx) => {
    const content = result.content.substring(0, 40).replace(/\|/g, '\\|');
    console.log(`| ${idx + 1} | ${result.file} | ${result.line} | ${result.functionName} | ${result.type} | ${content} |`);
  });

  console.log(`\n✅ ${results.length}개 결과를 찾았습니다.\n`);
}

/**
 * index 명령어 처리
 */
async function handleIndex(indexer, parsed) {
  await indexer.build({
    force: parsed.options.force
  });
}

/**
 * analyze 명령어 처리
 */
async function handleAnalyze(indexer) {
  console.log('\n📊 색인 분석 결과:\n');

  const analysis = indexer.analyze();

  console.log(`총 문자열: ${analysis.totalStrings}개`);
  console.log(`총 출현: ${analysis.totalOccurrences}회`);
  console.log(`처리된 파일: ${analysis.totalFiles}개`);
  console.log(`생성 시간: ${analysis.buildTime || '미생성'}\n`);

  console.log('🔝 상위 10개 문자열:\n');
  console.log('| # | 문자열 | 개수 | 파일 수 |');
  console.log('|----|--------|------|---------|');

  analysis.topStrings.forEach((item, idx) => {
    console.log(`| ${idx + 1} | ${item.string} | ${item.count} | ${item.files.length} |`);
  });

  console.log();
}

/**
 * list 명령어 처리
 */
async function handleList(indexer, parsed) {
  console.log('\n📋 색인된 문자열 목록\n');

  const strings = indexer.listStrings({
    limit: parsed.options.limit || 20,
    sortBy: 'count'
  });

  if (strings.length === 0) {
    console.log('색인된 문자열이 없습니다.\n');
    return;
  }

  console.log('| # | 문자열 | 개수 | 함수 수 |');
  console.log('|----|--------|------|---------|');

  strings.forEach((item, idx) => {
    console.log(`| ${idx + 1} | ${item.string} | ${item.count} | ${item.functions.length} |`);
  });

  console.log();
}

// 진입점
main();
