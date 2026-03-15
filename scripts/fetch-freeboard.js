#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const options = {
  hostname: 'localhost',
  port: 3008,
  path: '/freeboard?page=1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const data = JSON.parse(body);

      if (data.success && data.data && data.data.posts) {
        const posts = data.data.posts;
        console.log(`\n✅ 데이터 수집 완료: ${posts.length}개 게시물\n`);

        // CSV 생성
        const date = new Date().toISOString().split('T')[0];
        const csvHeader = 'no,title,author,date,recommend,views,url';
        const csvRows = posts.map(p =>
          `${p.no},"${p.title.replace(/"/g, '""')}",${p.author},${p.date},${p.recommend},${p.views},${p.url}`
        );
        const csv = [csvHeader, ...csvRows].join('\n');

        const fileName = `freeboard-${date}-page1.csv`;
        fs.writeFileSync(fileName, csv);
        console.log(`📄 저장됨: ${fileName}`);
        console.log(`\n📝 상위 5개 게시물:\n`);
        posts.slice(0, 5).forEach((p, i) => {
          const title = p.title.substring(0, 60) + (p.title.length > 60 ? '...' : '');
          console.log(`  ${i + 1}. ${title}`);
          console.log(`     추천: ${p.recommend} | 조회: ${p.views}`);
        });

        console.log(`\n✨ 자동 분석 진행...`);
        console.log(`\n💡 다음 단계:`);
        console.log(`   node scripts/analyze-freeboard.js`);
        console.log(`   또는`);
        console.log(`   /analyze-freeboard ${fileName}\n`);
      } else {
        console.log('❌ 오류:', data.error || '알 수 없음');
      }
    } catch (error) {
      console.error('❌ 파싱 오류:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 연결 오류:', error.message);
  console.log('\n💡 해결 방법:');
  console.log('   1. ppomppu-crawler 서버 확인: npm start');
  console.log('   2. 포트 3008 확인: netstat -an | grep 3008');
});

req.end();
