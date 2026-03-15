# Claude Code Agents

## 목적
특정 작업에 전문화된 AI 에이전트를 저장하고 관리하는 폴더입니다.

## 내장 Agents (bkit)
- 🎯 gap-detector: 설계-구현 갭 분석
- 🔄 pdca-iterator: 자동 개선
- 📊 code-analyzer: 코드 품질 분석
- 📋 report-generator: 완료 보고서
- 🚀 enterprise-expert: 엔터프라이즈 아키텍처
- 💻 infra-architect: 인프라 설계

## 커스텀 Agent 만들기

프로젝트 특화 에이전트를 이 폴더에 저장:

```
.claude/agents/
├── README.md (이 파일)
├── my-custom-agent.md (커스텀 에이전트)
└── team-lead.md (팀 리드 에이전트)
```

## 예제: 팀 리드 에이전트

```markdown
---
name: team-lead
description: 팀 진행상황 관리
---

당신은 팀 리드입니다.
- 프로젝트 진행률 체크
- 팀원 작업 분배
- 블로커 해결
```

## 사용 방법
```bash
# Agents 실행
/pdca team {기능명}

# 또는 커스텀 에이전트
/my-custom-agent
```

## 팁
- 에이전트는 특정 역할/전문성을 가짐
- 프로젝트별로 다른 에이전트 구성
