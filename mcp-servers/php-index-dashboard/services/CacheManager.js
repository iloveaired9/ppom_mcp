/**
 * CacheManager.js
 * 3단계 캐싱 시스템:
 * L1: 메모리 캐시 (TTL 5분) - <1ms 응답
 * L2: 파일 캐시 (TTL 1일) - <50ms 응답
 * L3: 색인 직접 로드 (무제한) - 100-300ms 응답
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CacheManager {
  constructor(baseCacheDir = null) {
    this.memoryCache = new Map();

    // 캐시 디렉토리 설정
    this.cacheDir = baseCacheDir ||
      path.join(process.cwd(), '.claude/php-index-cache/dashboard');

    // 캐시 통계
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      deletes: 0
    };

    // 메모리 캐시 정리 타이머 (10분마다)
    this.cleanupInterval = setInterval(() => {
      this._cleanupMemoryCache();
    }, 10 * 60 * 1000);
  }

  /**
   * 캐시 키 생성
   * @param {string} command - 명령어 (search, callers, etc)
   * @param {object} params - 파라미터 객체
   * @returns {string} 캐시 키
   */
  generateKey(command, params) {
    const paramStr = JSON.stringify(params || {});
    return `${command}:${paramStr}`;
  }

  /**
   * 캐시 키 해싱 (파일명용)
   * @param {string} key - 캐시 키
   * @returns {string} MD5 해시
   */
  _hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * 캐시 조회 (L1 → L2 → Miss)
   * @param {string} command - 명령어
   * @param {object} params - 파라미터
   * @returns {Promise<{data, source}|null>} 캐시된 데이터 또는 null
   */
  async get(command, params) {
    const key = this.generateKey(command, params);

    try {
      // L1: 메모리 캐시 조회
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);

        // TTL 확인 (5분 = 300000ms)
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          this.stats.hits++;
          return { data: cached.data, source: 'memory', cached: true };
        } else {
          // TTL 만료된 메모리 캐시 제거
          this.memoryCache.delete(key);
        }
      }

      // L2: 파일 캐시 조회
      const filePath = path.join(this.cacheDir, `${this._hashKey(key)}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const cached = JSON.parse(fileContent);

          // TTL 확인 (1일 = 86400000ms)
          if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
            // L1에도 저장 (핫 캐시)
            this.memoryCache.set(key, {
              data: cached.data,
              timestamp: cached.timestamp,
              ttl: 5 * 60 * 1000
            });
            this.stats.hits++;
            return { data: cached.data, source: 'file', cached: true };
          } else {
            // TTL 만료된 파일 캐시 제거
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`파일 캐시 읽기 오류 (${filePath}):`, error.message);
          // 손상된 캐시 파일 제거
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }

      // L3: 캐시 미스
      this.stats.misses++;
      return null;

    } catch (error) {
      console.error('캐시 조회 오류:', error.message);
      return null;
    }
  }

  /**
   * 캐시 저장 (L1 + L2)
   * @param {string} command - 명령어
   * @param {object} params - 파라미터
   * @param {*} data - 저장할 데이터
   * @param {number} ttlSeconds - TTL (초) - 기본값: 300초(5분)
   */
  async set(command, params, data, ttlSeconds = 300) {
    const key = this.generateKey(command, params);
    const timestamp = Date.now();

    try {
      // L1: 메모리 캐시 저장 (5분 TTL 고정)
      this.memoryCache.set(key, {
        data,
        timestamp,
        ttl: 5 * 60 * 1000
      });

      // L2: 파일 캐시 저장 (1일 TTL 고정)
      const filePath = path.join(this.cacheDir, `${this._hashKey(key)}.json`);
      const fileContent = JSON.stringify(
        {
          data,
          timestamp,
          ttl: 24 * 60 * 60 * 1000,
          command,
          params
        },
        null,
        2
      );

      // 디렉토리 생성 (필요시)
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      // 파일 저장
      fs.writeFileSync(filePath, fileContent, 'utf8');

      this.stats.writes++;

    } catch (error) {
      console.error('캐시 저장 오류:', error.message);
      // 캐시 저장 실패해도 메모리 캐시는 유지 (성능 저하 방지)
    }
  }

  /**
   * 캐시 무효화 (패턴 기반 또는 전체)
   * @param {string} pattern - 무효화 패턴 (예: "search", "callers:getData")
   */
  invalidate(pattern = null) {
    try {
      if (pattern) {
        // 패턴 일치하는 메모리 캐시 제거
        let deletedCount = 0;
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern)) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }

        // 패턴 일치하는 파일 캐시 제거 (간단한 구현)
        if (fs.existsSync(this.cacheDir)) {
          const files = fs.readdirSync(this.cacheDir);
          for (const file of files) {
            const filePath = path.join(this.cacheDir, file);
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const cached = JSON.parse(content);
              const key = this.generateKey(cached.command, cached.params);

              if (key.includes(pattern)) {
                fs.unlinkSync(filePath);
                deletedCount++;
              }
            } catch (e) {
              // 손상된 파일은 무시
            }
          }
        }

        this.stats.deletes += deletedCount;
        console.log(`[캐시 무효화] 패턴 '${pattern}' - ${deletedCount}개 삭제됨`);

      } else {
        // 전체 캐시 제거
        const memorySize = this.memoryCache.size;
        this.memoryCache.clear();

        if (fs.existsSync(this.cacheDir)) {
          fs.rmSync(this.cacheDir, { recursive: true, force: true });
        }

        this.stats.deletes += memorySize;
        console.log('[캐시 무효화] 전체 캐시 삭제됨');
      }

    } catch (error) {
      console.error('캐시 무효화 오류:', error.message);
    }
  }

  /**
   * 메모리 캐시 정리 (만료된 항목 제거)
   * @private
   */
  _cleanupMemoryCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp > 5 * 60 * 1000) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[캐시 정리] 만료된 메모리 캐시 ${cleanedCount}개 제거됨`);
    }
  }

  /**
   * 캐시 통계 조회
   * @returns {object} 통계 정보
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      cacheDir: this.cacheDir
    };
  }

  /**
   * 캐시 초기화 (통계 리셋)
   */
  resetStats() {
    this.stats = { hits: 0, misses: 0, writes: 0, deletes: 0 };
  }

  /**
   * 정리 타이머 중지
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = CacheManager;
