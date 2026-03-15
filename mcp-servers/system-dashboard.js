#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3010;
const BASE_DIR = path.join(__dirname, '..');

/**
 * System Dashboard API Server
 */

app.get('/api/status', (req, res) => {
  try {
    const mcp = readJSON(path.join(BASE_DIR, '.claude', 'mcp.json'));
    const plugins = readJSON(path.join(BASE_DIR, '.claude', 'plugins.json'));
    const skills = readJSON(path.join(BASE_DIR, '.claude', 'skills.json'));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      mcp: mcp.mcpServers || {},
      plugins: plugins.plugins || {},
      skills: skills.skills || {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get('/', (req, res) => {
  res.send(getHTML());
});

function getHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>System Status Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 30px; font-size: 28px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
        .card h2 { margin-bottom: 15px; font-size: 18px; display: flex; align-items: center; gap: 8px; }
        .card ul { list-style: none; }
        .card li { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #30363d; }
        .card li:last-child { border-bottom: none; }
        .status-enabled { color: #3fb950; }
        .status-disabled { color: #d1242f; }
        .count { background: #0d1117; padding: 4px 8px; border-radius: 4px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 System Status Dashboard</h1>
        <div class="grid" id="grid"></div>
      </div>
      <script>
        async function loadStatus() {
          const res = await fetch('/api/status');
          const data = await res.json();

          const grid = document.getElementById('grid');
          grid.innerHTML = '';

          // MCP Servers
          const mcpCard = document.createElement('div');
          mcpCard.className = 'card';
          const servers = Object.entries(data.mcp);
          mcpCard.innerHTML = \`
            <h2>📡 MCP Servers <span class="count">\${servers.length}</span></h2>
            <ul>
              \${servers.map(([name, cfg]) => \`<li><strong>\${name}</strong> → \${cfg.args?.[0] || 'N/A'}</li>\`).join('')}
            </ul>
          \`;
          grid.appendChild(mcpCard);

          // Plugins
          const pluginCard = document.createElement('div');
          pluginCard.className = 'card';
          const plugins = Object.entries(data.plugins);
          const activePlugins = plugins.filter(([,p]) => p.enabled).length;
          pluginCard.innerHTML = \`
            <h2>🔌 Plugins <span class="count">\${activePlugins}/\${plugins.length}</span></h2>
            <ul>
              \${plugins.map(([name, info]) => {
                const status = info.enabled ? '✅' : '❌';
                return \`<li>\${status} <strong>\${name}</strong> v\${info.version || '?'}</li>\`;
              }).join('')}
            </ul>
          \`;
          grid.appendChild(pluginCard);

          // Skills
          const skillCard = document.createElement('div');
          skillCard.className = 'card';
          const skills = Object.entries(data.skills);
          const activeSkills = skills.filter(([,s]) => s.enabled).length;
          skillCard.innerHTML = \`
            <h2>⚡ Skills <span class="count">\${activeSkills}/\${skills.length}</span></h2>
            <ul>
              \${skills.map(([name, info]) => {
                const status = info.enabled ? '✅' : '❌';
                return \`<li>\${status} <strong>\${name}</strong></li>\`;
              }).join('')}
            </ul>
          \`;
          grid.appendChild(skillCard);
        }

        loadStatus();
        setInterval(loadStatus, 5000);
      </script>
    </body>
    </html>
  `;
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

app.listen(PORT, () => {
  console.log(\`🚀 Dashboard running at http://localhost:\${PORT}\`);
});
