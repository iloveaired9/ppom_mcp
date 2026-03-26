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
const Database = require('better-sqlite3');
const IndexCache = require('./IndexCache');
const PHPParser = require('./PHPParser');

class IndexBuilder {
  constructor(options = {}) {
    this.options = {
      sourceDir: 'work/mobile',
      outputDir: 'plugins/php-index-generator/output',
      cacheDir: '.claude/php-index-cache',
      excludePatterns: ['vendor/*', 'vendors/*', 'node_modules/*', 'tests/*', '*.tmp.php'],
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

      if (verbose) {
        console.log(`🔨 파일 처리 중 (${filesToProcess.length}/${totalFiles})...`);
      }

      const startTime = Date.now();

      // 4. SQLite DB 초기화 (메모리 효율적 저장)
      const dbPath = path.join(this.options.outputDir, 'index.db');
      let dbExists = fs.existsSync(dbPath);
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');

      // 테이블 생성 또는 기존 데이터 초기화
      if (dbExists && options.force) {
        db.exec(`
          DELETE FROM symbols;
          DELETE FROM files;
          DELETE FROM dependencies;
        `);
      } else {
        db.exec(`
          CREATE TABLE IF NOT EXISTS symbols (
            fqcn TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            file TEXT NOT NULL,
            filename TEXT,
            line_start INTEGER,
            line_end INTEGER,
            symbol_json TEXT
          );
          CREATE TABLE IF NOT EXISTS files (
            file_path TEXT PRIMARY KEY,
            relative_path TEXT,
            hash TEXT,
            mtime INTEGER,
            symbols_json TEXT
          );
          CREATE TABLE IF NOT EXISTS dependencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT,
            dep_type TEXT,
            dep_json TEXT
          );
        `);
      }

      // 4. 배치 처리로 메모리 관리 (10개씩 - 속도 최적화)
      const BATCH_SIZE = 10;
      let totalProcessed = 0;
      const batchStartTime = Date.now();
      const allCodeBodies = []; // code-index 생성용 데이터 수집

      for (let batchStart = 0; batchStart < filesToProcess.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, filesToProcess.length);
        const batch = filesToProcess.slice(batchStart, batchEnd);
        const batchNum = Math.ceil((batchStart + 1) / BATCH_SIZE);
        const totalBatches = Math.ceil(filesToProcess.length / BATCH_SIZE);

        // 배치 내 파일 처리
        const batchSymbols = [];
        const batchDependencies = [];

        for (let i = 0; i < batch.length; i++) {
          const filePath = batch[i];
          const fileIndex = batchStart + i;

          const fileStartTime = Date.now();
          const fileSymbols = await this.processFile(filePath);
          const fileElapsed = Date.now() - fileStartTime;
          if (fileElapsed > 500) {
            console.log(`\n  ⚠️ 느린 파일: ${path.basename(filePath)} (${fileElapsed}ms)`);
          }
          batchSymbols.push({
            file: filePath,
            symbols: fileSymbols.symbols || [],
            includes: fileSymbols.includes || [],
            symbolCallMap: fileSymbols.symbolCallMap || {},
            codeBodies: fileSymbols.codeBodies || {} // code-index용 함수 본문
          });

          // code-index 생성용 codeBodies 수집
          if (fileSymbols.codeBodies && Object.keys(fileSymbols.codeBodies).length > 0) {
            allCodeBodies.push({
              file: filePath,
              codeBodies: fileSymbols.codeBodies
            });
          }

          if (fileSymbols.dependencies) {
            batchDependencies.push({
              file: filePath,
              dependencies: fileSymbols.dependencies
            });
          }

          totalProcessed++;

          // 진행도 표시 (매 파일마다)
          const progress = Math.round(totalProcessed / filesToProcess.length * 100);
          const elapsedMs = Date.now() - batchStartTime;
          const avgTimePerFile = elapsedMs / totalProcessed;
          const remainingFiles = filesToProcess.length - totalProcessed;
          const etaMs = avgTimePerFile * remainingFiles;
          const etaSeconds = Math.ceil(etaMs / 1000);

          // 진행도바 생성 (50글자)
          const barLength = 30;
          const filledLength = Math.round(barLength * progress / 100);
          const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

          process.stdout.write(`\r  ⏳ [${progressBar}] ${progress}% (${totalProcessed}/${filesToProcess.length}) | ETA: ${etaSeconds}s`);
        }

        // SQLite에 배치 데이터 저장 (메모리 효율적)
        this.saveBatchToDatabase(db, batchSymbols, batchDependencies);

        // 배치 완료 후 메모리 정리
        batchSymbols.length = 0;
        batchDependencies.length = 0;
        if (global.gc) {
          global.gc();
        }
      }

      // 처리 완료 시간 표시
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n  ✓ 완료! (${elapsedSeconds}초)\n`);

      // SQLite에서 최종 데이터 읽기
      if (verbose) console.log('🧬 색인 정리 중...');

      const { mergedIndex, dependencies, totalSymbols } = this.loadIndexFromDatabase(db);

      db.close();

      // 6. 메타데이터 생성 (totalSymbols 사용)
      const metadata = {
        sourceDir: this.options.sourceDir,
        totalFiles,
        processedFiles: filesToProcess.length,
        totalSymbols,
        namespaces: [''],
        buildTime: Date.now() - startTime,
        mode: filesToProcess.length === totalFiles ? 'full' : 'incremental',
        php_version: '5.6'
      };

      // 7. 최종 색인 생성
      const index = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        metadata,
        symbols: mergedIndex.symbols,
        fileMap: mergedIndex.fileMap,
        callGraph: mergedIndex.callGraph,
        dependencies
      };

      if (verbose) console.log('💾 색인 저장 중...');

      // 8. 색인 저장
      await this.writeIndex(index);

      // 9. code-index.json 생성 (함수 본문 저장)
      if (verbose) console.log('📝 코드 색인 생성 중...');
      const codeIndex = this.buildCodeIndex(allCodeBodies, mergedIndex.symbols);
      await this.writeCodeIndex(codeIndex);

      if (verbose) console.log('🗄️  캐시 업데이트 중...');

      // 10. 캐시 업데이트
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
      if (options.verbose) {
        console.error(`[STACK] ${error.stack}`);
      }
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
            // 제외된 디렉토리는 진입하지 않음
            if (!this.shouldExclude(relativePath + '/')) {
              walkSync(fullPath);
            }
          } else if (entry.isFile() && (entry.name.endsWith('.php') || entry.name.endsWith('.inc'))) {
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
    // 하드코딩: vendors 디렉토리는 절대로 제외
    if (filePath.includes('vendors')) {
      return true;
    }

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

      // 함수 본문 추출 (code-index.json용)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const codeBodies = this.extractCodeBodies(fileContent, result.symbols);
        result.codeBodies = codeBodies;
      } catch (codeError) {
        // 코드 추출 실패해도 계속 진행
        console.warn(`[WARN] 코드 추출 실패 (${filePath}): ${codeError.message}`);
        result.codeBodies = {};
      }

      // 파일 크기가 크면 메모리 정리 강제 실행
      const stats = fs.statSync(filePath);
      if (stats.size > 1024 * 1024) { // 1MB 이상
        if (global.gc) {
          global.gc();
        }
      }

      return result;
    } catch (error) {
      console.warn(`[WARN] 파일 처리 실패 (${filePath}): ${error.message}`);
      return { symbols: [], includes: [], codeBodies: {} };
    }
  }

  /**
   * 파일에서 심볼들의 코드 본문을 추출합니다.
   * @param {string} fileContent - 파일 내용
   * @param {array} symbols - 추출된 심볼 배열
   * @returns {object} 심볼별 코드 본문 { symbolName: { type, startLine, endLine, code } }
   */
  extractCodeBodies(fileContent, symbols) {
    const codeBodies = {};

    for (const symbol of symbols) {
      try {
        let code = '';
        let startLine = symbol.line;
        let endLine = symbol.line;

        if (symbol.type === 'function') {
          // 함수 본문 추출
          code = this.parser.extractFunctionBody(fileContent, symbol.name);
          if (code) {
            const lines = fileContent.substring(0, fileContent.indexOf(code)).split('\n').length;
            startLine = lines;
            endLine = lines + code.split('\n').length - 1;
          }
        } else if (symbol.type === 'method') {
          // 메서드 본문 추출
          code = this.parser.extractMethodBody(fileContent, symbol.name);
          if (code) {
            const lines = fileContent.substring(0, fileContent.indexOf(code)).split('\n').length;
            startLine = lines;
            endLine = lines + code.split('\n').length - 1;
          }
        } else if (symbol.type === 'class') {
          // 클래스 본문 추출 (최대 200줄)
          code = this.parser.extractClassBody(fileContent, symbol.name, 200);
          if (code) {
            const lines = fileContent.substring(0, fileContent.indexOf(code)).split('\n').length;
            startLine = lines;
            endLine = lines + code.split('\n').length - 1;
          }
        }

        if (code) {
          codeBodies[symbol.name] = {
            type: symbol.type,
            startLine,
            endLine,
            code: code
          };
        }
      } catch (err) {
        // 개별 심볼 코드 추출 실패해도 계속
        console.warn(`[WARN] 심볼 코드 추출 실패 (${symbol.name}): ${err.message}`);
      }
    }

    return codeBodies;
  }

  /**
   * 심볼을 병합합니다 (FQCN 생성).
   * @param {array} allSymbols - 모든 심볼 데이터
   * @returns {object} 병합된 색인
   */
  mergeSymbols(allSymbols, existingIndex = null) {
    const symbols = existingIndex && existingIndex.symbols ? { ...existingIndex.symbols } : {};
    const fileMap = existingIndex && existingIndex.fileMap ? { ...existingIndex.fileMap } : {};
    const fileCache = existingIndex && existingIndex.fileCache ? { ...existingIndex.fileCache } : {};
    const callGraph = existingIndex && existingIndex.callGraph ? { ...existingIndex.callGraph } : {};

    // 첫 번째 패스: 심볼 기본 정보 저장
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
          namespace: '',
          calls: [],      // 호출하는 함수들
          calledBy: []    // 호출하는 함수들
        };

        // symbolCallMap에서 호출 정보 가져오기
        if (data.symbolCallMap && data.symbolCallMap[symbol.name]) {
          const callInfo = data.symbolCallMap[symbol.name];
          if (callInfo.calls) {
            symbols[fqcn].calls = callInfo.calls.map(c => c.name);
            callGraph[fqcn] = callInfo.calls.map(c => c.name);
          }
        }
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

    // 두 번째 패스: 역 호출 관계 (calledBy) 구축
    for (const [caller, callees] of Object.entries(callGraph)) {
      for (const callee of callees) {
        // callee를 찾기 (동일한 파일 또는 다른 파일에서)
        for (const [fqcn, symbolInfo] of Object.entries(symbols)) {
          if (fqcn.endsWith(`::${callee}`)) {
            if (!symbolInfo.calledBy) {
              symbolInfo.calledBy = [];
            }
            if (!symbolInfo.calledBy.includes(caller)) {
              symbolInfo.calledBy.push(caller);
            }
          }
        }
      }
    }

    return { symbols, fileMap, fileCache, callGraph };
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
   * 코드 색인을 생성합니다 (함수 본문 포함).
   * @param {array} allSymbols - 모든 파일의 심볼 데이터
   * @param {object} mergedSymbols - 병합된 심볼 데이터 (FQCN 기반)
   * @returns {object} 코드 색인
   */
  buildCodeIndex(allSymbols, mergedSymbols) {
    const codeIndex = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      metadata: {
        sourceDir: this.options.sourceDir,
        totalSymbols: Object.keys(mergedSymbols).length,
        buildTime: Date.now() - this.startTime
      },
      symbols: {}
    };

    // 모든 파일에서 코드 본문 수집
    for (const fileData of allSymbols) {
      if (!fileData.codeBodies) continue;

      const filePath = fileData.file;
      const relativePath = path.relative(this.options.sourceDir, filePath);

      for (const [symbolName, codeBody] of Object.entries(fileData.codeBodies)) {
        // FQCN = 파일명::심볼명
        const fqcn = `${relativePath}::${symbolName}`;

        // mergedSymbols에서 해당 심볼 찾기
        if (mergedSymbols[fqcn]) {
          codeIndex.symbols[fqcn] = {
            name: symbolName,
            type: codeBody.type,
            file: filePath,
            startLine: codeBody.startLine,
            endLine: codeBody.endLine,
            code: codeBody.code
          };
        }
      }
    }

    return codeIndex;
  }

  /**
   * 코드 색인을 파일로 저장합니다.
   * @param {object} codeIndex - 코드 색인
   */
  async writeCodeIndex(codeIndex) {
    try {
      // 출력 디렉토리 생성
      if (!fs.existsSync(this.options.outputDir)) {
        fs.mkdirSync(this.options.outputDir, { recursive: true });
      }

      const outputPath = path.join(this.options.outputDir, 'code-index.json');
      const content = JSON.stringify(codeIndex, null, 2);
      fs.writeFileSync(outputPath, content, 'utf8');

      const stats = fs.statSync(outputPath);
      console.log(`✓ code-index.json 생성: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.warn(`[WARN] 코드 색인 저장 실패: ${error.message}`);
      // 코드 색인 생성 실패는 빌드 실패로 취급하지 않음
    }
  }

  /**
   * 의존성을 병합합니다.
   * @param {array} allDependencies - 모든 파일의 의존성 데이터
   * @returns {object} 병합된 의존성 데이터
   */
  mergeDependencies(allDependencies, existingDeps = null) {
    const result = (existingDeps && Object.keys(existingDeps).length > 0) ? {
      byFile: { ...existingDeps.byFile },
      functionCalls: { ...existingDeps.functionCalls },
      classDependencies: {
        extends: [...(existingDeps.classDependencies?.extends || [])],
        implements: [...(existingDeps.classDependencies?.implements || [])]
      },
      fileDependencies: { ...existingDeps.fileDependencies }
    } : {
      byFile: {},
      functionCalls: {},
      classDependencies: {
        extends: [],
        implements: []
      },
      fileDependencies: {}
    };

    for (const data of allDependencies) {
      const filePath = data.file;
      const relativePath = path.relative(this.options.sourceDir, filePath);
      const deps = data.dependencies;

      // 파일별 의존성 저장
      result.byFile[relativePath] = {
        functionCalls: deps.functionCalls || [],
        classDependencies: deps.classDependencies || [],
        fileDependencies: deps.fileDependencies || []
      };

      // 함수 호출 통계
      if (deps.functionCalls) {
        for (const call of deps.functionCalls) {
          if (!call.builtin) {
            if (!result.functionCalls[call.name]) {
              result.functionCalls[call.name] = {
                count: 0,
                files: [],
                type: call.type
              };
            }
            result.functionCalls[call.name].count++;
            result.functionCalls[call.name].files.push(relativePath);
          }
        }
      }

      // 클래스 의존성
      if (deps.classDependencies) {
        for (const classDep of deps.classDependencies) {
          if (classDep.type === 'extends') {
            result.classDependencies.extends.push({
              child: classDep.class,
              parent: classDep.parent,
              file: relativePath
            });
          } else if (classDep.type === 'implements') {
            result.classDependencies.implements.push({
              class: classDep.class,
              interface: classDep.interface,
              file: relativePath
            });
          }
        }
      }

      // 파일 의존성 (include/require)
      if (deps.fileDependencies) {
        for (const fileDep of deps.fileDependencies) {
          const depKey = fileDep.path;
          if (!result.fileDependencies[depKey]) {
            result.fileDependencies[depKey] = {
              type: fileDep.type,
              count: 0,
              files: []
            };
          }
          result.fileDependencies[depKey].count++;
          result.fileDependencies[depKey].files.push(relativePath);
        }
      }
    }

    return result;
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

  /**
   * SQLite에 배치 데이터 저장
   */
  saveBatchToDatabase(db, batchSymbols, batchDependencies) {
    const insertSymbol = db.prepare(`
      INSERT OR REPLACE INTO symbols (fqcn, name, type, file, filename, line_start, line_end, symbol_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertFile = db.prepare(`
      INSERT OR REPLACE INTO files (file_path, relative_path, hash, mtime, symbols_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertDep = db.prepare(`
      INSERT INTO dependencies (file_path, dep_type, dep_json)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const data of batchSymbols) {
        const filePath = data.file;
        const relativePath = path.relative(this.options.sourceDir, filePath);

        const filename = path.basename(filePath);
        for (const symbol of data.symbols) {
          const fqcn = `${relativePath}::${symbol.name}`;
          insertSymbol.run(fqcn, symbol.name, symbol.type, filePath, filename, symbol.line || symbol.start || 0, symbol.end || 0, JSON.stringify(symbol));
        }

        insertFile.run(filePath, relativePath, '', 0, JSON.stringify(data.symbols));
      }

      for (const data of batchDependencies) {
        if (data.dependencies) {
          insertDep.run(data.file, 'mixed', JSON.stringify(data.dependencies));
        }
      }
    });

    transaction();
  }

  /**
   * SQLite에서 최종 색인 데이터 로드 (스트리밍 방식 - 메모리 최적화)
   */
  loadIndexFromDatabase(db) {
    // 메모리 압박 감소: 스켈레톤 객체만 생성
    const symbols = {};
    const fileMap = {};
    const callGraph = {};
    let totalSymbols = 0;

    // 심볼 카운트만 조회
    const countRow = db.prepare('SELECT COUNT(*) as count FROM symbols').get();
    totalSymbols = countRow.count;

    // 파일 맵만 생성 (상세 정보 없이)
    const fileStmt = db.prepare('SELECT file_path, relative_path FROM files');
    for (const row of fileStmt.iterate()) {
      fileMap[row.file_path] = {
        hash: '',
        mtime: 0,
        symbols: [],
        includes: []
      };
    }

    // 심볼 로드 (스트리밍)
    const symbolStmt = db.prepare('SELECT fqcn, file, line_start, symbol_json FROM symbols');
    for (const row of symbolStmt.iterate()) {
      try {
        const symbol = JSON.parse(row.symbol_json);
        symbol.file = row.file;
        symbol.filename = path.basename(row.file);
        // line_start가 0이면 symbol_json의 line 값 유지
        if (row.line_start > 0) {
          symbol.line = row.line_start;
        }
        symbols[row.fqcn] = symbol;
      } catch (e) {
        // JSON 파싱 오류 무시
      }
    }

    // 의존성 로드
    const dependencies = {
      byFile: {},
      functionCalls: {},
      classDependencies: {
        extends: [],
        implements: []
      },
      fileDependencies: {}
    };

    // 의존성 로드 (스트리밍)
    const depStmt = db.prepare('SELECT file_path, dep_json FROM dependencies');
    for (const row of depStmt.iterate()) {
      const relativePath = path.relative(this.options.sourceDir, row.file_path);
      try {
        const deps = JSON.parse(row.dep_json);
        dependencies.byFile[relativePath] = {
          functionCalls: deps.functionCalls || [],
          classDependencies: deps.classDependencies || [],
          fileDependencies: deps.fileDependencies || []
        };
      } catch (e) {
        // JSON 파싱 오류 무시
      }
    }

    return {
      mergedIndex: { symbols, fileMap, callGraph },
      dependencies,
      totalSymbols
    };
  }
}

module.exports = IndexBuilder;
