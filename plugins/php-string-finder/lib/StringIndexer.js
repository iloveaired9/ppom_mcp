/**
 * StringIndexer - 문자열 색인화 및 저장
 * 기존 php-index-generator의 IndexBuilder 패턴을 따릅니다
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const crypto = require('crypto');

class StringIndexer {
  constructor(options = {}) {
    this.sourceDir = options.sourceDir || 'work/mobile';
    this.outputDir = options.outputDir || './plugins/php-string-finder/output';
    this.indexPath = path.join(this.outputDir, 'string-index.json');
    this.cacheFile = path.join(this.outputDir, '.cache');

    // 출력 디렉토리 생성
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // 색인 데이터 로드
    this.indexData = this.loadIndex();
  }

  /**
   * 색인 생성/갱신
   */
  async build(options = {}) {
    console.log(`\n🔍 문자열 색인 생성 중...`);
    console.log(`📂 소스: ${this.sourceDir}\n`);

    const startTime = Date.now();
    const files = this.getPhpFiles();
    const cache = this.loadCache();

    let processedCount = 0;
    let skippedCount = 0;
    let errors = [];

    // 색인 초기화
    if (options.force) {
      this.indexData = { strings: {}, files: {}, meta: { buildTime: new Date(), version: '1.0.0' } };
    }

    for (const file of files) {
      try {
        const filePath = path.relative(process.cwd(), file);
        const fileHash = this.getFileHash(file);
        const cachedHash = cache[filePath];

        // 파일이 변경되었는지 확인
        if (!options.force && cachedHash && cachedHash === fileHash) {
          skippedCount++;
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        const strings = this.extractStrings(content, filePath);

        // 색인에 추가
        for (const str of strings) {
          const key = str.string.toLowerCase();
          if (!this.indexData.strings[key]) {
            this.indexData.strings[key] = [];
          }
          this.indexData.strings[key].push({
            file: filePath,
            line: str.line,
            func: str.func,
            type: str.type,
            context: str.context
          });
        }

        // 파일 메타데이터 저장
        this.indexData.files[filePath] = {
          hash: fileHash,
          indexed: new Date(),
          stringCount: strings.length
        };

        // 캐시 업데이트
        cache[filePath] = fileHash;
        processedCount++;

        // 진행률 표시
        if (processedCount % 50 === 0) {
          console.log(`⏳ [${processedCount}/${files.length}] 처리 중...`);
        }
      } catch (err) {
        errors.push({ file, error: err.message });
      }
    }

    // 결과 저장
    this.indexData.meta = {
      buildTime: new Date(),
      version: '1.0.0',
      sourceDir: this.sourceDir,
      totalFiles: files.length,
      processedFiles: processedCount,
      totalStrings: Object.keys(this.indexData.strings).length
    };

    this.saveIndex();
    this.saveCache(cache);

    const duration = Date.now() - startTime;

    console.log(`\n✅ 색인 생성 완료!`);
    console.log(`   처리: ${processedCount}개 파일`);
    console.log(`   건너뜀: ${skippedCount}개 파일`);
    console.log(`   오류: ${errors.length}개`);
    console.log(`   총 문자열: ${this.indexData.meta.totalStrings}개`);
    console.log(`   소요 시간: ${duration}ms\n`);

    if (errors.length > 0) {
      console.warn('⚠️  오류 발생 파일:');
      errors.forEach(e => console.warn(`   - ${e.file}: ${e.error}`));
    }

    return {
      success: true,
      processed: processedCount,
      skipped: skippedCount,
      errors: errors.length,
      totalStrings: this.indexData.meta.totalStrings,
      duration
    };
  }

  /**
   * 문자열 추출
   */
  extractStrings(content, filePath) {
    const strings = [];
    const lines = content.split('\n');

    let currentFunc = null;
    let braceCount = 0;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // 함수명 추적
      const funcMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)/);
      if (funcMatch) {
        currentFunc = funcMatch[1];
        braceCount = 0;
      }

      if (currentFunc) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
      }

      // 문자열 리터럴 추출
      const stringMatches = line.matchAll(/(["'])(.+?)\1/g);
      for (const match of stringMatches) {
        const str = match[2];
        // 최소 2글자 이상의 문자열만 추출
        if (str && str.length >= 2) {
          strings.push({
            string: str,
            line: lineNum,
            func: currentFunc || 'global',
            type: 'literal',
            context: line.trim().substring(0, 100)
          });
        }
      }

      // 주석에서 문자열 추출
      const commentMatch = line.match(/(\/\/.*)|(\/\*.*?\*\/)/);
      if (commentMatch) {
        const comment = commentMatch[0];
        // 주석에서 특정 단어나 문구 추출
        const words = comment.split(/\s+/).filter(w => w.length >= 3);
        words.forEach(word => {
          strings.push({
            string: word.replace(/[\/\*]/g, ''),
            line: lineNum,
            func: currentFunc || 'global',
            type: 'comment',
            context: line.trim().substring(0, 100)
          });
        });
      }
    });

    return strings;
  }

  /**
   * 문자열 검색 (색인 사용)
   */
  search(searchTerm, options = {}) {
    const { caseSensitive = false, limit = 20 } = options;
    const key = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    const results = this.indexData.strings[key] || [];

    return results.slice(0, limit).map(r => ({
      file: r.file,
      line: r.line,
      functionName: r.func,
      type: r.type,
      content: r.context
    }));
  }

  /**
   * 모든 색인된 문자열 조회
   */
  listStrings(options = {}) {
    const { limit = 100, sortBy = 'count' } = options;
    const entries = Object.entries(this.indexData.strings);

    if (sortBy === 'count') {
      entries.sort((a, b) => b[1].length - a[1].length);
    } else if (sortBy === 'alphabetical') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.slice(0, limit).map(([str, locations]) => ({
      string: str,
      count: locations.length,
      files: [...new Set(locations.map(l => l.file))],
      functions: [...new Set(locations.map(l => l.func))]
    }));
  }

  /**
   * 색인 분석
   */
  analyze() {
    const strings = this.indexData.strings || {};
    const files = this.indexData.files || {};

    return {
      totalStrings: Object.keys(strings).length,
      uniqueStrings: Object.keys(strings).length,
      totalOccurrences: Object.values(strings).reduce((sum, arr) => sum + arr.length, 0),
      totalFiles: Object.keys(files).length,
      topStrings: this.listStrings({ limit: 10, sortBy: 'count' }),
      buildTime: this.indexData.meta?.buildTime,
      version: this.indexData.meta?.version
    };
  }

  /**
   * 파일 해시 계산 (변경 감지)
   */
  getFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (e) {
      return null;
    }
  }

  /**
   * PHP 파일 목록 조회
   */
  getPhpFiles() {
    const pattern = path.join(this.sourceDir, '**/*.php');
    return glob.sync(pattern, { ignore: '**/node_modules/**' });
  }

  /**
   * 색인 로드
   */
  loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('색인 로드 실패:', e.message);
    }

    return { strings: {}, files: {}, meta: { version: '1.0.0' } };
  }

  /**
   * 색인 저장
   */
  saveIndex() {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(this.indexData, null, 2));
      console.log(`💾 색인 저장됨: ${this.indexPath}`);
    } catch (e) {
      console.error('색인 저장 실패:', e.message);
    }
  }

  /**
   * 캐시 로드
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      // 캐시 없음, 무시
    }

    return {};
  }

  /**
   * 캐시 저장
   */
  saveCache(cache) {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.warn('캐시 저장 실패:', e.message);
    }
  }

  /**
   * 색인 초기화
   */
  clear() {
    this.indexData = { strings: {}, files: {}, meta: { version: '1.0.0' } };
    if (fs.existsSync(this.indexPath)) {
      fs.unlinkSync(this.indexPath);
    }
    if (fs.existsSync(this.cacheFile)) {
      fs.unlinkSync(this.cacheFile);
    }
    console.log('✅ 색인이 초기화되었습니다.');
  }
}

module.exports = StringIndexer;
