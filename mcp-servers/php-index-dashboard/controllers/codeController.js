const fs = require('fs');
fs.appendFileSync('/tmp/codeController_load.log', `[${new Date().toISOString()}] codeController.js is being loaded\n`, 'utf8');

const PHPIndexService = require('../services/PHPIndexService');
fs.appendFileSync('/tmp/codeController_load.log', `[${new Date().toISOString()}] PHPIndexService loaded\n`, 'utf8');

const CacheManager = require('../services/CacheManager');
fs.appendFileSync('/tmp/codeController_load.log', `[${new Date().toISOString()}] CacheManager loaded\n`, 'utf8');

let cacheManager = null;
function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * GET /api/code/:symbol
 * 심볼의 PHP 코드 추출 및 반환
 */
async function getCode(req, res) {
  const fs = require('fs');
  const debugPath = 'C:/temp/code_debug.log';
  const logMsg = `[${new Date().toISOString()}] codeController.getCode called! params: ${JSON.stringify(req.params)}\n`;
  try {
    fs.appendFileSync(debugPath, logMsg, 'utf8');
  } catch (e) {
    console.log('[codeController] Debug log write failed:', e.message);
  }
  console.log(`[codeController] 진입: req.params =`, req.params);

  try {
    const { symbol } = req.params;
    // Debug: log the symbol with proper escape sequences
    const symbolDebug = JSON.stringify(symbol);
    const logDebug = `[${new Date().toISOString()}] Symbol (JSON): ${symbolDebug}, length: ${symbol.length}, hex: ${Buffer.from(symbol).toString('hex')}\n`;
    try {
      fs.appendFileSync(debugPath, logDebug, 'utf8');
    } catch (e) {
      console.log('[codeController] Debug log 2 write failed:', e.message);
    }
    console.log(`[codeController] 추출된 symbol (JSON): ${symbolDebug}`);
    console.log(`[codeController] 추출된 symbol (raw): ${symbol}`);
    console.log(`[codeController] symbol length: ${symbol.length}`);
    console.log(`[codeController] symbol bytes:`, Buffer.from(symbol).toString('hex'));

    if (!symbol) {
      return res.json({
        success: false,
        error: 'Symbol is required'
      });
    }

    const cache = getCacheManager();
    const cacheKey = { symbol };
    const startTime = Date.now();

    console.log(`[codeController] 코드 요청: ${symbol}`);

    // L1/L2 캐시 조회 (코드는 1시간 캐싱)
    const cachedResult = await cache.get('code', cacheKey);
    if (cachedResult) {
      const executionTime = Date.now() - startTime;
      console.log(`[codeController] 캐시 히트: ${cachedResult.source}`);
      return res.json({
        success: true,
        data: {
          ...cachedResult.data,
          executionTime,
          cached: cachedResult.source
        }
      });
    }

    // 백엔드에서 코드 추출
    console.log(`[codeController] 색인에서 코드 추출 중...`);
    const codeData = await PHPIndexService.getCode(symbol);

    // 캐시 저장 (1시간 = 3600초)
    await cache.set('code', cacheKey, codeData, 3600);
    console.log(`[codeController] 캐시에 저장됨 (1시간 TTL)`);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...codeData,
        executionTime,
        cached: false
      }
    });
  } catch (error) {
    console.error('[codeController] 에러:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve code',
      code: 'CODE_RETRIEVAL_FAILED'
    });
  }
}

module.exports = { getCode };
