/**
 * Index Management Controller
 * PHP Index 색인의 상태 조회, 재생성, 캐시 관리 등을 담당합니다
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 색인 파일 경로
const INDEX_PATH = path.join(__dirname, '../../..', 'plugins/php-index-generator/output/index.json');
const CACHE_PATH = path.join(__dirname, '../../..', 'plugins/php-index-generator/output/.cache');
const STRING_INDEX_PATH = path.join(__dirname, '../../..', 'plugins/php-string-finder/output/string-index.json');

class IndexController {
  constructor() {
    this.indexPath = INDEX_PATH;
    this.cachePath = CACHE_PATH;
    this.stringIndexPath = STRING_INDEX_PATH;
    this.rebuilding = false;
    this.rebuildProgress = {
      status: 'idle', // idle, running, completed
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      startTime: null,
      estimatedTime: null,
      elapsedTime: null
    };
  }

  /**
   * 색인 상태 조회
   */
  async getIndexStatus(req, res) {
    try {
      if (!fs.existsSync(this.indexPath)) {
        return res.json({
          success: true,
          data: {
            exists: false,
            message: '색인이 아직 생성되지 않았습니다. 재색인 버튼을 클릭하세요.'
          }
        });
      }

      const stats = fs.statSync(this.indexPath);
      const indexData = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));

      // 문자열 색인 정보
      let stringIndexInfo = null;
      if (fs.existsSync(this.stringIndexPath)) {
        const stringStats = fs.statSync(this.stringIndexPath);
        stringIndexInfo = {
          path: this.stringIndexPath,
          size: this.formatSize(stringStats.size),
          fileSize: stringStats.size,
          modified: stringStats.mtime
        };
      }

      res.json({
        success: true,
        data: {
          exists: true,
          path: this.indexPath,
          size: this.formatSize(stats.size),
          fileSize: stats.size,
          createdAt: stats.mtime,
          lastModified: stats.mtime,
          isRebuilding: this.rebuilding,
          symbols: Object.keys(indexData.symbols || {}).length,
          functions: this.countByType(indexData.symbols, 'function'),
          classes: this.countByType(indexData.symbols, 'class'),
          files: Object.keys(indexData.files || {}).length,
          lines: indexData.metadata?.totalLines || 0,
          sourceDir: indexData.metadata?.sourceDir || 'work/mobile',
          coverage: this.calculateCoverage(indexData),
          stringIndex: stringIndexInfo
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '색인 상태 조회 실패'
      });
    }
  }

  /**
   * 색인 통계 조회
   */
  async getIndexStats(req, res) {
    try {
      if (!fs.existsSync(this.indexPath)) {
        return res.json({
          success: true,
          data: {
            exists: false,
            message: '색인이 없습니다'
          }
        });
      }

      const indexData = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
      const symbols = indexData.symbols || {};

      // 타입별 집계
      const typeCount = {};
      Object.values(symbols).forEach(symbol => {
        const type = symbol.type || 'unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      // 파일별 통계
      const fileStats = indexData.files || {};
      const totalPhpFiles = Object.keys(fileStats).length;

      res.json({
        success: true,
        data: {
          totalSymbols: Object.keys(symbols).length,
          totalFiles: totalPhpFiles,
          byType: typeCount,
          metadata: {
            buildTime: indexData.metadata?.buildTime,
            version: indexData.metadata?.version || '1.0.0',
            sourceDir: indexData.metadata?.sourceDir || 'work/mobile',
            processedFiles: indexData.metadata?.processedFiles || 0,
            totalLines: indexData.metadata?.totalLines || 0,
            errors: indexData.metadata?.errors?.length || 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '통계 조회 실패'
      });
    }
  }

  /**
   * 색인 재생성
   */
  async rebuildIndex(req, res) {
    try {
      if (this.rebuilding) {
        return res.status(409).json({
          success: false,
          error: '이미 색인 재생성이 진행 중입니다'
        });
      }

      this.rebuilding = true;
      const forceFlag = req.body?.force ? '--force' : '';
      const sourceDir = req.body?.sourceDir || 'work/mobile';

      // 진행상황 초기화
      this.rebuildProgress = {
        status: 'running',
        progress: 0,
        totalFiles: 0,
        processedFiles: 0,
        currentFile: '준비 중...',
        startTime: Date.now(),
        estimatedTime: null,
        elapsedTime: 0
      };

      // 비동기로 재색인 실행
      const command = `cd ${path.join(__dirname, '../../..')} && npm run php:index:build -- --source ${sourceDir} ${forceFlag}`;

      res.json({
        success: true,
        message: '색인 재생성이 시작되었습니다. 진행 상황은 실시간으로 업데이트됩니다.',
        isRebuilding: true
      });

      // 백그라운드에서 실행
      execAsync(command)
        .then(() => {
          this.rebuilding = false;
          this.rebuildProgress.status = 'completed';
          this.rebuildProgress.progress = 100;
          console.log('✅ 색인 재생성 완료');
        })
        .catch(error => {
          this.rebuilding = false;
          this.rebuildProgress.status = 'failed';
          this.rebuildProgress.error = error.message;
          console.error('❌ 색인 재생성 실패:', error.message);
        });

    } catch (error) {
      this.rebuilding = false;
      this.rebuildProgress.status = 'failed';
      res.status(500).json({
        success: false,
        error: error.message || '색인 재생성 시작 실패'
      });
    }
  }

  /**
   * 색인 재생성 진행상황 조회
   */
  async getRebuildProgress(req, res) {
    try {
      // 색인 파일 현재 크기 확인 (진행상황 추정)
      if (this.rebuilding && fs.existsSync(this.indexPath)) {
        const stats = fs.statSync(this.indexPath);
        const currentSize = stats.size;

        // 크기 기반 진행률 계산 (대략적)
        // 일반적으로 최종 색인 크기는 11-12MB
        const estimatedFinalSize = 12 * 1024 * 1024;
        const sizeBasedProgress = Math.min(Math.floor((currentSize / estimatedFinalSize) * 90), 90);

        // 경과 시간 기반 진행률
        const elapsedTime = Date.now() - this.rebuildProgress.startTime;
        this.rebuildProgress.elapsedTime = Math.floor(elapsedTime / 1000); // 초 단위

        // 진행률 업데이트 (크기 기반과 경과 시간 기반의 평균)
        this.rebuildProgress.progress = Math.max(sizeBasedProgress, Math.floor(elapsedTime / 50));
        this.rebuildProgress.progress = Math.min(this.rebuildProgress.progress, 95); // 최대 95%
      }

      res.json({
        success: true,
        data: this.rebuildProgress
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 캐시 삭제
   */
  async clearCache(req, res) {
    try {
      let clearedCount = 0;

      // PHP Index 캐시 삭제
      if (fs.existsSync(this.cachePath)) {
        fs.rmSync(this.cachePath, { recursive: true, force: true });
        clearedCount++;
      }

      // 문자열 검색 캐시 삭제
      const stringCachePath = path.join(__dirname, '../../..', 'plugins/php-string-finder/output/.cache');
      if (fs.existsSync(stringCachePath)) {
        fs.rmSync(stringCachePath, { recursive: true, force: true });
        clearedCount++;
      }

      res.json({
        success: true,
        message: `${clearedCount}개의 캐시가 삭제되었습니다`,
        clearedCount: clearedCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '캐시 삭제 실패'
      });
    }
  }

  /**
   * 색인 내보내기
   */
  async exportIndex(req, res) {
    try {
      if (!fs.existsSync(this.indexPath)) {
        return res.status(404).json({
          success: false,
          error: '색인 파일이 없습니다'
        });
      }

      const format = req.query.format || 'json';
      const indexData = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="index.json"');
        res.send(JSON.stringify(indexData, null, 2));
      } else if (format === 'csv') {
        // CSV 포맷으로 변환
        const csv = this.convertToCSV(indexData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="index.csv"');
        res.send(csv);
      } else {
        res.status(400).json({
          success: false,
          error: '지원하지 않는 포맷입니다. json 또는 csv를 사용하세요.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '내보내기 실패'
      });
    }
  }

  /**
   * 헬퍼 메서드: 파일 크기 포맷팅
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 헬퍼 메서드: 타입별 심볼 개수 세기
   */
  countByType(symbols, type) {
    if (!symbols) return 0;
    return Object.values(symbols).filter(s => s.type === type).length;
  }

  /**
   * 헬퍼 메서드: 커버리지 계산
   */
  calculateCoverage(indexData) {
    const totalFiles = Object.keys(indexData.files || {}).length;
    const errors = indexData.metadata?.errors?.length || 0;

    if (totalFiles === 0) return '0%';

    const coverage = ((totalFiles - errors) / totalFiles * 100).toFixed(1);
    return `${coverage}%`;
  }

  /**
   * 헬퍼 메서드: CSV 변환
   */
  convertToCSV(indexData) {
    const symbols = indexData.symbols || {};
    const rows = [['FQCN', 'Name', 'Type', 'File', 'Line', 'Calls']];

    Object.entries(symbols).forEach(([fqcn, symbol]) => {
      rows.push([
        fqcn,
        symbol.name || '',
        symbol.type || '',
        symbol.file || '',
        symbol.line || '',
        (symbol.calls || []).length
      ]);
    });

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * work 폴더 하위 디렉토리 목록 조회
   */
  async getSourceFolders(req, res) {
    try {
      const workDir = path.join(__dirname, '../../../work');

      // work 폴더가 없으면 빈 배열 반환
      if (!fs.existsSync(workDir)) {
        return res.json({
          success: true,
          data: {
            folders: [],
            basePath: 'work'
          }
        });
      }

      // work 폴더의 모든 항목 읽기
      const items = fs.readdirSync(workDir);
      const folders = [];

      // 폴더만 필터링 (파일 제외)
      items.forEach(item => {
        const itemPath = path.join(workDir, item);
        try {
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            folders.push({
              name: item,
              path: `work/${item}`,
              fileCount: this.countFiles(itemPath),
              lastModified: stats.mtime.toISOString()
            });
          }
        } catch (error) {
          // 접근 불가 폴더는 무시
        }
      });

      res.json({
        success: true,
        data: {
          folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
          basePath: 'work'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || '폴더 목록 조회 실패'
      });
    }
  }

  /**
   * 디렉토리 내 파일 개수 카운트
   */
  countFiles(dirPath, ext = '.php') {
    try {
      if (!fs.existsSync(dirPath)) return 0;

      const items = fs.readdirSync(dirPath);
      let count = 0;

      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        try {
          const stats = fs.statSync(itemPath);
          if (stats.isFile() && item.endsWith(ext)) {
            count++;
          } else if (stats.isDirectory()) {
            count += this.countFiles(itemPath, ext);
          }
        } catch (error) {
          // 무시
        }
      });

      return count;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new IndexController();
