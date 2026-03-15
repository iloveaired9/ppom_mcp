#!/usr/bin/env node

const http = require('http');

const boards = ['freeboard', 'baseball', 'ppomppu', 'stock'];

async function analyzeBoard(board, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3008/analyze?board=${board}&page=${page}`;
    const hostname = 'localhost';
    const path = `/analyze?board=${board}&page=${page}`;

    const options = {
      hostname,
      port: 3008,
      path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ board, data, success: true });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🎯 뽐뿌 멀티보드 분석 시작\n');
  console.log('분석 대상: ' + boards.join(', ') + '\n');

  const results = [];

  for (const board of boards) {
    try {
      const start = Date.now();
      const { data } = await analyzeBoard(board);
      const time = Date.now() - start;

      results.push({ board, data, time });

      const analysis = data.analysis;
      const posts = analysis.topPosts.length;
      const peak = analysis.timeline.peakHours[0];
      const topCat = analysis.categories.topCategory;

      console.log(`✅ ${board.padEnd(12)} | ${time.toString().padStart(4)}ms | Posts: ${posts} | Peak: ${peak}시간 | Top: ${topCat}`);
    } catch (error) {
      console.log(`❌ ${board.padEnd(12)} | 오류: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 비교 분석
  if (results.length > 0) {
    console.log('📊 게시판별 비교\n');

    results.forEach(({ board, data }) => {
      const analysis = data.analysis;
      console.log(`📌 ${board.toUpperCase()}`);
      console.log(`   처리시간: ${data.metadata.processingTime}`);
      console.log(`   게시물: ${data.metadata.totalPosts}개`);
      console.log(`   피크시간: ${analysis.timeline.peakHours[0]}시 (${analysis.timeline.peakHourCount}개)`);
      console.log(`   상위키워드: ${analysis.keywords.keywords.slice(0, 3).map(k => k.text).join(', ')}`);
      console.log(`   상위카테고리: ${analysis.categories.topCategory} (${analysis.categories.categoryDistribution[analysis.categories.topCategory].count}개)`);
      console.log(`   활동도: ${analysis.participation.activityLevel}`);
      console.log();
    });
  }

  console.log('✨ 분석 완료!\n');
  console.log('💡 다음 단계:');
  console.log('   - 웹 대시보드: node serve-status.js');
  console.log('   - 메일 발송: node scripts/send-summary.js [board] 1');
  console.log('   - 특정 게시판: curl "http://localhost:3008/analyze?board=freeboard&page=1"\n');
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
