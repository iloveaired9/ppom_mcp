const express = require('express');
const router = express.Router();

const searchController = require('../controllers/searchController');
const graphController = require('../controllers/graphController');
const depsController = require('../controllers/depsController');
const statsController = require('../controllers/statsController');

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

// 헬스 체크
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'healthy' });
});

module.exports = router;
