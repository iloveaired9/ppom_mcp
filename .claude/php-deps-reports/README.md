# PHP Dependency Mapper - 분석 리포트

> **프로젝트:** `ppomppu-crawler-mcp`
> **생성일:** 2026-03-19
> **스킬:** `php-dependency-mapper`

---

## 📁 **폴더 구조**

```
.claude/php-deps-reports/
├── 📊 dependency-map-report.html          ⭐ 전체 코드베이스 분석 (인터랙티브)
├── 📋 dependency-map-data.json            데이터 (JSON 형식)
├── 📄 DEPENDENCY-MAP-SUMMARY.txt          상세 텍스트 리포트
├── 🔗 helper-dependency-map.html          ⭐ Helper 모듈 분석 (인터랙티브)
├── 📈 cache_dependencies.dot              캐시 의존성 그래프 (DOT 형식)
├── 📊 benchmark.json                      성능 벤치마크 데이터
└── iteration-1/                           평가 데이터 (상세)
```

---

## 🚀 **빠른 시작**

### **1️⃣ 전체 분석 보기**
```
📂 열기: dependency-map-report.html
⏱️  시간: 2분
📌 내용:
  - 1,887개 PHP 파일 분석
  - Top 20 호출 함수
  - 5가지 아키텍처 병목
  - 리팩토링 로드맵
```

### **2️⃣ Helper 모듈 분석**
```
📂 열기: helper-dependency-map.html
⏱️  시간: 1분
📌 내용:
  - 16개 함수 관계도
  - 직접 의존성 시각화
  - 파일 include 분석
  - 호출 체인 표시
```

### **3️⃣ 캐시 시스템 분석**
```
📂 열기: cache_dependencies.dot
🔧 처리: Graphviz 사용
📌 내용:
  - 18개 캐시 함수
  - 22개 의존성 관계
  - 5가지 클러스터
  - Graphviz 호환
```

---

## 📊 **주요 발견사항**

### **코드베이스 통계**
| 항목 | 값 |
|-----|-----|
| PHP 파일 | 1,887개 |
| 심볼 | 2,308개 |
| 클래스 | 150+개 |
| 함수 | 1,200+개 |
| 순환 의존성 | ❌ 없음 |

### **아키텍처 위험도**
- **평가**: MEDIUM-HIGH
- **기술 부채**: 증가 중
- **권장사항**: 6-12개월 내 리팩토링

### **상위 병목 (Bottlenecks)**
1. **Helper.php** - 16 심볼 (God Class)
2. **AdsPartnerView.php** - 18 심볼 (God Class)
3. Constructor 재사용 - 87개 참조
4. Legacy PHP 5.6 - 보안 위험
5. 직접 의존성 - 추상화 부족

---

## 🎯 **사용 예**

### **Graphviz로 PNG 생성**
```bash
dot -Tpng cache_dependencies.dot -o cache_graph.png
```

### **SVG로 변환**
```bash
dot -Tsvg cache_dependencies.dot -o cache_graph.svg
```

### **온라인 뷰어**
```
WebGraphViz: http://www.webgraphviz.com/
(cache_dependencies.dot 내용 복붙)
```

---

## 📈 **벤치마크 결과**

### **with_skill vs without_skill**
| 테스트 | with_skill | without_skill | 차이 |
|-------|-----------|---------------|------|
| 전체 분석 | 154.7s | 429.6s | **2.8배 빠름** ⚡ |
| 필터링 | 153.7s | 96.2s | 1.6배 느림 |
| DOT 내보내기 | 250.8s | 254.7s | 동일 |
| **평균** | **186.4s** | **260.2s** | **28% 빠름** |

---

## 📝 **파일 상세**

### **dependency-map-report.html**
전체 PHP 코드베이스 분석 리포트
- Stats Cards: 파일/심볼/클래스/함수 수
- Top 20 Functions: 호출 빈도 시각화
- Complex Files: 복잡도 랭킹
- Architecture Insights: 병목 및 권장사항
- Refactoring Roadmap: 4단계 계획

### **helper-dependency-map.html**
Helper 모듈 중심 의존성 맵
- Central Diagram: Helper 모듈 시각화
- Stats Grid: 함수/include/호출 통계
- Dependencies: 직접 의존성 목록
- Relationship Types: Include/Call/External 구분

### **cache_dependencies.dot**
Graphviz 호환 DOT 형식
- 18개 캐시 함수 노드
- 22개 의존성 엣지
- 5가지 색상 클러스터
- Graphviz 처리 준비 완료

---

## 🔄 **다음 단계**

1. ✅ HTML 리포트 검토
2. ⏳ Graphviz 시각화 생성
3. ⏳ 리팩토링 우선순위 결정
4. ⏳ 기술 부채 감소 계획

---

## 📞 **문의**

이 분석은 `php-dependency-mapper` 스킬로 생성되었습니다.
자세한 내용은 `SKILL.md`를 참고하세요.

**생성 도구**: Claude PHP Dependency Mapper Skill v1.0
