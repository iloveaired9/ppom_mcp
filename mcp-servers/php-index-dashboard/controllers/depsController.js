/**
 * 의존성 분석 컨트롤러
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
 * GET /api/deps/circular
 */
async function getCircular(req, res) {
  try {
    const cache = getCacheManager();
    const cacheKey = { type: 'circular' };
    const startTime = Date.now();

    // L1/L2 캐시 조회
    const cachedResult = await cache.get('deps:circular', cacheKey);
    if (cachedResult) {
      const cached = cachedResult.data;
      const executionTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: {
          ...cached,
          executionTime,
          cached: cachedResult.source
        }
      });
    }

    // PHP Index CLI 호출
    const circularData = await PHPIndexService.getCircular();

    const depData = {
      cycles: circularData.data ? circularData.data.split('\n').filter(line => line.trim()) : [],
      rawData: circularData.data,
      timestamp: new Date().toISOString()
    };

    // 캐시 저장 (24시간 TTL)
    await cache.set('deps:circular', cacheKey, depData, 24 * 60 * 60);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...depData,
        executionTime,
        cached: false
      }
    });
  } catch (error) {
    console.error('Get circular error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '순환 의존성 분석 중 오류가 발생했습니다',
      code: 'CIRCULAR_FAILED',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * GET /api/deps/depth?symbol=<symbol>&verbose=<verbose>
 */
async function getDepth(req, res) {
  try {
    const { symbol, verbose = false } = req.query;

    if (!symbol) {
      return res.json({
        success: false,
        error: 'Query parameter "symbol" is required'
      });
    }

    const startTime = Date.now();

    // PHP Index CLI 호출
    const depthData = await PHPIndexService.getDepth(symbol, { verbose: verbose === 'true' });

    const executionTime = Date.now() - startTime;

    // 깊이 파싱
    let maxDepth = 0;
    let depthMap = {};

    if (depthData && depthData.data) {
      const lines = depthData.data.split('\n');
      lines.forEach((line) => {
        if (line.includes('깊이')) {
          const match = line.match(/(\d+)/);
          if (match) {
            maxDepth = parseInt(match[0]);
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        symbol,
        maxDepth,
        rawData: depthData.data,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get depth error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/deps/trace?symbol=<symbol>&maxDepth=<maxDepth>
 */
async function getTrace(req, res) {
  try {
    const { symbol, maxDepth = 5 } = req.query;

    if (!symbol) {
      return res.json({
        success: false,
        error: 'Query parameter "symbol" is required'
      });
    }

    const startTime = Date.now();

    // PHP Index CLI 호출
    const traceData = await PHPIndexService.getCallTrace(symbol, {
      maxDepth: parseInt(maxDepth)
    });

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        symbol,
        maxDepth,
        rawData: traceData.data,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get trace error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getCircular,
  getDepth,
  getTrace
};
