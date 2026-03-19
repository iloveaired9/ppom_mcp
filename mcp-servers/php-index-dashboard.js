#!/usr/bin/env node

/**
 * PHP Index Generator 웹 대시보드
 * 포트: 3012
 * URL: http://localhost:3012
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const http = require('http');
const app = express();
const PORT = process.env.PORT || process.env.PHP_DASHBOARD_PORT || 3012;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public/php-index-dashboard')));

// API 라우트
const apiRouter = require('./php-index-dashboard/routes/index');
app.use('/api', apiRouter);

// 정적 파일 서빙 (index.html을 모든 경로에서 제공하려면 SPA 설정)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/php-index-dashboard/index.html'));
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     PHP Index Generator Dashboard 🚀                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📊 대시보드: http://localhost:${PORT}                      ║
║  🔍 API:      http://localhost:${PORT}/api                 ║
║                                                            ║
║  기능:                                                     ║
║  • /api/search        - 심볼 검색                          ║
║  • /api/graph/...     - 호출 그래프                        ║
║  • /api/deps/...      - 의존성 분석                        ║
║  • /api/stats         - 통계 정보                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
