#!/usr/bin/env node

/**
 * IndexCache.js
 * 파일 메타데이터 추적, 변경 감지, 캐시 저장/로드
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IndexCache {
  constructor(cacheDir = '.claude/php-index-cache') {
    this.cacheDir = cacheDir;
    this.cachePath = path.join(this.cacheDir, 'index-cache.json');
    this.data = { files: {}, version: '1.0.0' };
  }

  /**
   * 기존 캐시 데이터를 로드합니다.
   * @returns {Promise<object>} 캐시 데이터
   */
  async loadCache() {
    try {
      // 캐시 디렉토리 생성 (없는 경우)
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // 캐시 파일 존재 확인
      if (fs.existsSync(this.cachePath)) {
        const content = fs.readFileSync(this.cachePath, 'utf8');
        this.data = JSON.parse(content);
        return this.data;
      }

      // 캐시 파일 없음 (첫 실행)
      return { files: {}, version: '1.0.0' };
    } catch (error) {
      console.warn(`[WARN] 캐시 로드 실패: ${error.message}`);
      return { files: {}, version: '1.0.0' };
    }
  }

  /**
   * 캐시를 파일에 저장합니다.
   * @param {object} cacheData - 저장할 캐시 데이터
   * @returns {Promise<void>}
   */
  async saveCache(cacheData) {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      const content = JSON.stringify(cacheData, null, 2);
      fs.writeFileSync(this.cachePath, content, 'utf8');
      this.data = cacheData;
    } catch (error) {
      console.warn(`[WARN] 캐시 저장 실패: ${error.message}`);
    }
  }

  /**
   * 파일의 변경 여부를 확인합니다.
   * @param {string} filePath - 파일 경로
   * @returns {Promise<boolean>} 변경 여부
   */
  async hasChanged(filePath) {
    try {
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // 파일 stats 조회
      const stats = fs.statSync(filePath);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const currentHash = this.calculateHash(fileContent);

      // 캐시에 파일 없으면 변경됨
      if (!this.data.files[filePath]) {
        return true;
      }

      const cachedFile = this.data.files[filePath];

      // 해시 비교
      if (cachedFile.hash !== currentHash) {
        return true;
      }

      // mtime 비교
      if (cachedFile.mtime !== stats.mtime.getTime()) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[WARN] 파일 변경 감지 실패 (${filePath}): ${error.message}`);
      return true; // 오류 시 변경된 것으로 간주
    }
  }

  /**
   * 파일의 SHA256 해시를 계산합니다.
   * @param {string} content - 파일 내용
   * @returns {string} SHA256 해시
   */
  calculateHash(content) {
    return crypto
      .createHash('sha256')
      .update(content, 'utf8')
      .digest('hex');
  }

  /**
   * 파일 해시를 캐시에 업데이트합니다.
   * @param {string} filePath - 파일 경로
   * @param {string} hash - SHA256 해시
   * @param {array} symbols - 파일에 포함된 심볼 목록
   * @returns {Promise<void>}
   */
  async updateHash(filePath, hash, symbols = []) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        this.data.files[filePath] = {
          hash,
          mtime: stats.mtime.getTime(),
          symbols
        };
      }
    } catch (error) {
      console.warn(`[WARN] 해시 업데이트 실패 (${filePath}): ${error.message}`);
    }
  }

  /**
   * 이전에 저장된 심볼 목록을 반환합니다.
   * @param {string} filePath - 파일 경로
   * @returns {array} 심볼 목록
   */
  getPreviousSymbols(filePath) {
    const cached = this.data.files[filePath];
    return cached ? cached.symbols || [] : [];
  }

  /**
   * 특정 파일의 캐시 항목을 삭제합니다.
   * @param {string} filePath - 파일 경로
   * @returns {Promise<void>}
   */
  async clearFile(filePath) {
    try {
      if (this.data.files[filePath]) {
        delete this.data.files[filePath];
      }
    } catch (error) {
      console.warn(`[WARN] 파일 캐시 삭제 실패 (${filePath}): ${error.message}`);
    }
  }

  /**
   * 전체 캐시를 초기화합니다.
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      this.data = { files: {}, version: '1.0.0' };
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
      }
    } catch (error) {
      console.warn(`[WARN] 전체 캐시 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 캐시 통계를 반환합니다.
   * @returns {object} 캐시 통계
   */
  getStats() {
    const fileCount = Object.keys(this.data.files).length;
    const symbolCount = Object.values(this.data.files).reduce((acc, f) => acc + (f.symbols || []).length, 0);
    return { fileCount, symbolCount };
  }
}

module.exports = IndexCache;
