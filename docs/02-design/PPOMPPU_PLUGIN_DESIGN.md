# ppomppu-crawler 플러그인 설계
## `/ppom help` 커맨드 구현 방안

---

## 🎯 목표

bkit의 `/bkit help` 처럼 작동하는 `/ppom help` 커맨드 만들기

```bash
# 현재 (불편함)
curl "http://localhost:3008/tools"
↓
JSON 응답 확인

# 원하는 방식 (편함)
/ppom help
↓
현재 제공하는 도구/기능 목록 자동 표시
```

---

## 🏗️ 구현 방안 비교

### 옵션 1️⃣: MCP 도구 확장 (추천) ⭐

**방식**: ppomppu-crawler MCP 서버에 새로운 도구 추가

```javascript
// ppomppu-crawler.js에 추가

const tools = [
  // 기존 도구들...
  {
    name: 'ppom_help',
    description: 'ppomppu-crawler 도구 목록 및 사용법 표시',
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['all', 'tools', 'boards', 'analysis', 'examples'],
          description: '특정 섹션만 보기'
        }
      }
    }
  }
];

// /help 엔드포인트 추가
if (pathname === '/help') {
  res.end(JSON.stringify({
    server: 'ppomppu-crawler-mcp',
    version: '2.0.0-mcp-standard',
    tools: [
      {
        name: 'crawl_board',
        description: '뽐뿌 게시판 페이지 크롤링',
        usage: 'crawl_board(board="freeboard", page=1)',
        boards: ['freeboard', 'baseball', 'ppomppu', 'stock']
      },
      // ... 다른 도구들
    ],
    commands: {
      crawl: 'GET /freeboard?page=1',
      analyze: 'GET /analyze?board=freeboard&page=1',
      health: 'GET /health'
    }
  }));
}
```

**장점**:
- ✅ MCP 표준 준수
- ✅ Claude Code에서 자동 발견
- ✅ 도구를 도구로 제공
- ✅ inputSchema로 파라미터 검증

**단점**:
- ⚠️ 서버 재시작 필요
- ⚠️ 약간의 복잡도

---

### 옵션 2️⃣: 스킬 구현 (간편)

**방식**: `.claude/skills/ppomppu-help/` 폴더에 스킬 생성

```markdown
# SKILL.md

# ppomppu-crawler 도움말

## 사용 가능한 도구

### 1. crawl_board
뽐뿌 게시판 페이지 크롤링

**사용법:**
- 게시판: freeboard, baseball, ppomppu, stock
- 페이지: 1 이상

### 2. analyze_board
게시판 데이터 분석 (카테고리, 키워드, 통계)

...
```

**장점**:
- ✅ 가장 간단
- ✅ 스킬 재정의 가능
- ✅ 서버 재시작 불필요

**단점**:
- ⚠️ MCP 도구 아님
- ⚠️ `/ppom help` 형식이 아님 (대신 `/ppomppu-help`)
- ⚠️ API로 호출 불가

---

### 옵션 3️⃣: CLI 도구 (유연)

**방식**: Node.js 스크립트 + npm 스크립트

```bash
npm run ppom:help
npm run ppom:status
npm run ppom:tools
```

**장점**:
- ✅ 로컬 터미널에서 빠름
- ✅ npm 스크립트로 관리 용이

**단점**:
- ⚠️ Claude Code와 통합 어려움
- ⚠️ `/ppom help` 형식 아님

---

## 🎯 **추천: 옵션 1 + 옵션 2 조합**

### Phase 1: MCP 도구로 `/help` 엔드포인트 추가

```javascript
// ppomppu-crawler.js 수정

const tools = [
  // 기존 6개 도구...
  {
    name: 'get_help',
    description: 'ppomppu-crawler 사용법 및 도구 목록',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['overview', 'tools', 'boards', 'analysis', 'examples', 'all'],
          description: '도움말 주제'
        }
      }
    }
  }
];

// /help 엔드포인트
if (pathname === '/help' && req.method === 'GET') {
  const topic = query.topic || 'overview';

  res.writeHead(200);
  res.end(JSON.stringify(getHelpContent(topic), null, 2));
}

function getHelpContent(topic) {
  const help = {
    overview: {
      name: 'ppomppu-crawler',
      version: '2.0.0-mcp-standard',
      description: '뽐뿌 게시판 MCP 크롤러 (Express → Node.js http 표준)',
      status: '✅ 활성화',
      port: 3008
    },
    tools: [
      {
        name: 'crawl_board',
        description: '뽐뿌 게시판 페이지 크롤링 (모든 게시판)',
        params: { board: 'freeboard|baseball|ppomppu|stock', page: '1+' },
        endpoint: 'POST /crawl'
      },
      {
        name: 'analyze_board',
        description: '게시판 데이터 분석',
        params: { board: 'freeboard|baseball|ppomppu|stock', page: '1+' },
        endpoint: 'GET /analyze?board=freeboard&page=1'
      },
      // ... 다른 도구들
    ],
    boards: [
      { id: 'freeboard', name: '자유게시판', endpoint: 'GET /freeboard?page=1' },
      { id: 'baseball', name: '야구 게시판', endpoint: 'GET /baseball?page=1' },
      { id: 'ppomppu', name: '뽐뿌 일반', endpoint: 'GET /ppomppu?page=1' },
      { id: 'stock', name: '주식 게시판', endpoint: 'GET /stock?page=1' }
    ],
    analysis: [
      { feature: 'timeline', description: '시간대별 분석' },
      { feature: 'keywords', description: '핵심 키워드 추출' },
      { feature: 'categories', description: '게시물 카테고리 분류' },
      { feature: 'participation', description: '사용자 참여도 분석' }
    ],
    examples: [
      {
        description: 'freeboard 1페이지 조회',
        command: 'curl "http://localhost:3008/freeboard?page=1"'
      },
      {
        description: 'baseball 분석',
        command: 'curl "http://localhost:3008/analyze?board=baseball&page=1"'
      }
    ]
  };

  return help[topic] || help.overview;
}
```

### Phase 2: 스킬로 `/ppom help` 별칭 만들기

```markdown
# .claude/skills/ppomppu-help/SKILL.md

# ppomppu-crawler 도움말

> `/ppom help` 로 보기 쉽게!

## 📋 제공하는 도구

### 1️⃣ crawl_board
뽐뿌 게시판 페이지 크롤링

### 2️⃣ analyze_board
게시판 데이터 분석

...

---

## 🔗 API 엔드포인트

- GET /tools - 도구 목록
- GET /help - 상세 도움말
- GET /health - 서버 상태

---

## 💡 사용 예시

자세한 내용은 `curl "http://localhost:3008/help"` 참고
```

### Phase 3: CLI 도구 추가

```bash
# npm 스크립트 추가
"scripts": {
  "ppom:help": "curl http://localhost:3008/help | jq .",
  "ppom:status": "curl http://localhost:3008/health",
  "ppom:tools": "curl http://localhost:3008/tools"
}

# 사용법
npm run ppom:help
npm run ppom:help -- board=overview
```

---

## 📊 **최종 구조**

```
사용자 입력
    ↓
┌─────────────────────────────────────┐
│ 3가지 방식 모두 지원                 │
├─────────────────────────────────────┤
│ 1. MCP 도구 (자동 발견)             │
│    /help 엔드포인트                 │
│    GET http://localhost:3008/help   │
│                                     │
│ 2. 스킬 (간편)                      │
│    /ppomppu-help 실행               │
│                                     │
│ 3. CLI (빠름)                       │
│    npm run ppom:help                │
└─────────────────────────────────────┘
    ↓
ppomppu-crawler 정보 표시
```

---

## 🎯 **구현 우선순위**

| 순서 | 방식 | 난이도 | 시간 | 가치 |
|------|------|--------|------|------|
| **1순위** | MCP 도구 (/help) | 중간 | 30분 | 높음 |
| **2순위** | 스킬 | 낮음 | 10분 | 중간 |
| **3순위** | CLI | 낮음 | 15분 | 중간 |

---

## 🚀 **구현 코드 예시**

### Step 1: ppomppu-crawler.js에 추가

```javascript
// 라인 45-90 (tools 배열에 추가)
{
  name: 'get_help',
  description: 'ppomppu-crawler 사용법',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        enum: ['overview', 'tools', 'boards', 'examples', 'all']
      }
    }
  }
}

// 라인 600+ (/help 엔드포인트 추가)
if (pathname === '/help' && req.method === 'GET') {
  const topic = query.topic || 'all';
  res.writeHead(200);
  res.end(JSON.stringify(generateHelp(topic), null, 2));
}

function generateHelp(topic) {
  // 위의 getHelpContent() 함수 참고
}
```

### Step 2: package.json에 추가

```json
"scripts": {
  "ppom:help": "curl -s http://localhost:3008/help | jq .",
  "ppom:tools": "curl -s http://localhost:3008/tools | jq .",
  "ppom:status": "curl -s http://localhost:3008/health | jq ."
}
```

### Step 3: 스킬 생성

```bash
mkdir -p .claude/skills/ppomppu-help
cat > .claude/skills/ppomppu-help/SKILL.md << 'EOF'
# ppomppu-crawler 도움말

더 자세한 정보는 아래 명령어 사용:

\`\`\`bash
curl "http://localhost:3008/help"
curl "http://localhost:3008/help?topic=tools"
curl "http://localhost:3008/help?topic=examples"
\`\`\`

또는 npm 스크립트:
\`\`\`bash
npm run ppom:help
npm run ppom:tools
npm run ppom:status
\`\`\`
EOF
```

---

## ✅ **최종 체크리스트**

- [ ] ppomppu-crawler.js에 /help 엔드포인트 추가
- [ ] tools 배열에 'get_help' 도구 추가
- [ ] package.json에 npm 스크립트 추가
- [ ] 스킬 폴더 생성 및 SKILL.md 작성
- [ ] `.claude/skills.json` 등록
- [ ] 테스트: `curl http://localhost:3008/help`
- [ ] 테스트: `npm run ppom:help`

---

## 🎓 **학습 포인트**

이 설계를 통해 배울 수 있는 것:

1. **MCP 도구 확장**: 단순한 엔드포인트를 MCP 도구로 변환
2. **다중 인터페이스**: 같은 기능을 여러 방식으로 제공
3. **사용성**: 사용자가 쉽게 접근할 수 있는 인터페이스 설계
4. **표준화**: npm-scripts, bkit처럼 일관된 패턴 따르기

---

**어떤 옵션부터 시작할까요?** 🚀

추천: **옵션 1 (MCP 도구)** → 30분 소요, 가치 최고!
