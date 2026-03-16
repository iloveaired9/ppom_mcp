# MCP 설정 가이드

## 프로젝트 개요
MCP (Model Context Protocol) 학습 및 실험 프로젝트

## MCP 설정

### 활성화된 MCP 서버
1. **filesystem** - 파일시스템 접근
   - 명령: `npx @modelcontextprotocol/server-filesystem /`
   - 용도: 파일 읽기/쓰기, 디렉토리 탐색

### 권한 설정
- `.claude/settings.local.json`에서 `Bash` 권한 허용
- MCP 서버 자동 시작 시 필요

## 개발 규칙

### 코딩 스타일
- Node.js/JavaScript 주 사용 언어
- 간단하고 명확한 코드 선호
- MCP 서버는 JSON-RPC 프로토콜 준수

### 금지 사항
- ❌ 복잡한 설정 (선택지는 최소화)
- ❌ 성능 최적화 미리 하기 (필요할 때만)

## MCP 학습 체크리스트
- [x] mcp.json 설정
- [x] 권한 설정 (Bash)
- [ ] 첫 번째 MCP 명령 실행
- [ ] 커스텀 MCP 서버 만들기
