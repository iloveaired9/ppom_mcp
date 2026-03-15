#!/usr/bin/env node

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify({
  tableName: 'posts',
  limit: 10,
  offset: 0
});

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (response.success && response.data.records) {
        console.log('\n📝 Posts 제목 (10개)\n');
        response.data.records.forEach((post, i) => {
          console.log(`${i + 1}. ${post.subject}`);
        });
        console.log(`\n총 ${response.data.total}개 중 ${response.data.count}개 표시\n`);
      } else {
        console.log('❌ 오류:', response.error || '알 수 없는 오류');
      }
    } catch (error) {
      console.error('❌ JSON 파싱 오류:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 요청 오류:', error.message);
});

req.write(data);
req.end();
