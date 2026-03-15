# Claude Code Commands

## 목적
자주 사용하는 작업을 `/command-name` 형태로 빠르게 실행하기 위한 커스텀 명령어 저장소입니다.

## 사용 방법
```bash
# 예: /format (코드 포매팅)
/format

# 예: /test (테스트 실행)
/test

# 예: /commit (자동 커밋)
/commit
```

## 파일 구조
```
.claude/commands/
├── README.md (이 파일)
├── format.md (코드 포매팅)
├── test.md (테스트 실행)
├── commit.md (Git 커밋)
└── deploy.md (배포)
```

## 만드는 방법

각 명령어는 `.md` 파일 형태로 저장됩니다:

```markdown
---
name: 명령어-이름
description: 한 줄 설명
---

명령어 실행 내용
```

## 예제: /format
```markdown
---
name: format
description: 코드 포매팅 실행
---

pnpm format
```

## 팁
- 반복 작업을 명령어로 만들면 생산성 ↑
- 팀 규칙을 명령어로 자동화
