#!/usr/bin/env node

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/describe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify({
  tableName: 'posts'
});

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (response.success && response.data.columns) {
        console.log('\n📋 Posts 테이블 구조\n');
        console.log('컬럼명            | 타입              | Nullable | Key');
        console.log('─'.repeat(60));
        response.data.columns.forEach((col) => {
          const nullable = col.nullable ? 'YES' : 'NO';
          const key = col.key !== 'NONE' ? col.key : '';
          console.log(`${col.name.padEnd(17)} | ${col.type.padEnd(17)} | ${nullable.padEnd(8)} | ${key}`);
        });
        console.log('\n테이블 정보:');
        console.log(`  레코드 수: ${response.data.info.rows}`);
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
