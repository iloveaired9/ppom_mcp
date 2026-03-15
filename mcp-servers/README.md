# 📦 MCP Servers Directory

MCP (Model Context Protocol) 서버 모음

## 📂 구조

```
mcp-servers/
├── ppomppu-crawler/            # 뽐뿌 크롤러 서버
│   ├── ppomppu-crawler.js      # 메인 구현
│   ├── package.json
│   ├── handlers/               # 기능별 핸들러
│   │   ├── crawl.js           # 크롤링
│   │   ├── analyze.js         # 분석
│   │   └── health.js          # 헬스체크
│   ├── tests/
│   │   └── ppomppu-crawler.test.js
│   └── README.md
│
├── doc-generator/              # 문서 생성기 (기존)
├── php-legacy-converter/       # PHP 레거시 컨버터 (기존)
└── ... (기타 서버)
```

## 🚀 활성화된 서버

| 서버 | 포트 | 상태 | 설명 |
|------|------|------|------|
| ppomppu-crawler | 3008 | ✅ 활성 | 뽐뿌 게시판 크롤링 |
| doc-generator | 3003 | ✅ 활성 | 마크다운 문서 생성 |
| php-legacy-converter | 3004 | ✅ 활성 | PHP 레거시 변환 |
| myawsdb | (기존) | ✅ 활성 | AWS DB 관리 |

## 📋 MCP 서버 등록

서버는 `.claude/mcp.json`에 등록됩니다:

```json
{
  "mcpServers": {
    "ppomppu-crawler": {
      "command": "node",
      "args": ["mcp-servers/ppomppu-crawler/ppomppu-crawler.js"],
      "env": { "PPOMPPU_PORT": "3008" },
      "status": "active"
    }
  }
}
```

## 📖 MCP 서버 개발

새 MCP 서버를 추가하려면:

1. `mcp-servers/{server-name}` 폴더 생성
2. `{server-name}.js` 메인 파일 작성
3. `handlers/` 디렉토리에 기능별 모듈 분리
4. `package.json` 작성
5. `.claude/mcp.json`에 등록

## 🔌 MCP 서버 인터페이스

### 필수 엔드포인트

```javascript
// GET /health - 서버 상태
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'server-name' });
});

// GET /tools - 도구 목록
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'tool-name', description: '...' }
    ]
  });
});
```

### 선택 엔드포인트

```javascript
// POST /crawl - 데이터 수집
// GET /analyze - 데이터 분석
// 등 기능별로 필요한 엔드포인트
```

## 🔗 관련 파일

- `.claude/mcp.json` - MCP 서버 레지스트리
- `REGISTRY.md` - 서버 목록 (자동 생성)
