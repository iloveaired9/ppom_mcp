#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'status.html');

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`\n✅ Status Dashboard is running!`);
  console.log(`📍 Open in browser: http://localhost:${PORT}\n`);
});
