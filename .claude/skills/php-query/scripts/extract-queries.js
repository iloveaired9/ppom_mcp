#!/usr/bin/env node

/**
 * PHP 파일에서 SQL 쿼리를 함수별로 추출하는 스크립트
 *
 * 사용법: node extract-queries.js <파일명>
 * 예: node extract-queries.js notice_ad.class.php
 */

const fs = require('fs');
const path = require('path');

// ============================================
// 설정
// ============================================

const INDEX_PATH = path.join(__dirname, '../../../../plugins/php-index-generator/output/index.json');
const WORK_DIR = path.join(__dirname, '../../../../work/mobile');

// ============================================
// SQL 쿼리 추출 정규식
// ============================================

// SQL 쿼리 시작 패턴
const SQL_START_PATTERNS = [
  /(?:"|')?\s*SELECT\s+/i,
  /(?:"|')?\s*INSERT\s+INTO\s+/i,
  /(?:"|')?\s*UPDATE\s+/i,
  /(?:"|')?\s*DELETE\s+FROM\s+/i,
  /(?:"|')?\s*WITH\s+/i,  // CTE
];

// ============================================
// 함수
// ============================================

/**
 * 파일에서 함수 위치 추출
 */
function extractFunctionLocations(content, indexData, targetFileName) {
  const functions = [];

  // 파일명 정규화 (경로 구분자 통일)
  const normalizedTarget = targetFileName.replace(/\\/g, '/').toLowerCase();

  // 인덱스에서 해당 파일의 함수 찾기
  for (const [fqcn, symbol] of Object.entries(indexData.symbols || {})) {
    if (symbol.file) {
      const normalizedFile = symbol.file.replace(/\\/g, '/').toLowerCase();
      const normalizedFilename = (symbol.filename || '').toLowerCase();

      // 파일명(basename), 전체경로, 경로 끝부분으로 매칭
      if (normalizedFilename === normalizedTarget ||
          normalizedFile.includes(normalizedTarget) ||
          normalizedFile.endsWith(normalizedTarget)) {
        functions.push({
          name: symbol.name,
          fqcn: fqcn,
          line: symbol.line,
          type: symbol.type,
          calls: symbol.calls || []
        });
      }
    }
  }

  // 라인 번호순 정렬 (제한 없음 - 모든 함수 반환)
  return functions.sort((a, b) => a.line - b.line);
}

/**
 * 주어진 라인에서 SQL 쿼리 추출
 */
function extractQueriesFromLines(lines, startLine, endLine) {
  const queries = [];
  let inQuery = false;
  let currentQuery = '';
  let queryStartLine = startLine;

  for (let i = startLine; i < Math.min(endLine || lines.length, lines.length); i++) {
    const line = String(lines[i] || '').trim();

    // SQL 쿼리 시작 감지
    if (!inQuery) {
      const isSqlStart = SQL_START_PATTERNS.some(pattern => pattern.test(line));
      if (isSqlStart) {
        inQuery = true;
        queryStartLine = i + 1;
        currentQuery = line;
      }
    } else {
      currentQuery += ' ' + line;

      // 쿼리 끝 감지 (세미콜론 또는 괄호 닫기)
      if (line.includes(';') || line.match(/[)]\s*[,;]?$/)) {
        // 정리 및 저장
        currentQuery = cleanQuery(currentQuery);
        if (currentQuery.length > 20) { // 최소 길이 필터
          queries.push({
            startLine: queryStartLine,
            endLine: i + 1,
            query: currentQuery
          });
        }
        inQuery = false;
        currentQuery = '';
      }
    }
  }

  return queries;
}

/**
 * SQL 쿼리 정리
 */
function cleanQuery(query) {
  return query
    .replace(/^\s*["']\s*/, '')  // 시작 따옴표 제거
    .replace(/\s*["']\s*$/, '')  // 끝 따옴표 제거
    .replace(/\s+/g, ' ')         // 여러 공백을 하나로
    .replace(/;$/, '')            // 끝 세미콜론 제거
    .trim();
}

/**
 * 쿼리 축약 (너무 길면 생략)
 */
function abbreviateQuery(query, maxLength = 100) {
  if (query.length > maxLength) {
    return query.substring(0, maxLength) + '...';
  }
  return query;
}

/**
 * 함수에서 쿼리 범위 찾기
 */
function findFunctionEndLine(lines, startLine) {
  let braceCount = 0;
  let foundOpening = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = String(lines[i] || '');

    for (const char of line) {
      if (char === '{') {
        foundOpening = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (foundOpening && braceCount === 0) {
          return i;
        }
      }
    }
  }

  return Math.min(startLine + 100, lines.length - 1); // 기본값
}

/**
 * 메인 함수
 */
function main() {
  const fileName = process.argv[2] || 'notice_ad.class.php';

  try {
    // 1. 인덱스 파일 읽기
    if (!fs.existsSync(INDEX_PATH)) {
      console.error('❌ 인덱스 파일을 찾을 수 없습니다:', INDEX_PATH);
      console.error('💡 먼저 /php-index build 명령으로 색인을 생성하세요');
      process.exit(1);
    }

    const indexData = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    if (!indexData || !indexData.symbols) {
      console.error('❌ 인덱스 데이터가 잘못되었습니다');
      process.exit(1);
    }

    // 2. PHP 파일 찾기
    let filePath = path.join(WORK_DIR, fileName);

    // 파일이 없으면 include/libraries 디렉토리에서 찾기
    if (!fs.existsSync(filePath)) {
      filePath = path.join(WORK_DIR, 'include/libraries', fileName);
    }

    if (!fs.existsSync(filePath)) {
      console.error('❌ 파일을 찾을 수 없습니다:', fileName);
      console.error('💡 다음 위치를 확인하세요:');
      console.error('   - ' + path.join(WORK_DIR, fileName));
      console.error('   - ' + path.join(WORK_DIR, 'include/libraries', fileName));
      process.exit(1);
    }

    // 3. 파일 읽기
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 4. 함수 추출
    const functions = extractFunctionLocations(content, indexData, fileName);

    let results = [];

    // 5. 함수가 없으면 프로시저럴 코드에서 직접 SQL 추출
    if (functions.length === 0) {
      console.log(`📄 ${fileName} - SQL 쿼리 추출 (프로시저럴 코드)\n`);
      const queries = extractQueriesFromLines(lines, 0);

      if (queries.length === 0) {
        console.log('⚠️  SQL 쿼리를 찾을 수 없습니다');
        return;
      }

      // 마크다운 테이블로 출력 (함수명 없음)
      console.log('| # | 라인범위 | SQL 쿼리 |');
      console.log('|---|---------|---------|');

      queries.forEach((query, idx) => {
        const queryPreview = query.query.length > 80
          ? query.query.substring(0, 80) + '...'
          : query.query;
        console.log(`| ${idx + 1} | ${query.startLine}-${query.endLine} | \`${queryPreview}\` |`);
      });
      return;
    }

    // 5. 각 함수에서 쿼리 추출
    for (const func of functions) {
      const endLine = findFunctionEndLine(lines, func.line - 1);
      const queries = extractQueriesFromLines(lines, func.line - 1, endLine);

      if (queries.length > 0) {
        results.push({
          function: func.name,
          type: func.type,
          startLine: func.line,
          endLine: endLine,
          queries: queries
        });
      }
    }

    // 6. 마크다운 테이블 출력
    console.log(`\n📄 ${fileName} - SQL 쿼리 추출 (모든 함수)\n`);

    if (results.length === 0) {
      console.log('⚠️  SQL 쿼리를 찾을 수 없습니다\n');
      return;
    }

    // 테이블 헤더
    console.log('| # | 함수명 | 라인범위 | SQL 쿼리 |');
    console.log('|---|--------|---------|---------|');

    // 테이블 행
    let rowNum = 1;
    for (const result of results) {
      for (const query of result.queries) {
        const abbrQuery = abbreviateQuery(query.query);
        const lineRange = `${query.startLine}-${query.endLine}`;
        console.log(`| ${rowNum} | ${result.function}() | ${lineRange} | \`${abbrQuery}\` |`);
        rowNum++;
      }
    }

    console.log(`\n✅ 총 ${rowNum - 1}개의 SQL 쿼리를 추출했습니다\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error('스택 트레이스:', error.stack);
    process.exit(1);
  }
}

// 실행
main();
