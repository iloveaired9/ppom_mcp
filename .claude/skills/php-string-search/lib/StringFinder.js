/**
 * StringFinder - PHP 코드에서 문자열 검색
 * 기존 php-index 활용하여 함수명, 의존성 정보 통합
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class StringFinder {
  constructor(options = {}) {
    this.sourceDir = options.sourceDir || 'work/mobile';
    this.indexPath = options.indexPath || './plugins/php-index-generator/output/index.json';
    this.caseSensitive = options.caseSensitive || false;
    this.limit = options.limit || 20;

    // 기존 php-index 활용
    try {
      this.indexData = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️  php-index 색인을 찾을 수 없습니다. 기본 검색만 제공됩니다.');
      this.indexData = { functions: {}, symbols: [] };
    }
  }

  /**
   * 주요 검색 메서드
   */
  async search(searchTerm, options = {}) {
    const opts = { ...{ type: 'search', caseSensitive: false }, ...options };
    const startTime = Date.now();

    let results = [];

    switch (opts.type) {
      case 'search':
        results = await this.searchString(searchTerm, opts);
        break;
      case 'function-content':
        results = await this.searchInFunctions(searchTerm, opts);
        break;
      case 'comment':
        results = await this.searchInComments(searchTerm, opts);
        break;
      default:
        results = await this.searchString(searchTerm, opts);
    }

    // 의존성 정보 추가
    results = this.enrichWithDependencies(results);

    // 결과 제한
    results = results.slice(0, this.limit);

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  검색 완료: ${duration}ms\n`);

    return results;
  }

  /**
   * 문자열 검색
   */
  async searchString(searchTerm, options = {}) {
    const { caseSensitive } = options;
    const results = [];
    const pattern = caseSensitive ? new RegExp(searchTerm) : new RegExp(searchTerm, 'i');

    const files = this.getPhpFiles();
    let count = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            count++;
            const functionName = this.getFunctionAtLine(relativePath, idx + 1);
            results.push({
              file: relativePath,
              line: idx + 1,
              functionName,
              content: line.trim().substring(0, 100),
              context: this.getContext(lines, idx)
            });
          }
        });
      } catch (e) {
        // 파일 읽기 오류 무시
      }
    }

    return results;
  }

  /**
   * 함수 내용에서 검색
   */
  async searchInFunctions(searchTerm, options = {}) {
    const results = [];
    const { caseSensitive } = options;
    const pattern = caseSensitive ? new RegExp(searchTerm) : new RegExp(searchTerm, 'i');

    const files = this.getPhpFiles();

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);

        // 함수별로 분리
        const functions = this.extractFunctionsWithContent(content, relativePath);

        for (const func of functions) {
          if (pattern.test(func.content)) {
            results.push({
              file: relativePath,
              line: func.startLine,
              functionName: func.name,
              content: func.content.substring(0, 100),
              context: func.content
            });
          }
        }
      } catch (e) {
        // 파일 읽기 오류 무시
      }
    }

    return results;
  }

  /**
   * 주석에서 검색
   */
  async searchInComments(searchTerm, options = {}) {
    const results = [];
    const { caseSensitive } = options;
    const pattern = caseSensitive ? new RegExp(searchTerm) : new RegExp(searchTerm, 'i');

    const files = this.getPhpFiles();

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(process.cwd(), file);

        let inMultiLineComment = false;

        lines.forEach((line, idx) => {
          // 멀티라인 주석 처리
          if (line.includes('/*')) inMultiLineComment = true;
          if (line.includes('*/')) inMultiLineComment = false;

          // 주석 라인 추출
          const commentMatch = line.match(/(\/\/|#).*/);
          if (commentMatch || inMultiLineComment) {
            if (pattern.test(line)) {
              const functionName = this.getFunctionAtLine(relativePath, idx + 1);
              results.push({
                file: relativePath,
                line: idx + 1,
                functionName,
                content: line.trim(),
                isComment: true
              });
            }
          }
        });
      } catch (e) {
        // 파일 읽기 오류 무시
      }
    }

    return results;
  }

  /**
   * 의존성 정보 추가
   */
  enrichWithDependencies(results) {
    return results.map(result => {
      let dependencies = [];

      if (result.functionName) {
        // php-index의 호출자 정보 활용
        const funcKey = this.normalizeFunction(result.functionName);
        if (this.indexData.functions && this.indexData.functions[funcKey]) {
          const funcInfo = this.indexData.functions[funcKey];
          dependencies = funcInfo.calledBy || [];
        }
      }

      return { ...result, dependencies };
    });
  }

  /**
   * 라인 번호로 함수명 찾기
   */
  getFunctionAtLine(filePath, lineNum) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 현재 라인부터 위로 올라가면서 함수 찾기
      for (let i = lineNum - 1; i >= 0; i--) {
        const line = lines[i];

        // 함수 정의 찾기
        const funcMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)/);
        if (funcMatch) {
          return funcMatch[1] + '()';
        }

        // 클래스 찾기
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          return classMatch[1];
        }
      }
    } catch (e) {
      // 무시
    }

    return 'global';
  }

  /**
   * 함수의 전체 내용 추출
   */
  extractFunctionsWithContent(content, filePath) {
    const functions = [];
    const lines = content.split('\n');
    let currentFunction = null;
    let braceCount = 0;
    let startLine = 0;

    lines.forEach((line, idx) => {
      const funcMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)/);

      if (funcMatch) {
        if (currentFunction) {
          // 이전 함수 저장
          functions.push(currentFunction);
        }

        currentFunction = {
          name: funcMatch[1],
          startLine: idx + 1,
          content: line,
          endLine: idx + 1
        };
        braceCount = 0;
      }

      if (currentFunction) {
        // 괄호 카운팅
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        currentFunction.content += '\n' + line;
        currentFunction.endLine = idx + 1;

        // 함수 종료
        if (braceCount === 0 && line.trim() === '}') {
          functions.push(currentFunction);
          currentFunction = null;
        }
      }
    });

    return functions;
  }

  /**
   * PHP 파일 목록 조회
   */
  getPhpFiles() {
    const pattern = path.join(this.sourceDir, '**/*.php');
    return glob.sync(pattern, { ignore: '**/node_modules/**' });
  }

  /**
   * 컨텍스트 텍스트 추출
   */
  getContext(lines, lineIdx, contextLines = 1) {
    const start = Math.max(0, lineIdx - contextLines);
    const end = Math.min(lines.length, lineIdx + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  /**
   * 함수명 정규화
   */
  normalizeFunction(name) {
    return name.replace(/\(\)$/, '').toLowerCase();
  }

  /**
   * 결과를 마크다운 테이블로 포맷팅
   */
  formatAsTable(results, searchTerm) {
    let output = `\n📄 **문자열 검색 결과: "${searchTerm}"** (${results.length}개 발견)\n\n`;

    if (results.length === 0) {
      output += '검색 결과가 없습니다.\n';
      return output;
    }

    output += '| # | 파일 | 라인 | 함수명 | 내용 |\n';
    output += '|----|------|------|--------|------|\n';

    results.forEach((result, idx) => {
      const content = result.content.substring(0, 50).replace(/\|/g, '\\|');
      output += `| ${idx + 1} | ${result.file} | ${result.line} | ${result.functionName || '-'} | ${content} |\n`;
    });

    // 의존성 정보
    if (results.some(r => r.dependencies && r.dependencies.length > 0)) {
      output += '\n📊 **의존성 정보:**\n';
      results.forEach(result => {
        if (result.dependencies && result.dependencies.length > 0) {
          output += `\n- **${result.functionName}** 호출처:\n`;
          result.dependencies.forEach(dep => {
            output += `  └─ ${dep}\n`;
          });
        }
      });
    }

    output += '\n';
    return output;
  }
}

module.exports = StringFinder;
