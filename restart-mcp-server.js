const { spawn, exec } = require('child_process');
const http = require('http');

console.log('🔄 MCP 서버 재시작\n');

// Step 1: 기존 프로세스 확인
console.log('1️⃣  기존 프로세스 확인 중...');
exec('tasklist /FI "IMAGENAME eq node.exe" /FO LIST', (err, stdout) => {
    const lines = stdout.split('\n').filter(line => line.includes('PID'));
    if (lines.length > 0) {
        console.log(`   발견된 Node.js 프로세스: ${lines.length}개`);

        // 프로세스 종료 시도
        lines.forEach((line, idx) => {
            const pid = line.match(/\d+/);
            if (pid && idx < 5) {  // 너무 많으면 처음 5개만
                exec(`taskkill /PID ${pid[0]} /F 2>nul`, (err) => {
                    if (!err) console.log(`   ✓ PID ${pid[0]} 종료`);
                });
            }
        });
    }

    setTimeout(startServer, 2000);
});

function startServer() {
    console.log('\n2️⃣  새로운 MCP 서버 시작 중...');

    // 새로운 위치에서 서버 시작
    const proc = spawn('node', ['mcp-servers/ppomppu-crawler/ppomppu-crawler.js'], {
        detached: false,
        stdio: 'pipe'
    });

    // 서버 로그 출력
    proc.stdout?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`   [ppomppu] ${msg}`);
    });

    proc.stderr?.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('Debug')) console.log(`   [ppomppu] ${msg}`);
    });

    // 서버 시작 대기
    setTimeout(() => {
        console.log('\n3️⃣  서버 헬스 체크...');
        checkHealth();
    }, 3000);
}

function checkHealth() {
    const req = http.get('http://localhost:3008/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('✅ 서버 정상 작동');
                console.log(`   상태: ${json.status}`);
                console.log(`   서버: ${json.server}`);
                console.log(`   버전: ${json.version}`);

                testBaseball();
            } catch (e) {
                console.log('❌ 응답 파싱 오류');
            }
        });
    }).on('error', (err) => {
        console.log('❌ 연결 실패, 재시도 중...');
        setTimeout(checkHealth, 2000);
    });

    req.setTimeout(3000);
}

function testBaseball() {
    console.log('\n4️⃣  Baseball 게시판 테스트...');

    const req = http.get('http://localhost:3008/baseball?page=1', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('✅ 데이터 조회 성공');
                console.log(`   게시물 수: ${json.data.postCount}개`);

                const first = json.data.posts[0];
                if (first.title.includes('[일반]') && first.title.length > 10) {
                    console.log(`   제목 파싱: ✅ 정상`);
                    console.log(`   예: "${first.title.substring(0, 70)}..."\n`);
                } else {
                    console.log(`   제목 파싱: ⚠️  확인 필요\n`);
                }

                console.log('═'.repeat(70));
                console.log('🎉 MCP 서버 재시작 완료!\n');
                console.log('사용 가능한 엔드포인트:');
                console.log('  • GET  http://localhost:3008/freeboard?page=1');
                console.log('  • GET  http://localhost:3008/ppomppu?page=1');
                console.log('  • GET  http://localhost:3008/baseball?page=1');
                console.log('  • GET  http://localhost:3008/stock?page=1');
                console.log('  • GET  http://localhost:3008/analyze?board=baseball&page=1\n');

            } catch (e) {
                console.log('❌ 테스트 오류:', e.message);
            }
        });
    }).on('error', (err) => {
        console.log('❌ 테스트 연결 실패:', err.message);
    });

    req.setTimeout(5000);
}
