const fs = require('fs');
const path = require('path');

/**
 * System Status Skill - Display MCP servers, plugins, and skills
 */
class SystemStatusSkill {
  constructor() {
    this.name = 'system-status';
    this.version = '1.0.0';
  }

  /**
   * Get system status as formatted markdown
   */
  async getStatus() {
    const mcp = this.readJSON('./.claude/mcp.json');
    const plugins = this.readJSON('./.claude/plugins.json');
    const skills = this.readJSON('./.claude/skills.json');

    let report = '# 📊 System Status Dashboard\n\n';

    // MCP Servers
    report += '## 📡 MCP Servers\n\n';
    if (mcp && mcp.mcpServers) {
      const servers = Object.entries(mcp.mcpServers);
      report += `**Total: ${servers.length}**\n\n`;
      servers.forEach(([name, config]) => {
        const args = config.args?.[0] || 'N/A';
        report += `- **${name}** → \`${args}\`\n`;
      });
    }

    // Plugins
    report += '\n## 🔌 Plugins\n\n';
    if (plugins && plugins.plugins) {
      const pluginList = Object.entries(plugins.plugins);
      const active = pluginList.filter(([, p]) => p.enabled).length;
      report += `**Total: ${pluginList.length} (${active} active)**\n\n`;
      pluginList.forEach(([name, info]) => {
        const status = info.enabled ? '✅' : '❌';
        report += `${status} **${name}** (v${info.version})\n`;
        report += `   ${info.description}\n`;
      });
    }

    // Skills
    report += '\n## ⚡ Skills\n\n';
    if (skills && skills.skills) {
      const skillList = Object.entries(skills.skills);
      const active = skillList.filter(([, s]) => s.enabled).length;
      report += `**Total: ${skillList.length} (${active} active)**\n\n`;
      skillList.forEach(([name, info]) => {
        const status = info.enabled ? '✅' : '❌';
        report += `${status} **${name}**\n`;
        report += `   ${info.description}\n`;
      });
    }

    // Directory Stats
    report += '\n## 📁 Directory Stats\n\n';
    report += '| Component | Count |\n';
    report += '|-----------|-------|\n';
    report += `| MCP Servers | ${mcp?.mcpServers ? Object.keys(mcp.mcpServers).length : 0} |\n`;
    report += `| Plugins | ${plugins?.plugins ? Object.keys(plugins.plugins).length : 0} |\n`;
    report += `| Skills | ${skills?.skills ? Object.keys(skills.skills).length : 0} |\n`;

    report += '\n---\n\n';
    report += '💡 **Tip**: Run `bash SYSTEM_STATUS.sh` in terminal for a fancy ASCII dashboard\n';

    return report;
  }

  /**
   * Helper: Read JSON file safely
   */
  readJSON(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  /**
   * Execute skill
   */
  async execute(command, options = {}) {
    if (command === 'status' || !command) {
      const report = await this.getStatus();
      return {
        success: true,
        data: report,
        message: 'System status retrieved'
      };
    }

    return {
      success: false,
      message: `Unknown command: ${command}`
    };
  }
}

module.exports = SystemStatusSkill;
