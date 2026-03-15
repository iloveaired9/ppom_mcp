#!/usr/bin/env node

const http = require('http');

function fetchBoard(board = 'freeboard', page = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3008,
      path: `/analyze?board=${board}&page=${page}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
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
  const board = process.argv[2] || 'freeboard';
  const page = parseInt(process.argv[3]) || 1;

  try {
    console.log(`📋 뽐뿌 ${board.toUpperCase()} 페이지 ${page}\n`);

    const data = await fetchBoard(board, page);
    const posts = data.analysis.topPosts;

    if (!posts || posts.length === 0) {
      console.log('게시물이 없습니다.');
      return;
    }

    // 마크다운 형식으로 출력
    posts.forEach((post, i) => {
      console.log(`${i + 1}. **${post.title}**`);
      console.log(`   • 작성자: ${post.author}`);
      console.log(`   • 조회: ${post.views} | 추천: ${post.likes || 0}`);
      console.log(`   • ${post.url}\n`);
    });

    // 통계
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 통계`);
    console.log(`   • 총 게시물: ${data.metadata.totalPosts}개`);
    console.log(`   • 평균 조회: ${Math.round(posts.reduce((a, p) => a + p.views, 0) / posts.length)}회`);
    console.log(`   • 최고 조회: ${Math.max(...posts.map(p => p.views))}회`);
    console.log(`   • 처리시간: ${data.metadata.processingTime}\n`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();
