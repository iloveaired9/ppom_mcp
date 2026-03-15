#!/usr/bin/env node

/**
 * npm-scripts MCP Server
 *
 * 역할: package.json의 npm scripts를 MCP 도구로 노출
 * 사용: Claude가 npm run {script} 자동 실행 가능
 *
 * 예:
 *   - npm run test
 *   - npm run build
 *   - npm run format
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================
// 1. package.json 읽기
// ============================================

function readPackageJson() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const content = fs.readFileSync(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ package.json 읽기 실패:', error.message);
    return null;
  }
}

// ============================================
// 2. 사용 가능한 scripts 목록 반환
// ============================================

function getAvailableScripts() {
  const pkg = readPackageJson();
  if (!pkg || !pkg.scripts) {
    return {};
  }
  return pkg.scripts;
}

// ============================================
// 3. npm script 실행
// ============================================

function executeScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 실행 중: npm run ${scriptName}`);

    const process = spawn('npm', ['run', scriptName], {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 완료: npm run ${scriptName}`);
        resolve({
          success: true,
          script: scriptName,
          output: stdout,
          code: 0
        });
      } else {
        console.error(`❌ 실패: npm run ${scriptName}`);
        reject({
          success: false,
          script: scriptName,
          error: stderr || stdout,
          code: code
        });
      }
    });

    process.on('error', (error) => {
      reject({
        success: false,
        script: scriptName,
        error: error.message
      });
    });
  });
}

// ============================================
// 4. MCP 도구 정의
// ============================================

const tools = [
  {
    name: 'list_scripts',
    description: 'package.json에서 사용 가능한 npm scripts 목록 반환',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const scripts = getAvailableScripts();
      return {
        type: 'text',
        text: JSON.stringify(scripts, null, 2)
      };
    }
  },
  {
    name: 'run_script',
    description: 'npm script 실행',
    inputSchema: {
      type: 'object',
      properties: {
        scriptName: {
          type: 'string',
          description: 'package.json에 정의된 script 이름 (예: test, build, format)'
        }
      },
      required: ['scriptName']
    },
    handler: async (input) => {
      try {
        const result = await executeScript(input.scriptName);
        return {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        };
      } catch (error) {
        return {
          type: 'text',
          text: JSON.stringify(error, null, 2)
        };
      }
    }
  }
];

// ============================================
// 5. 간단한 HTTP 서버 (MCP 서버 대신)
// ============================================

const http = require('http');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Content-Type', 'application/json');

  try {
    if (url.pathname === '/tools') {
      // 사용 가능한 도구 목록 반환
      res.writeHead(200);
      res.end(JSON.stringify({
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        }))
      }, null, 2));

    } else if (url.pathname === '/list-scripts') {
      // scripts 목록 반환
      const scripts = getAvailableScripts();
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        scripts: scripts
      }, null, 2));

    } else if (url.pathname === '/run-script') {
      // script 실행
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'POST 요청 필요' }));
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { scriptName } = JSON.parse(body);
          const result = await executeScript(scriptName);
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
      });

    } else if (url.pathname === '/health') {
      // 헬스 체크
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        server: 'npm-scripts-mcp',
        timestamp: new Date().toISOString()
      }));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

// ============================================
// 6. 서버 시작
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ npm-scripts MCP 서버 시작: http://localhost:${PORT}`);
  console.log(`📝 사용 가능한 엔드포인트:`);
  console.log(`   - GET  /tools          : 도구 목록`);
  console.log(`   - GET  /list-scripts   : npm scripts 목록`);
  console.log(`   - POST /run-script     : script 실행`);
  console.log(`   - GET  /health         : 헬스 체크`);
  console.log(`\n📦 사용 가능한 scripts:`);

  const scripts = getAvailableScripts();
  Object.keys(scripts).forEach(key => {
    console.log(`   - npm run ${key}`);
  });
});

// 우아한 종료
process.on('SIGTERM', () => {
  console.log('\n⛔ 서버 종료');
  server.close();
});
