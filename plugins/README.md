# 🔌 Plugins Directory

Claude Code 플러그인 모음

## 📂 구조

```
plugins/
├── fetch-and-summarize/        # 뽐뿌 데이터 수집 및 분석
│   ├── manifest.json
│   ├── index.js
│   ├── lib/
│   ├── docs/
│   └── tests/
│
└── board-explorer/             # 게시판 탐색 도구 (개발 중)
    ├── manifest.json
    ├── index.js
    └── lib/
```

## 🚀 등록된 플러그인

| 플러그인 | 상태 | 설명 |
|---------|------|------|
| php-code-migrator | ✅ 활성 | PHP 5.6 함수 → Static 클래스 변환 |
| fetch-and-summarize | ✅ 활성 | 뽐뿌 게시판 데이터 자동 수집/분석 |
| board-explorer | ⏳ 개발 중 | 다양한 게시판 탐색 및 관리 |

## 📋 플러그인 등록

플러그인은 `.claude/plugins.json`에 등록됩니다:

```json
{
  "plugins": {
    "plugin-name": {
      "path": "plugins/plugin-name",
      "enabled": true
    }
  }
}
```

## 📖 플러그인 개발

새 플러그인을 추가하려면:

1. `plugins/{plugin-name}` 폴더 생성
2. `manifest.json` 작성
3. `index.js` 구현
4. `.claude/plugins.json`에 등록

## 🔗 관련 파일

- `.claude/plugins.json` - 플러그인 레지스트리
- `REGISTRY.md` - 플러그인 목록 (자동 생성)
