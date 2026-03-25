#!/usr/bin/env node

/**
 * PHP String Search Skill - CLI 진입점
 * 사용: /php-string-search "검색어" [옵션]
 */

const StringFinder = require('./lib/StringFinder');
const path = require('path');

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(args) {
  const options = {
    searchTerm: null,
    source: 'work/mobile',
    type: 'search',
    limit: 20,
    caseSensitive: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith('--') && !arg.startsWith('-') && !options.searchTerm) {
      options.searchTerm = arg.replace(/^["']|["']$/g, '');
      continue;
    }

    if (arg === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i]);
    } else if (arg === '--case-sensitive') {
      options.caseSensitive = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * 도움말 출력
 */
function printHelp() {
  console.log(`
🔍 PHP String Search Skill

사용법:
  /php-string-search "검색어" [옵션]

옵션:
  --source <경로>           소스 디렉토리 (기본: work/mobile)
  --type <타입>             검색 타입:
                            - search: 모든 라인에서 검색 (기본값)
                            - function-content: 함수 내용에서 검색
                            - comment: 주석에서만 검색
  --limit <숫자>            결과 제한 (기본: 20)
  --case-sensitive          대소문자 구분
  --help, -h                도움말 출력

예시:
  /php-string-search "옥션 책"
  /php-string-search "get_url_data" --type function-content
  /php-string-search "TODO" --type comment --limit 50
  /php-string-search "SELECT" --source work/ppomppu --case-sensitive
  `);
}

/**
 * 메인 실행 함수
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  try {
    const options = parseArgs(args);

    if (!options.searchTerm) {
      console.error('❌ 검색어를 입력해주세요.');
      console.error('   사용법: /php-string-search "검색어"');
      process.exit(1);
    }

    console.log(`\n🔍 검색 중: "${options.searchTerm}"`);
    console.log(`📂 소스: ${options.source}`);
    console.log(`🔎 타입: ${options.type}\n`);

    const finder = new StringFinder({
      sourceDir: options.source,
      caseSensitive: options.caseSensitive,
      limit: options.limit
    });

    const results = await finder.search(options.searchTerm, {
      type: options.type,
      caseSensitive: options.caseSensitive
    });

    // 결과 출력
    const output = finder.formatAsTable(results, options.searchTerm);
    console.log(output);

    if (results.length === 0) {
      console.log('❌ 검색 결과가 없습니다.\n');
    } else {
      console.log(`✅ ${results.length}개 결과를 찾았습니다.\n`);
    }

  } catch (error) {
    console.error('❌ 오류가 발생했습니다:');
    console.error(error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
