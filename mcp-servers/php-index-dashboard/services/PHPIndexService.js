/**
 * PHP Index Generator CLI 래퍼
 * 기존 CLI 도구를 Express에서 호출하는 서비스
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

class PHPIndexService {
  constructor() {
    this.cliPath = path.join(__dirname, '../../../plugins/php-index-generator/index.js');
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분
    this.codeIndex = null; // code-index.json (lazy load)
    this.codeIndexPath = path.join(__dirname, '../../../plugins/php-index-generator/output/code-index.json');
  }

  /**
   * code-index.json을 로드합니다 (선택적).
   * @returns {Promise<object|null>} code-index 객체 또는 null
   */
  async loadCodeIndex() {
    // 이미 로드되었으면 반환
    if (this.codeIndex !== null) {
      return this.codeIndex;
    }

    try {
      // 파일 존재 확인
      if (!fs.existsSync(this.codeIndexPath)) {
        console.debug('[PHPIndexService] code-index.json이 없습니다. API에서 원본 파일을 파싱합니다.');
        return null;
      }

      // 파일 읽기
      const content = fs.readFileSync(this.codeIndexPath, 'utf8');
      this.codeIndex = JSON.parse(content);
      console.debug('[PHPIndexService] code-index.json 로드 완료');
      return this.codeIndex;
    } catch (error) {
      console.warn(`[PHPIndexService] code-index 로드 실패: ${error.message}`);
      this.codeIndex = null; // 실패하면 null 설정
      return null;
    }
  }

  /**
   * 동기 실행 (작은 결과용)
   */
  execSync(cmd) {
    try {
      const fullCmd = `node ${this.cliPath} ${cmd}`;
      console.log('[PHPIndexService.execSync] 명령어:', fullCmd);
      const output = execSync(fullCmd, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      console.log('[PHPIndexService.execSync] 출력 길이:', output.length, '바이트');
      return { success: true, data: output.trim() };
    } catch (error) {
      console.error('[PHPIndexService.execSync] 에러:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 비동기 실행 (큰 결과용)
   */
  execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(`node ${this.cliPath} ${cmd}`, {
        maxBuffer: 10 * 1024 * 1024
      }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`CLI Error: ${stderr || err.message}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /**
   * 심볼 검색
   */
  search(symbol, options = {}) {
    try {
      const cmd = `search --symbol "${symbol}"${options.type ? ` --type ${options.type}` : ''}${options.exact ? ' --exact' : ''}`;
      const result = this.execSync(cmd);

      if (!result.success) throw new Error(result.error);

      // CLI 텍스트 출력을 JSON으로 파싱
      const parsed = this.parseSearchOutput(result.data);
      return { success: true, results: parsed };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * 검색 CLI 출력을 JSON으로 파싱
   * 형식:
   * 🔍 검색: "Symbol"
   * 📌 결과 (N개 발견):
   * 1. SymbolName (type)
   *    📄 파일경로:라인번호
   *    📏 점수: 90%
   */
  parseSearchOutput(output) {
    const results = [];
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 결과 항목 찾기: "1. SymbolName (type)"
      const itemMatch = line.match(/^\d+\.\s+([^\s]+)\s+\(([^)]+)\)/);
      if (itemMatch) {
        const [, name, type] = itemMatch;

        // 파일과 라인 번호 찾기 (다음 몇 라인에서 📄 포함)
        let file = '';
        let lineNum = '';

        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.includes('📄')) {
            // 📄 파일경로:라인번호 형식
            const fileMatch = nextLine.match(/📄\s+(.+?)(?::(\d+))?(?:\s*$|[\s])/);
            if (fileMatch) {
              file = fileMatch[1].trim();
              lineNum = fileMatch[2] || '';
            }
            break;
          }
        }

        if (file) {
          results.push({
            name,
            type,
            file: file.trim(),
            line: lineNum ? parseInt(lineNum) : undefined
          });
        }
      }
    }

    return results;
  }

  /**
   * 정의 위치 찾기
   */
  goto(symbol, format = 'json') {
    try {
      const cmd = `goto --symbol "${symbol}" --format ${format}`;
      const result = this.execSync(cmd);

      if (!result.success) throw new Error(result.error);

      if (format === 'json') {
        try {
          return JSON.parse(result.data);
        } catch {
          return { success: true, data: result.data };
        }
      }
      return result.data;
    } catch (error) {
      throw new Error(`Goto failed: ${error.message}`);
    }
  }

  /**
   * 참조 찾기
   */
  async refs(symbol, options = {}) {
    try {
      const cmd = `refs --symbol "${symbol}"${options.limit ? ` --limit ${options.limit}` : ''}`;
      const result = await this.execAsync(cmd);
      return { success: true, data: result };
    } catch (error) {
      throw new Error(`Refs failed: ${error.message}`);
    }
  }

  /**
   * 호출자 찾기 (deps --callers)
   */
  async getCallers(symbol, options = {}) {
    try {
      const cmd = `deps --callers "${symbol}"${options.limit ? ` --limit ${options.limit}` : ''}${options.format ? ` --format ${options.format}` : ''}`;
      const result = await this.execAsync(cmd);

      try {
        return JSON.parse(result);
      } catch {
        return { success: true, data: result };
      }
    } catch (error) {
      throw new Error(`Get callers failed: ${error.message}`);
    }
  }

  /**
   * 호출 함수 찾기 (deps --trace)
   */
  async getCallTrace(symbol, options = {}) {
    try {
      const cmd = `deps --trace "${symbol}"${options.maxDepth ? ` --max-depth ${options.maxDepth}` : ''}${options.format ? ` --format ${options.format}` : ''}`;
      const result = await this.execAsync(cmd);

      try {
        return JSON.parse(result);
      } catch {
        return { success: true, data: result };
      }
    } catch (error) {
      throw new Error(`Get call trace failed: ${error.message}`);
    }
  }

  /**
   * 호출 깊이 분석
   */
  async getDepth(symbol, options = {}) {
    try {
      const cmd = `deps --depth "${symbol}"${options.verbose ? ' --verbose' : ''}`;
      const result = await this.execAsync(cmd);

      try {
        return JSON.parse(result);
      } catch {
        return { success: true, data: result };
      }
    } catch (error) {
      throw new Error(`Get depth failed: ${error.message}`);
    }
  }

  /**
   * 순환 의존성 찾기
   */
  async getCircular(options = {}) {
    try {
      const cmd = `deps --circular${options.verbose ? ' --verbose' : ''}`;
      const result = await this.execAsync(cmd);

      try {
        return JSON.parse(result);
      } catch {
        return { success: true, data: result };
      }
    } catch (error) {
      throw new Error(`Get circular failed: ${error.message}`);
    }
  }

  /**
   * 통계 정보
   */
  getStats() {
    try {
      const cmd = `info --status`;
      const result = this.execSync(cmd);

      if (!result.success) throw new Error(result.error);

      // 텍스트 출력을 JSON으로 파싱
      const parsed = this.parseStatsOutput(result.data);
      return parsed;
    } catch (error) {
      throw new Error(`Get stats failed: ${error.message}`);
    }
  }

  /**
   * 통계 CLI 출력을 JSON으로 파싱
   * 형식:
   * 📋 색인 상태
   *   • 파일: 363개
   *   • 심볼: 84개
   *   • PHP 버전: 5.6
   *   • 빌드 시간: 419ms
   */
  parseStatsOutput(output) {
    const stats = {};

    if (!output || typeof output !== 'string') {
      return stats;
    }

    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // 파일 수
      if (trimmed.includes('파일:')) {
        const match = trimmed.match(/파일:\s*(\d+)/);
        if (match) {
          stats.totalFiles = parseInt(match[1]);
        }
      }

      // 심볼 수
      if (trimmed.includes('심볼:')) {
        const match = trimmed.match(/심볼:\s*(\d+)/);
        if (match) {
          stats.totalSymbols = parseInt(match[1]);
        }
      }

      // PHP 버전
      if (trimmed.includes('PHP 버전:')) {
        const match = trimmed.match(/PHP 버전:\s*([^\s]+)/);
        if (match) {
          stats.phpVersion = match[1];
        }
      }

      // 빌드 시간
      if (trimmed.includes('빌드 시간:')) {
        const match = trimmed.match(/빌드 시간:\s*([^\s]+)/);
        if (match) {
          stats.buildTime = match[1];
        }
      }
    }

    return stats;
  }

  /**
   * 색인 재구성
   */
  async rebuildIndex(options = {}) {
    try {
      const cmd = `build${options.force ? ' --force' : ''} --verbose`;
      const result = await this.execAsync(cmd);
      return { success: true, data: result };
    } catch (error) {
      throw new Error(`Rebuild index failed: ${error.message}`);
    }
  }

  /**
   * 심볼의 PHP 코드 추출
   * @param {string} symbol - 심볼 이름 (예: "api\gcm\etc_alarm.php::send_header")
   * @returns {Promise<object>} { code, file, startLine, endLine, language }
   */
  async getCode(symbol) {
    try {
      // Debug logging
      const fs = require('fs');
      const debugPath = 'C:/temp/code_debug.log';
      const debugMsg = `[${new Date().toISOString()}] getCode called with symbol (JSON): ${JSON.stringify(symbol)}\n`;
      try {
        fs.appendFileSync(debugPath, debugMsg, 'utf8');
      } catch (e) {
        console.error('[PHPIndexService] Debug log write failed:', e.message);
      }

      // 0. code-index.json에서 먼저 조회 (매우 빠름)
      try {
        const codeIndex = await this.loadCodeIndex();
        const codeIndexMsg = `[${new Date().toISOString()}] code-index loaded, symbols count: ${codeIndex ? Object.keys(codeIndex.symbols || {}).length : 0}\n`;
        try {
          fs.appendFileSync(debugPath, codeIndexMsg, 'utf8');
        } catch (e) {
          console.error('[PHPIndexService] Debug log write failed:', e.message);
        }

        if (codeIndex && codeIndex.symbols && codeIndex.symbols[symbol]) {
          const codeData = codeIndex.symbols[symbol];
          const successMsg = `[${new Date().toISOString()}] Found in code-index: ${symbol}, code length: ${codeData.code.length}\n`;
          try {
            fs.appendFileSync(debugPath, successMsg, 'utf8');
          } catch (e) {
            console.error('[PHPIndexService] Debug log write failed:', e.message);
          }
          console.debug(`[PHPIndexService] code-index에서 로드: ${symbol}`);
          return {
            success: true,
            symbol: symbol,
            code: codeData.code,
            file: codeData.file,
            startLine: codeData.startLine,
            endLine: codeData.endLine,
            type: codeData.type,
            language: 'php',
            cached: 'code-index'
          };
        } else {
          const notFoundMsg = `[${new Date().toISOString()}] Symbol NOT found in code-index (available: ${codeIndex ? Object.keys(codeIndex.symbols || {}).filter(k => k.includes('autolink5') && k.includes('ajax_article')).slice(0, 3).join(', ') : 'N/A'})\n`;
          try {
            fs.appendFileSync(debugPath, notFoundMsg, 'utf8');
          } catch (e) {
            console.error('[PHPIndexService] Debug log write failed:', e.message);
          }
        }
      } catch (err) {
        const errMsg = `[${new Date().toISOString()}] code-index 조회 실패: ${err.message}\n`;
        try {
          fs.appendFileSync(debugPath, errMsg, 'utf8');
        } catch (e) {
          console.error('[PHPIndexService] Debug log write failed:', e.message);
        }
        console.debug(`[PHPIndexService] code-index 조회 실패: ${err.message}`);
      }

      // 1. 색인 파일 로드
      const indexPath = path.join(__dirname, '../../../plugins/php-index-generator/output/index.json');
      if (!fs.existsSync(indexPath)) {
        throw new Error('색인 파일을 찾을 수 없습니다. 먼저 색인을 생성하세요.');
      }

      const indexContent = fs.readFileSync(indexPath, 'utf8');
      const index = JSON.parse(indexContent);

      // 2. 심볼 정보 조회
      let symbolInfo = index.symbols[symbol];

      // 폴백 1: 심볼이 단순 이름만 있으면 FQCN으로 검색
      if (!symbolInfo && !symbol.includes('::')) {
        const matchingKey = Object.keys(index.symbols).find(key =>
          key.endsWith(`::${symbol}`)
        );
        if (matchingKey) {
          symbolInfo = index.symbols[matchingKey];
          console.log(`[PHPIndexService] 심볼 폴백 조회: ${symbol} -> ${matchingKey}`);
        }
      }

      // 폴백 2: FQCN인데 경로 접두사가 다를 경우 (예: ppomppu\zboard\... vs zboard\...)
      if (!symbolInfo && symbol.includes('::')) {
        const symbolName = symbol.split('::').pop();
        const matchingKey = Object.keys(index.symbols).find(key =>
          key.endsWith(`::${symbolName}`) && symbol.endsWith(key)
        );
        if (matchingKey) {
          symbolInfo = index.symbols[matchingKey];
          console.log(`[PHPIndexService] FQCN 접미사 폴백: ${symbol} -> ${matchingKey}`);
        }
      }

      // 폴백 3: 파일경로 부분매칭 + 심볼명 일치
      if (!symbolInfo && symbol.includes('::')) {
        const [filePart, symbolName] = symbol.split('::');
        const normalizedFile = filePart.replace(/\\/g, '/');
        const matchingKey = Object.keys(index.symbols).find(key => {
          if (!key.endsWith(`::${symbolName}`)) return false;
          const keyFile = key.split('::')[0].replace(/\\/g, '/');
          return normalizedFile.endsWith(keyFile) || keyFile.endsWith(normalizedFile);
        });
        if (matchingKey) {
          symbolInfo = index.symbols[matchingKey];
          console.log(`[PHPIndexService] 파일경로 부분매칭 폴백: ${symbol} -> ${matchingKey}`);
        }
      }

      if (!symbolInfo) {
        throw new Error(`심볼을 찾을 수 없습니다: ${symbol}`);
      }

      // 3. PHP 파일 읽기 (EUC-KR 지원)
      // 파일 경로는 프로젝트 루트 기준 상대 경로 (예: work\mobile\ppomppu\...)
      const projectRoot = path.join(__dirname, '../../..');
      let filePath = symbolInfo.file;
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(projectRoot, filePath);
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }

      // 파일을 바이너리로 읽은 후 인코딩 감지
      let fileContent;
      try {
        const fileBuffer = fs.readFileSync(filePath);

        // EUC-KR 인코딩 감지 (한글 바이트 패턴)
        // EUC-KR의 한글 범위: 첫 바이트는 0xA1-0xFE, 두 번째 바이트는 0xA1-0xFE
        let euckrCount = 0;
        let utf8Count = 0;

        for (let i = 0; i < fileBuffer.length - 1; i++) {
          const byte1 = fileBuffer[i];
          const byte2 = fileBuffer[i + 1];

          // EUC-KR 한글: 0xB0-0xC8 또는 0xCA-0xFD
          if ((byte1 >= 0xB0 && byte1 <= 0xC8) || (byte1 >= 0xCA && byte1 <= 0xFD)) {
            if (byte2 >= 0xA1 && byte2 <= 0xFE) {
              euckrCount++;
              i++; // 2바이트 문자이므로 다음 바이트 스킵
            }
          }

          // UTF-8 한글: 0xEC-0xEF (3바이트 시작)
          if (byte1 >= 0xEC && byte1 <= 0xEF) {
            if (i + 2 < fileBuffer.length) {
              utf8Count++;
              i += 2; // 3바이트 문자이므로 스킵
            }
          }
        }

        const isEuckr = euckrCount > utf8Count;

        // 인코딩에 따라 디코딩
        fileContent = isEuckr
          ? iconv.decode(fileBuffer, 'euc-kr')
          : fileBuffer.toString('utf-8');

      } catch (err) {
        console.error('파일 읽기 에러:', err);
        fileContent = fs.readFileSync(filePath, 'utf8');
      }

      const lines = fileContent.split('\n');

      // 4. 함수/클래스 범위 추출
      const { startLine, endLine, code } = this.extractCodeRange(
        lines,
        symbolInfo.line,
        symbolInfo.type,
        symbolInfo.name
      );

      // 5. 결과 반환
      return {
        success: true,
        symbol: symbol,
        code: code,
        file: filePath,
        startLine: startLine,
        endLine: endLine,
        type: symbolInfo.type,
        language: 'php'
      };
    } catch (error) {
      throw new Error(`코드 추출 실패: ${error.message}`);
    }
  }

  /**
   * 함수/클래스의 코드 범위 추출 (중괄호 기반)
   * @private
   */
  extractCodeRange(lines, startLineNum, type, name) {
    const startIdx = startLineNum - 1; // 0-based 인덱싱

    if (type === 'function' || type === 'method') {
      // 함수: { } 쌍으로 범위 추출
      let braceCount = 0;
      let foundStart = false;
      let endIdx = startIdx;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];

        // 중괄호 카운팅
        for (let j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            braceCount++;
            foundStart = true;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              endIdx = i;
              break;
            }
          }
        }

        if (foundStart && braceCount === 0) {
          break;
        }
      }

      return {
        startLine: startLineNum,
        endLine: endIdx + 1,
        code: lines.slice(startIdx, endIdx + 1).join('\n')
      };
    } else if (type === 'class' || type === 'interface') {
      // 클래스: 첫 번째 { 부터 마지막 } 까지
      let braceCount = 0;
      let foundStart = false;
      let endIdx = lines.length - 1;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];

        for (let j = 0; j < line.length; j++) {
          if (line[j] === '{') {
            braceCount++;
            foundStart = true;
          } else if (line[j] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              endIdx = i;
              break;
            }
          }
        }

        if (foundStart && braceCount === 0) {
          break;
        }
      }

      // 클래스는 처음 100줄만 표시 (너무 길 수 있음)
      const classCode = lines.slice(startIdx, Math.min(endIdx + 1, startIdx + 100)).join('\n');
      return {
        startLine: startLineNum,
        endLine: Math.min(endIdx + 1, startIdx + 100),
        code: classCode + (endIdx > startIdx + 100 ? '\n\n// ... (이하 생략, 파일에서 전체 코드 확인) ...' : '')
      };
    }

    // 알 수 없는 타입은 5줄만 표시
    return {
      startLine: startLineNum,
      endLine: Math.min(startLineNum + 5, lines.length),
      code: lines.slice(startIdx, Math.min(startIdx + 5, lines.length)).join('\n')
    };
  }
}

module.exports = new PHPIndexService();
