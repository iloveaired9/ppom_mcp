#!/usr/bin/env node

/**
 * IndexSearcher.js
 * 색인 로드 및 고속 검색 엔진
 */

const fs = require('fs');
const path = require('path');

class IndexSearcher {
  constructor(indexPath = 'plugins/php-index-generator/output/index.json') {
    this.indexPath = indexPath;
    this.index = null;
  }

  /**
   * 색인 파일을 메모리로 로드합니다.
   * @returns {Promise<void>}
   */
  async loadIndex() {
    try {
      if (!fs.existsSync(this.indexPath)) {
        console.warn(`[WARN] 색인 파일 없음: ${this.indexPath}`);
        this.index = { symbols: {}, fileMap: {}, metadata: {} };
        return;
      }

      const content = fs.readFileSync(this.indexPath, 'utf8');
      this.index = JSON.parse(content);
    } catch (error) {
      console.error(`[ERROR] 색인 로드 실패: ${error.message}`);
      this.index = { symbols: {}, fileMap: {}, metadata: {} };
    }
  }

  /**
   * 심볼을 검색합니다.
   * @param {string} query - 검색 쿼리
   * @param {object} options - 옵션 { type, exact, limit, namespace, score }
   * @returns {array} 검색 결과
   */
  search(query, options = {}) {
    if (!this.index) {
      console.error('[ERROR] 색인이 로드되지 않았습니다.');
      return [];
    }

    const {
      type = null,
      exact = false,
      limit = 10,
      namespace = null,
      minScore = 0
    } = options;

    const results = [];

    for (const [fqcn, symbol] of Object.entries(this.index.symbols)) {
      // 타입 필터
      if (type && symbol.type !== type) {
        continue;
      }

      // 네임스페이스 필터
      if (namespace && symbol.namespace !== namespace) {
        continue;
      }

      // 점수 계산
      let score = this.calculateScore(fqcn, symbol, query, exact);

      if (score < minScore) {
        continue;
      }

      results.push({
        name: fqcn,
        type: symbol.type,
        file: symbol.file,
        line: symbol.line,
        namespace: symbol.namespace || '',
        score
      });
    }

    // 점수 내림차순 정렬
    results.sort((a, b) => b.score - a.score);

    // 결과 제한
    return results.slice(0, limit);
  }

  /**
   * 일치 점수를 계산합니다.
   * @param {string} fqcn - 전체 정규화된 이름
   * @param {object} symbol - 심볼 객체
   * @param {string} query - 검색 쿼리
   * @param {boolean} exact - 정확 일치 여부
   * @returns {number} 점수 (0-1)
   */
  calculateScore(fqcn, symbol, query, exact) {
    if (exact) {
      return fqcn === query ? 1.0 : 0;
    }

    const symbolName = symbol.name;
    const queryLower = query.toLowerCase();
    const nameLower = symbolName.toLowerCase();
    const fqcnLower = fqcn.toLowerCase();

    // 1. 정확 일치
    if (fqcnLower === queryLower) {
      return 1.0;
    }

    // 2. 부분 일치 (마지막 부분)
    if (nameLower === queryLower) {
      return 0.9;
    }

    // 3. 시작 부분 일치
    if (nameLower.startsWith(queryLower)) {
      return 0.8;
    }

    // 4. 포함 일치
    if (nameLower.includes(queryLower)) {
      return 0.7;
    }

    // 5. FQCN 부분 일치
    if (fqcnLower.includes(queryLower)) {
      return 0.6;
    }

    // 6. 퍼지 매칭 (Levenshtein 거리)
    const distance = this.levenshteinDistance(nameLower, queryLower);
    const maxLen = Math.max(nameLower.length, queryLower.length);
    const similarity = 1 - (distance / maxLen);

    return similarity > 0.5 ? similarity * 0.5 : 0;
  }

  /**
   * Levenshtein 거리를 계산합니다.
   * @param {string} s1 - 첫 번째 문자열
   * @param {string} s2 - 두 번째 문자열
   * @returns {number} Levenshtein 거리
   */
  levenshteinDistance(s1, s2) {
    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }

    return costs[s2.length];
  }

  /**
   * 타입별로 검색합니다.
   * @param {string} type - 심볼 타입 (class, function, method, etc)
   * @param {number} limit - 결과 개수 제한
   * @returns {array} 검색 결과
   */
  searchByType(type, limit = 100) {
    if (!this.index) {
      return [];
    }

    const results = [];

    for (const [fqcn, symbol] of Object.entries(this.index.symbols)) {
      if (symbol.type === type) {
        results.push({
          name: fqcn,
          type: symbol.type,
          file: symbol.file,
          line: symbol.line,
          namespace: symbol.namespace || ''
        });
      }

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  /**
   * 네임스페이스 내에서 검색합니다.
   * @param {string} namespace - 네임스페이스
   * @param {number} limit - 결과 개수 제한
   * @returns {array} 검색 결과
   */
  searchInNamespace(namespace, limit = 100) {
    if (!this.index) {
      return [];
    }

    const results = [];

    for (const [fqcn, symbol] of Object.entries(this.index.symbols)) {
      if (symbol.namespace === namespace) {
        results.push({
          name: fqcn,
          type: symbol.type,
          file: symbol.file,
          line: symbol.line,
          namespace: symbol.namespace || ''
        });
      }

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  /**
   * 심볼의 상세 정보를 반환합니다.
   * @param {string} fullName - FQCN
   * @returns {object} 심볼 정보
   */
  getSymbolInfo(fullName) {
    if (!this.index || !this.index.symbols[fullName]) {
      return null;
    }

    return this.index.symbols[fullName];
  }

  /**
   * 심볼의 정의 위치를 찾습니다.
   * @param {string} symbol - 심볼명 또는 FQCN
   * @returns {object} 정의 위치 { file, line, column }
   */
  findDefinition(symbol) {
    if (!this.index) {
      return null;
    }

    // FQCN으로 직접 검색
    if (this.index.symbols[symbol]) {
      const sym = this.index.symbols[symbol];
      return {
        symbol,
        type: sym.type,
        file: sym.file,
        line: sym.line,
        column: 1,
        namespace: sym.namespace || ''
      };
    }

    // 부분 검색
    const results = this.search(symbol, { limit: 1 });
    if (results.length > 0) {
      const result = results[0];
      const sym = this.index.symbols[result.name];
      return {
        symbol: result.name,
        type: sym.type,
        file: sym.file,
        line: sym.line,
        column: 1,
        namespace: sym.namespace || ''
      };
    }

    return null;
  }

  /**
   * 심볼이 참조되는 모든 위치를 찾습니다 (include/require 기반).
   * @param {string} symbol - 심볼명
   * @returns {array} 참조 위치들
   */
  findReferences(symbol) {
    if (!this.index || !this.index.fileMap) {
      return [];
    }

    const references = [];

    // 심볼이 포함된 파일 찾기
    for (const [filePath, fileInfo] of Object.entries(this.index.fileMap)) {
      if (fileInfo.symbols && fileInfo.symbols.includes(symbol)) {
        // include/require하는 파일 찾기
        for (const [otherFile, otherInfo] of Object.entries(this.index.fileMap)) {
          if (otherInfo.includes && otherInfo.includes.some(inc => inc.includes(path.basename(filePath)))) {
            references.push({
              file: otherFile,
              line: otherInfo.line || 1,
              type: 'include'
            });
          }
        }
      }
    }

    return references;
  }

  /**
   * 색인 통계를 반환합니다.
   * @returns {object} 통계
   */
  getStats() {
    if (!this.index) {
      return { totalFiles: 0, totalSymbols: 0 };
    }

    return {
      totalFiles: Object.keys(this.index.fileMap || {}).length,
      totalSymbols: Object.keys(this.index.symbols || {}).length,
      metadata: this.index.metadata || {}
    };
  }
}

module.exports = IndexSearcher;
