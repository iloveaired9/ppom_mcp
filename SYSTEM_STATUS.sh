#!/bin/bash

# 🎯 뽐뿌 MCP 프로젝트 시스템 상태 확인

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 ppomppu-crawler MCP 시스템 현황"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# MCP 서버
echo "📡 MCP 서버 목록"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node << 'EOF'
const fs = require('fs');
const mcp = JSON.parse(fs.readFileSync('./.claude/mcp.json', 'utf8'));
const servers = Object.entries(mcp.mcpServers);
console.log(`총 ${servers.length}개의 MCP 서버\n`);
servers.forEach(([name, config]) => {
  console.log(`  ✓ ${name}`);
  if (config.args && config.args[0]) {
    console.log(`    경로: ${config.args[0]}`);
  }
});
EOF
echo ""

# 플러그인
echo "🔌 플러그인 목록"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node << 'EOF'
const fs = require('fs');
const plugins = JSON.parse(fs.readFileSync('./.claude/plugins.json', 'utf8'));
const pluginList = Object.entries(plugins.plugins);
const active = pluginList.filter(([,p]) => p.enabled).length;
console.log(`총 ${pluginList.length}개 플러그인 (${active}개 활성화)\n`);
pluginList.forEach(([name, info]) => {
  const status = info.enabled ? '✅' : '❌';
  console.log(`  ${status} ${name}`);
  console.log(`     v${info.version} - ${info.description}`);
});
EOF
echo ""

# 스킬
echo "⚡ 스킬 목록"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node << 'EOF'
const fs = require('fs');
const skills = JSON.parse(fs.readFileSync('./.claude/skills.json', 'utf8'));
const skillList = Object.entries(skills.skills);
const active = skillList.filter(([,s]) => s.enabled).length;
console.log(`총 ${skillList.length}개 스킬 (${active}개 활성화)\n`);
skillList.forEach(([name, info]) => {
  const status = info.enabled ? '✅' : '❌';
  console.log(`  ${status} ${name}`);
  console.log(`     ${info.description}`);
});
EOF
echo ""

# 디렉토리 통계
echo "📁 디렉토리 통계"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  플러그인:"
find plugins -maxdepth 1 -type d | wc -l | xargs echo "    폴더 개수:"
echo ""
echo "  스킬:"
find skills -maxdepth 1 -type d | wc -l | xargs echo "    폴더 개수:"
echo ""
echo "  MCP 서버:"
find mcp-servers -maxdepth 1 -type f -name "*.js" | wc -l | xargs echo "    파일 개수:"
echo ""

# 생성된 파일들
echo "💾 생성된 데이터 파일"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "work/output" ]; then
  echo "  work/output/:"
  ls -1 work/output/*.csv 2>/dev/null | wc -l | xargs echo "    CSV 파일:"
  ls -1 work/output/*.php 2>/dev/null | wc -l | xargs echo "    PHP 파일:"
else
  echo "  (데이터 폴더 없음)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 시스템 상태 확인 완료"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
