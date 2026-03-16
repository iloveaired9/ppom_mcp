#!/usr/bin/env node

/**
 * IndexBuilder.js
 * 파일 시스템 스캔, 색인 생성, 심볼 병합
 *
 * PHP 5.6 특화:
 * - FQCN = 파일명::심볼명 (네임스페이스 없음)
 * - include/require 의존성 추적
 */

const fs = require('fs');
const path = require('path');
const IndexCache = require('./IndexCache');
const PHPParser = require('./PHPParser');

class IndexBuilder {
  constructor(options = {}) {
    this.options = {
      sourceDir: 'work/mobile',
      outputDir: 'plugins/php-index-generator/output',
      cacheDir: '.claude/php-index-cache',
      excludePatterns: ['vendor/*', 'node_modules/*', 'tests/*', '*.tmp.php'],
      includePatterns: ['**/*.php'],
      incremental: true,
      followSymlinks: false,
      ...options
    };

    this.cache = new IndexCache(this.options.cacheDir);
    this.parser = new PHPParser();
    this.startTime = 0;
  }

  /**
   * 색인을 생성합니다 (전체 또는 증분).
   * @param {object} options - 옵션 { force, verbose }
   * @returns {Promise<object>} 빌드 결과
   */
  async build(options = {}) {
    this.startTime = Date.now();
    const verbose = options.verbose || false;

    try {
      if (verbose) console.log('📂 캐시 로드 중...');

      // 1. 캐시 로드
      await this.cache.loadCache();

      if (verbose) console.log('📋 PHP 파일 수집 중...');

      // 2. PHP 파일 수집
      const files = await this.collectFiles(this.options.sourceDir);
      const totalFiles = files.length;

      if (verbose) console.log(`✓ ${totalFiles}개 파일 발견`);

      // 3. 증분 또는 전체 빌드
      let filesToProcess = files;
      if (options.force) {
        if (verbose) console.log('⚠️  강제 전체 재색인화');
        await this.cache.clearAll();
      } else if (this.options.incremental) {
        if (verbose) console.log('🔄 변경된 파일 필터링 중...');
        filesToProcess = await this.filterChangedFiles(files);
        if (verbose) console.log(`✓ ${filesToProcess.length}개 파일 변경됨`);
      }

      if (verbose) console.log(`🔨 파일 처리 중 (${filesToProcess.length}/${totalFiles})...`);

      // 4. 파일 처리
      const allSymbols = [];
      for (const filePath of filesToProcess) {
        const fileSymbols = await this.processFile(filePath);
        allSymbols.push({
          file: filePath,
          symbols: fileSymbols.symbols || [],
          includes: fileSymbols.includes || []
        });

        if (verbose && (allSymbols.length % 10 === 0)) {
          console.log(`  ✓ ${allSymbols.length}/${filesToProcess.length} 파일 처리됨`);
        }
      }

      if (verbose) console.log('🧬 심볼 병합 중...');

      // 5. 심볼 병합 (FQCN 생성)
      const mergedIndex = this.mergeSymbols(allSymbols);

      // 6. 메타데이터 생성
      const metadata = this.generateMetadata(mergedIndex, totalFiles, filesToProcess.length);

      // 7. 최종 색인 생성
      const index = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        metadata,
        symbols: mergedIndex.symbols,
        fileMap: mergedIndex.fileMap
      };

      if (verbose) console.log('💾 색인 저장 중...');

      // 8. 색인 저장
      await this.writeIndex(index);

      if (verbose) console.log('🗄️  캐시 업데이트 중...');

      // 9. 캐시 업데이트
      const cacheData = {
        files: mergedIndex.fileCache,
        version: '1.0.0'
      };
      await this.cache.saveCache(cacheData);

      const buildTime = Date.now() - this.startTime;

      return {
        success: true,
        totalFiles,
        processedFiles: filesToProcess.length,
        addedSymbols: Object.keys(mergedIndex.symbols).length,
        removedSymbols: 0,
        totalSymbols: Object.keys(mergedIndex.symbols).length,
        buildTime,
        outputFile: path.join(this.options.outputDir, 'index.json'),
        mode: options.force ? 'full' : 'incremental'
      };
    } catch (error) {
      console.error(`[ERROR] 색인 생성 실패: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 변경된 파일만 필터링합니다.
   * @param {array} files - 파일 배열
   * @returns {Promise<array>} 변경된 파일 배열
   */
  async filterChangedFiles(files) {
    const changedFiles = [];

    for (const filePath of files) {
      const hasChanged = await this.cache.hasChanged(filePath);
      if (hasChanged) {
        changedFiles.push(filePath);
      }
    }

    return changedFiles;
  }

  /**
   * PHP 파일을 수집합니다.
   * @param {string} sourceDir - 소스 디렉토리
   * @returns {Promise<array>} PHP 파일 경로 배열
   */
  async collectFiles(sourceDir) {
    const files = [];

    const walkSync = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(sourceDir, fullPath);

          // 제외 패턴 확인
          if (this.shouldExclude(relativePath)) {
            continue;
          }

          if (entry.isDirectory()) {
            walkSync(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.php')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`[WARN] 디렉토리 읽기 실패 (${dir}): ${error.message}`);
      }
    };

    walkSync(sourceDir);
    return files;
  }

  /**
   * 파일을 제외할지 결정합니다.
   * @param {string} filePath - 파일 경로
   * @returns {boolean} 제외할지 여부
   */
  shouldExclude(filePath) {
    for (const pattern of this.options.excludePatterns) {
      // 간단한 glob 패턴 매칭
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      if (new RegExp(`^${regexPattern}$`).test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 단일 파일을 처리합니다.
   * @param {string} filePath - 파일 경로
   * @returns {Promise<object>} 파싱 결과
   */
  async processFile(filePath) {
    try {
      const result = await this.parser.parseFile(filePath);

      // 캐시 업데이트를 위해 해시 계산
      const content = fs.readFileSync(filePath, 'utf8');
      const symbols = result.symbols || [];
      const symbolNames = symbols.map(s => s.name);

      const hash = this.parser.calculateHash ?
        this.parser.calculateHash(content) :
        require('crypto').createHash('sha256').update(content).digest('hex');

      await this.cache.updateHash(filePath, hash, symbolNames);

      return result;
    } catch (error) {
      console.warn(`[WARN] 파일 처리 실패 (${filePath}): ${error.message}`);
      return { symbols: [], includes: [] };
    }
  }

  /**
   * 심볼을 병합합니다 (FQCN 생성).
   * @param {array} allSymbols - 모든 심볼 데이터
   * @returns {object} 병합된 색인
   */
  mergeSymbols(allSymbols) {
    const symbols = {};
    const fileMap = {};
    const fileCache = {};

    for (const data of allSymbols) {
      const filePath = data.file;
      const relativePath = path.relative(this.options.sourceDir, filePath);
      const fileSymbols = [];

      for (const symbol of data.symbols) {
        // FQCN = 파일명::심볼명 (PHP 5.6 특화)
        const fqcn = `${relativePath}::${symbol.name}`;
        fileSymbols.push(fqcn);

        symbols[fqcn] = {
          ...symbol,
          file: filePath,
          namespace: ''
        };
      }

      // 파일 맵 생성
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = require('crypto').createHash('sha256').update(content).digest('hex');
      const stats = fs.statSync(filePath);

      fileMap[filePath] = {
        hash,
        mtime: stats.mtime.getTime(),
        symbols: fileSymbols,
        includes: (data.includes || []).map(inc => inc.path)
      };

      fileCache[filePath] = {
        hash,
        mtime: stats.mtime.getTime(),
        symbols: fileSymbols
      };
    }

    return { symbols, fileMap, fileCache };
  }

  /**
   * 색인을 JSON 파일로 저장합니다.
   * @param {object} index - 색인 데이터
   * @returns {Promise<void>}
   */
  async writeIndex(index) {
    try {
      // 출력 디렉토리 생성
      if (!fs.existsSync(this.options.outputDir)) {
        fs.mkdirSync(this.options.outputDir, { recursive: true });
      }

      const outputPath = path.join(this.options.outputDir, 'index.json');
      const content = JSON.stringify(index, null, 2);
      fs.writeFileSync(outputPath, content, 'utf8');
    } catch (error) {
      console.error(`[ERROR] 색인 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 메타데이터를 생성합니다.
   * @param {object} mergedIndex - 병합된 색인
   * @param {number} totalFiles - 전체 파일 수
   * @param {number} processedFiles - 처리된 파일 수
   * @returns {object} 메타데이터
   */
  generateMetadata(mergedIndex, totalFiles, processedFiles) {
    const buildTime = Date.now() - this.startTime;

    return {
      sourceDir: this.options.sourceDir,
      totalFiles,
      processedFiles,
      totalSymbols: Object.keys(mergedIndex.symbols).length,
      namespaces: [''],  // PHP 5.6은 네임스페이스 없음
      buildTime,
      mode: processedFiles === totalFiles ? 'full' : 'incremental',
      php_version: '5.6'
    };
  }
}

module.exports = IndexBuilder;
