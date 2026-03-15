#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function printStatus() {
  const baseDir = path.join(__dirname, '..');

  const mcp = readJSON(path.join(baseDir, '.claude', 'mcp.json'));
  const plugins = readJSON(path.join(baseDir, '.claude', 'plugins.json'));
  const skills = readJSON(path.join(baseDir, '.claude', 'skills.json'));

  console.log('\n📊 System Status Dashboard\n');

  // MCP Servers
  if (mcp?.mcpServers) {
    const servers = Object.entries(mcp.mcpServers);
    console.log(`📡 MCP Servers (${servers.length})`);
    console.log('━'.repeat(50));
    servers.forEach(([name, config]) => {
      const args = config.args?.[0] || 'N/A';
      console.log(`  ✓ ${name.padEnd(20)} → ${args}`);
    });
    console.log();
  }

  // Plugins
  if (plugins?.plugins) {
    const pluginList = Object.entries(plugins.plugins);
    const active = pluginList.filter(([, p]) => p.enabled).length;
    console.log(`🔌 Plugins (${active}/${pluginList.length} active)`);
    console.log('━'.repeat(50));
    pluginList.forEach(([name, info]) => {
      const status = info.enabled ? '✅' : '❌';
      console.log(`  ${status} ${name.padEnd(20)} v${info.version}`);
      console.log(`     ${info.description}`);
    });
    console.log();
  }

  // Skills
  if (skills?.skills) {
    const skillList = Object.entries(skills.skills);
    const active = skillList.filter(([, s]) => s.enabled).length;
    console.log(`⚡ Skills (${active}/${skillList.length} active)`);
    console.log('━'.repeat(50));
    skillList.forEach(([name, info]) => {
      const status = info.enabled ? '✅' : '❌';
      console.log(`  ${status} ${name.padEnd(25)} ${info.description}`);
    });
    console.log();
  }

  console.log('━'.repeat(50));
  console.log('✅ System status check complete\n');
}

printStatus();
