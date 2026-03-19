const express = require('express');
const router = express.Router();
const fs = require('fs');

// Test middleware to log all requests
router.use((req, res, next) => {
  const logMsg = `[${new Date().toISOString()}] Request: ${req.method} ${req.path} | URL: ${req.originalUrl}\n`;
  fs.appendFileSync('/tmp/router_requests.log', logMsg, 'utf8');
  console.log(`[Router] ${req.method} ${req.path}`);
  next();
});

const searchController = require('../controllers/searchController');
const graphController = require('../controllers/graphController');
const depsController = require('../controllers/depsController');
const statsController = require('../controllers/statsController');
const codeController = require('../controllers/codeController');
const queryController = require('../controllers/queryController');

// 검색 API
router.get('/search', searchController.search);

// 호출 그래프 API
router.get('/graph/callers', graphController.getCallers);
router.get('/graph/calls', graphController.getCalls);

// 의존성 분석 API
router.get('/deps/circular', depsController.getCircular);
router.get('/deps/depth', depsController.getDepth);
router.get('/deps/trace', depsController.getTrace);

// 통계 API
router.get('/stats', statsController.getStats);
router.post('/index/rebuild', statsController.rebuildIndex);

// 코드 뷰어 API - 테스트 엔드포인트
router.get('/code-test/:symbol', (req, res) => {
  const logMsg = `[${new Date().toISOString()}] /code-test called with symbol: ${req.params.symbol}\n`;
  fs.appendFileSync('/tmp/code_test_route.log', logMsg, 'utf8');
  console.log('[Routes] /code-test endpoint called');
  res.json({
    success: true,
    message: 'Code test route works!',
    symbol: req.params.symbol
  });
});

// 코드 뷰어 API
router.get('/code/:symbol', codeController.getCode);

// 쿼리 추출 API
router.get('/queries', async (req, res) => {
  try {
    await queryController.extractQueries(req, res);
  } catch (error) {
    console.error('Query extraction error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// PHP 파일 목록 조회 API
router.get('/files/php', async (req, res) => {
  try {
    await queryController.listPhpFiles(req, res);
  } catch (error) {
    console.error('File list error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// 헬스 체크
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy' });
});

module.exports = router;
