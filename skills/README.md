# 🎯 Skills Directory

Claude Skills (명령 및 자동화) 모음

## 📂 구조

```
skills/
├── analyze-freeboard/          # 뽐뿌 자유게시판 분석
│   ├── SKILL.md               # 스킬 정의
│   ├── skill.js               # 구현
│   ├── prompts/               # 프롬프트 템플릿
│   ├── utils/                 # 유틸리티
│   └── tests/                 # 테스트
│
├── fetch-and-summarize/        # 뽐뿌 데이터 수집 및 요약
│   ├── SKILL.md
│   ├── skill.js
│   ├── prompts/
│   └── utils/
│
└── multi-board-analysis/       # 다중 게시판 분석 (개발 중)
    ├── SKILL.md
    ├── skill.js
    └── prompts/
```

## 🚀 등록된 스킬

| 스킬 | 상태 | 명령어 |
|-----|------|--------|
| analyze-freeboard | ✅ 활성 | `/analyze-freeboard` |
| fetch-and-summarize | ✅ 활성 | `/fetch-and-summarize-freeboard` |
| multi-board-analysis | ⏳ 개발 중 | (미정) |

## 📋 스킬 등록

스킬은 `.claude/skills.json`에 등록됩니다:

```json
{
  "skills": {
    "skill-name": {
      "path": "skills/skill-name",
      "skillFile": "skills/skill-name/SKILL.md",
      "enabled": true
    }
  }
}
```

## 📖 스킬 개발

스킬 파일 구조:

```
skills/{skill-name}/
├── SKILL.md                   # 필수: 스킬 정의 및 사용법
├── skill.js                   # 구현 (선택)
├── prompts/
│   ├── main.md               # 메인 프롬프트
│   └── examples.md           # 사용 예시
├── utils/
│   └── {utility}.js          # 보조 함수
└── tests/
    └── skill.test.js         # 테스트
```

## 🔗 관련 파일

- `.claude/skills.json` - 스킬 레지스트리
- `REGISTRY.md` - 스킬 목록 (자동 생성)
- `.claude/commands/` - 오래된 스킬 정의 (마이그레이션 예정)
