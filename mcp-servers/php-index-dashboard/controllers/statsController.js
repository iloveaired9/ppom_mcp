/**
 * 통계 컨트롤러
 */

const PHPIndexService = require('../services/PHPIndexService');

/**
 * GET /api/stats
 */
function getStats(req, res) {
  try {
    const startTime = Date.now();

    // PHP Index CLI 호출
    let statsData;
    try {
      statsData = PHPIndexService.getStats();
    } catch (innerError) {
      console.error('[statsController] PHPIndexService.getStats() 에러:', innerError);
      statsData = { error: innerError.message };
    }

    const executionTime = Date.now() - startTime;

    const responseData = {
      ...statsData,
      executionTime,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/index/rebuild
 */
async function rebuildIndex(req, res) {
  try {
    const { force = false } = req.body;

    console.log(`Starting index rebuild (force: ${force})...`);

    const startTime = Date.now();

    // PHP Index CLI 호출
    const result = await PHPIndexService.rebuildIndex({ force });

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        message: '색인 재구성 완료',
        force,
        executionTime,
        output: result.data,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Rebuild index error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getStats,
  rebuildIndex
};
