---
name: system-status
description: View MCP servers, plugins, and skills status locally
type: utility
version: 1.0.0
enabled: true
---

# 🎯 System Status

View current MCP servers, plugins, and skills configuration.

## Usage

```bash
# View full dashboard
/system-status

# Or just ask
"What's the current status of MCP servers and plugins?"
```

## What it shows

📡 **MCP Servers** - List of all configured servers
🔌 **Plugins** - Installed plugins with status (active/inactive)
⚡ **Skills** - Available skills with status
📁 **Directory Stats** - File/folder counts
💾 **Data Files** - Generated output files

## Files

- **Local Dashboard**: Run `bash SYSTEM_STATUS.sh` in terminal
- **Web Dashboard**: Coming soon
- **API**: Will be available via ppomppu-analyzer MCP
