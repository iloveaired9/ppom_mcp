#!/usr/bin/env node

/**
 * myawsdb MCP Server (표준화 버전)
 *
 * AWS RDS MySQL 데이터베이스 관리 MCP 서버
 * ppomppu-crawler 패턴을 따른 완전한 MCP 표준 준수
 *
 * 포트: 3004 (MYAWSDB_PORT 환경변수로 변경 가능)
 */

const http = require('http');
const mysql = require('mysql2/promise');

const PORT = process.env.MYAWSDB_PORT || 3004;

// ============================================
// DATABASE CONFIG
// ============================================

const DB_CONFIG = {
  host: '54.180.52.120',
  port: 3306,
  user: 'aired',
  password: 'aired',  // Database password
  database: 'aired',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  authPlugins: {
    mysql_native_password: () => () => 'aired'
  }
};

let connectionPool = null;

async function initializePool() {
  try {
    connectionPool = await mysql.createPool(DB_CONFIG);
    console.log(`✅ Database pool initialized`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database pool:', error.message);
    return false;
  }
}

// ============================================
// MCP TOOLS (Standard Format)
// ============================================

const tools = [
  {
    name: 'execute_query',
    description: 'SQL 쿼리 직접 실행',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL 쿼리'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_tables',
    description: '데이터베이스의 모든 테이블 목록 조회',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'describe_table',
    description: '테이블의 구조 및 정보 조회',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: '테이블명'
        }
      },
      required: ['tableName']
    }
  },
  {
    name: 'query_records',
    description: '테이블에서 레코드 조회',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: '테이블명'
        },
        where: {
          type: 'string',
          description: 'WHERE 조건 (선택사항)'
        },
        limit: {
          type: 'number',
          description: '조회 제한 수 (기본값: 100)'
        },
        offset: {
          type: 'number',
          description: '조회 시작 위치 (기본값: 0)'
        }
      },
      required: ['tableName']
    }
  },
  {
    name: 'insert_record',
    description: '테이블에 새 레코드 삽입',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: '테이블명'
        },
        values: {
          type: 'object',
          description: '삽입할 데이터 (키-값 쌍)'
        }
      },
      required: ['tableName', 'values']
    }
  },
  {
    name: 'update_record',
    description: '테이블의 레코드 업데이트',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: '테이블명'
        },
        values: {
          type: 'object',
          description: '업데이트할 데이터 (키-값 쌍)'
        },
        where: {
          type: 'string',
          description: 'WHERE 조건'
        }
      },
      required: ['tableName', 'values', 'where']
    }
  },
  {
    name: 'delete_record',
    description: '테이블에서 레코드 삭제',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: '테이블명'
        },
        where: {
          type: 'string',
          description: 'WHERE 조건'
        }
      },
      required: ['tableName', 'where']
    }
  }
];

// ============================================
// HTTP SERVER
// ============================================

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  // CORS Headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // /health
    if (urlObj.pathname === '/health') {
      const health = {
        status: 'ok',
        server: 'myawsdb-mcp',
        version: '1.0.0',
        database: {
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          database: DB_CONFIG.database
        },
        timestamp: new Date().toISOString()
      };
      res.writeHead(200);
      res.end(JSON.stringify(health, null, 2));
      return;
    }

    // /tools - MCP Standard Format with inputSchema
    if (urlObj.pathname === '/tools') {
      res.writeHead(200);
      res.end(JSON.stringify({ tools }, null, 2));
      return;
    }

    // /tables
    if (urlObj.pathname === '/tables') {
      if (!connectionPool) {
        res.writeHead(503);
        res.end(JSON.stringify({ error: 'Database not ready' }));
        return;
      }

      const connection = await connectionPool.getConnection();
      try {
        const [rows] = await connection.query(
          `SELECT TABLE_NAME, TABLE_TYPE, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
          [DB_CONFIG.database]
        );
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          tables: rows.map(r => r.TABLE_NAME),
          count: rows.length
        }, null, 2));
      } finally {
        await connection.release();
      }
      return;
    }

    // /describe (POST)
    if (urlObj.pathname === '/describe') {
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'POST required' }));
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { tableName } = JSON.parse(body);
          if (!tableName) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'tableName required' }));
            return;
          }

          if (!connectionPool) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: 'Database not ready' }));
            return;
          }

          const connection = await connectionPool.getConnection();
          try {
            const [columns] = await connection.query(
              `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
              [DB_CONFIG.database, tableName]
            );
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              tableName,
              columns: columns.map(c => ({
                name: c.COLUMN_NAME,
                type: c.DATA_TYPE,
                nullable: c.IS_NULLABLE === 'YES',
                key: c.COLUMN_KEY || null
              }))
            }, null, 2));
          } finally {
            await connection.release();
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // /query (POST)
    if (urlObj.pathname === '/query') {
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'POST required' }));
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { tableName, where, limit = 100, offset = 0 } = JSON.parse(body);
          if (!tableName) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'tableName required' }));
            return;
          }

          if (!connectionPool) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: 'Database not ready' }));
            return;
          }

          const connection = await connectionPool.getConnection();
          try {
            let query = `SELECT * FROM \`${tableName}\``;
            const params = [];

            if (where) {
              query += ` WHERE ${where}`;
            }

            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const [rows] = await connection.query(query, params);
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              tableName,
              records: rows,
              count: rows.length
            }, null, 2));
          } finally {
            await connection.release();
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // /execute (POST) - Direct SQL
    if (urlObj.pathname === '/execute') {
      if (req.method !== 'POST') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'POST required' }));
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { sql } = JSON.parse(body);
          if (!sql) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'sql required' }));
            return;
          }

          if (!connectionPool) {
            res.writeHead(503);
            res.end(JSON.stringify({ error: 'Database not ready' }));
            return;
          }

          const connection = await connectionPool.getConnection();
          try {
            const [result] = await connection.query(sql);
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              result
            }, null, 2));
          } finally {
            await connection.release();
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// ============================================
// SERVER STARTUP
// ============================================

async function start() {
  const poolReady = await initializePool();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ myawsdb MCP Server running on http://0.0.0.0:${PORT}`);
    console.log(`   Database: ${poolReady ? 'Connected ✓' : 'Not connected ✗'}`);
    console.log(`   MCP Tools: ${tools.length} available`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} already in use`);
      process.exit(1);
    }
    throw err;
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
