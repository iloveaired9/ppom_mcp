/**
 * PHP Index Generator CLI 래퍼
 * 기존 CLI 도구를 Express에서 호출하는 서비스
 */

const { execSync, exec } = require('child_process');
const path = require('path');

class PHPIndexService {
  constructor() {
    this.cliPath = path.join(__dirname, '../../../plugins/php-index-generator/index.js');
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분
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
}

module.exports = new PHPIndexService();
