/**
 * 쿼리 추출 컨트롤러
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QueryController {
  /**
   * 파일에서 SQL 쿼리 추출
   */
  async extractQueries(req, res) {
    try {
      const { filename } = req.query;

      if (!filename) {
        return res.json({
          success: false,
          error: '파일명이 필요합니다'
        });
      }

      // 프로젝트 루트 경로
      const projectRoot = path.join(__dirname, '../../..');

      // php-query 스킬 경로
      const skillPath = path.join(projectRoot, '.claude/skills/php-query/scripts/extract-queries.js');
      const indexPath = path.join(projectRoot, 'plugins/php-index-generator/output/index.json');
      const mobileDir = path.join(projectRoot, 'work/mobile');

      if (!fs.existsSync(skillPath)) {
        return res.json({
          success: false,
          error: 'php-query 스크립트를 찾을 수 없습니다'
        });
      }

      if (!fs.existsSync(indexPath)) {
        return res.json({
          success: false,
          error: '인덱스 파일을 찾을 수 없습니다'
        });
      }

      // PHP 파일 찾기 (work/mobile 디렉토리에서)
      const phpFile = this.findPhpFile(mobileDir, filename);
      if (!phpFile) {
        return res.json({
          success: false,
          error: `파일을 찾을 수 없습니다: ${filename}`
        });
      }

      // 상대 경로로 변환 (work/mobile 기준, 슬래시 통일)
      const relativePath = path.relative(mobileDir, phpFile).replace(/\\/g, '/');

      // Node.js에서 extract-queries.js 실행 (타임아웃 30초)
      const output = execSync(
        `node "${skillPath}" "${relativePath}" "${indexPath}"`,
        { encoding: 'utf-8', cwd: projectRoot, timeout: 30000 }
      );

      // 쿼리 결과 파싱
      const queries = this.parseQueryOutput(output);

      res.json({
        success: true,
        file: filename,
        queryCount: queries.length,
        queries: queries
      });
    } catch (error) {
      console.error('Query extraction error:', error.message);
      if (!res.headersSent) {
        res.json({
          success: false,
          error: error.message.substring(0, 500)
        });
      }
    }
  }

  /**
   * 파일 찾기 (재귀)
   */
  findPhpFile(dir, filename, maxDepth = 10, currentDepth = 0) {
    if (currentDepth >= maxDepth || !fs.existsSync(dir)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const found = this.findPhpFile(fullPath, filename, maxDepth, currentDepth + 1);
          if (found) return found;
        } else if (entry.name === filename) {
          return fullPath;
        }
      }
    } catch (e) {
      // 디렉토리 읽기 오류 무시
    }

    return null;
  }

  /**
   * 쿼리 출력 파싱
   */
  parseQueryOutput(output) {
    const queries = [];
    if (!output) return queries;

    const lines = output.split('\n');
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 테이블 시작 감지 (| # | 라인범위 | SQL 쿼리 |)
      if (line.includes('라인범위') && line.includes('SQL')) {
        inTable = true;
        i++; // 구분선 건너뛰기
        continue;
      }

      // 테이블 행 파싱
      if (inTable && line.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);

        if (cells.length >= 3 && /^\d+$/.test(cells[0])) {
          const lineRange = cells[1];
          const query = cells.slice(2).join('|'); // SQL에 | 포함 가능

          // 라인 범위 파싱
          const [startLine, endLine] = lineRange.split('-').map(s => parseInt(s.trim()));

          queries.push({
            index: parseInt(cells[0]),
            startLine: startLine || 0,
            endLine: endLine || 0,
            query: query
          });
        }
      }

      // 테이블 종료
      if (inTable && !line.startsWith('|') && line.length > 0) {
        inTable = false;
      }
    }

    return queries;
  }

  /**
   * PHP 파일 목록 조회
   */
  async listPhpFiles(req, res) {
    try {
      const projectRoot = path.join(__dirname, '../../..');
      const mobileDir = path.join(projectRoot, 'work/mobile');

      if (!fs.existsSync(mobileDir)) {
        return res.json({
          success: false,
          error: 'work/mobile 디렉토리를 찾을 수 없습니다'
        });
      }

      const files = [];
      this.walkDir(mobileDir, (filePath) => {
        if (filePath.endsWith('.php')) {
          const basename = path.basename(filePath);
          const relative = path.relative(mobileDir, filePath).replace(/\\/g, '/');
          files.push({
            name: basename,
            path: relative
          });
        }
      });

      // 파일명 기준으로 정렬
      files.sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        count: files.length,
        files: files
      });
    } catch (error) {
      console.error('File list error:', error);
      res.json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 디렉토리 순회 헬퍼
   */
  walkDir(dir, callback, maxDepth = 15, currentDepth = 0) {
    if (currentDepth >= maxDepth || !fs.existsSync(dir)) {
      return;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          this.walkDir(fullPath, callback, maxDepth, currentDepth + 1);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch (e) {
      // 디렉토리 읽기 오류 무시
    }
  }
}

module.exports = new QueryController();
