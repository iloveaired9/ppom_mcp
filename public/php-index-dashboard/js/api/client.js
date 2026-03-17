/**
 * API 클라이언트
 */

class APIClient {
  constructor() {
    this.baseURL = '/api';
  }

  async fetch(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // 검색
  search(query, type = 'all') {
    return this.fetch(`/search?q=${encodeURIComponent(query)}&type=${type}`);
  }

  // 호출 그래프
  getCallers(symbol, maxDepth = 3) {
    return this.fetch(`/graph/callers?symbol=${encodeURIComponent(symbol)}&maxDepth=${maxDepth}`);
  }

  getCalls(symbol, maxDepth = 3) {
    return this.fetch(`/graph/calls?symbol=${encodeURIComponent(symbol)}&maxDepth=${maxDepth}`);
  }

  // 의존성 분석
  getCircular() {
    return this.fetch('/deps/circular');
  }

  getDepth(symbol, verbose = false) {
    return this.fetch(`/deps/depth?symbol=${encodeURIComponent(symbol)}&verbose=${verbose}`);
  }

  getTrace(symbol, maxDepth = 5) {
    return this.fetch(`/deps/trace?symbol=${encodeURIComponent(symbol)}&maxDepth=${maxDepth}`);
  }

  // 통계
  getStats() {
    return this.fetch('/stats');
  }

  rebuildIndex(force = false) {
    return this.fetch('/index/rebuild', {
      method: 'POST',
      body: { force }
    });
  }
}

const api = window.api = new APIClient();
