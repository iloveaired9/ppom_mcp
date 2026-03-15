@echo off
REM Claude Code with local configuration
REM Windows UTF-8 인코딩 설정 (Korean/Unicode 문자 표시)
chcp 65001 >nul

set ANTHROPIC_AUTH_TOKEN=sk-litellm-local-proxy
set USE_BUILTIN_RIPGREP=1
set ANTHROPIC_BASE_URL=http://192.168.0.61:8896
set ANTHROPIC_API_KEY=sk-litellm-local-proxy
set ANTHROPIC_DEFAULT_SONNET_MODEL=claude-sonnet-4-5-20250929
set ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-5-20251001
set ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
set DISABLE_AUTOUPDATER=1

claude %*
