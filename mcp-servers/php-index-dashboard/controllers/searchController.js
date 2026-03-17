/**
 * 검색 컨트롤러
 * 캐싱 지원 (CacheManager L1/L2)
 */

const PHPIndexService = require('../services/PHPIndexService');
const CacheManager = require('../services/CacheManager');

// 캐시 매니저 인스턴스 (싱글톤)
let cacheManager = null;

function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * CLI 검색 출력을 JSON으로 파싱
 * 형식:
 * 🔍 검색: "Symbol"
 * 📌 결과 (N개 발견):
 * 1. SymbolName (type)
 *    📄 파일경로:라인번호
 *    📏 점수: 90%
 */
function parseSearchOutput(output) {
  const results = [];
  if (!output || typeof output !== 'string') return results;

  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 결과 항목 찾기: "1. SymbolName (type)"
    const itemMatch = line.match(/^\d+\.\s+([^\s]+)\s+\(([^)]+)\)/);
    if (itemMatch) {
      const [, name, type] = itemMatch;

      // 파일과 라인 번호 찾기
      let file = '';
      let lineNum = '';

      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes('📄')) {
          // 📄 다음의 모든 내용 추출
          const startIdx = nextLine.indexOf('📄') + 2;
          let content = nextLine.substring(startIdx).trim();

          // 점수 정보 제거
          content = content.split('📏')[0].trim();

          // 마지막의 :숫자 패턴 찾기
          const lastColonIdx = content.lastIndexOf(':');
          if (lastColonIdx > 0) {
            const afterColon = content.substring(lastColonIdx + 1).trim();
            if (/^\d+$/.test(afterColon)) {
              file = content.substring(0, lastColonIdx).trim();
              lineNum = afterColon;
            } else {
              file = content;
            }
          } else {
            file = content;
          }
          break;
        }
      }

      if (file) {
        results.push({
          name,
          type,
          file: file,
          line: lineNum ? parseInt(lineNum) : undefined
        });
      }
    }
  }

  return results;
}

/**
 * GET /api/search?q=<query>&type=<type>&limit=<limit>
 */
async function search(req, res) {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const cache = getCacheManager();
    const cacheKey = { query: q, type, limit };
    const startTime = Date.now();

    // L1/L2 캐시 조회
    const cachedResult = await cache.get('search', cacheKey);
    if (cachedResult) {
      const cached = cachedResult.data;
      const executionTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: {
          query: q,
          type,
          results: cached.results || [],
          count: (cached.results || []).length,
          executionTime,
          timestamp: new Date().toISOString(),
          cached: cachedResult.source  // 캐시 출처 표시 (memory/file)
        }
      });
    }

    // PHP Index CLI 호출
    const searchResult = PHPIndexService.search(q, {
      type: type !== 'all' ? type : undefined,
      exact: false
    });

    // 결과 파싱 (텍스트 → JSON)
    let parsedResults = [];
    if (searchResult && searchResult.results) {
      if (typeof searchResult.results === 'string') {
        // CLI 텍스트 출력 파싱
        parsedResults = parseSearchOutput(searchResult.results);
        console.log('[searchController] 파싱 결과:', parsedResults.length, 'items');
      } else if (Array.isArray(searchResult.results)) {
        parsedResults = searchResult.results;
        console.log('[searchController] 배열 결과:', parsedResults.length, 'items');
      }
    } else {
      console.log('[searchController] searchResult 없음:', searchResult);
    }

    // 캐시 저장 (파싱된 결과) - 배열만 저장
    if (parsedResults.length > 0 || !searchResult.results) {
      await cache.set('search', cacheKey, { results: parsedResults });
    }

    const executionTime = Date.now() - startTime;

    // 응답 포맷
    res.json({
      success: true,
      data: {
        query: q,
        type,
        results: parsedResults,
        count: parsedResults.length,
        executionTime,
        timestamp: new Date().toISOString(),
        cached: false  // 새로 생성된 결과
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '검색 중 오류가 발생했습니다',
      code: 'SEARCH_FAILED',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  search
};
