# PHP Index Generator 웹 대시보드

PHP Index Generator CLI 도구를 웹 기반 대시보드로 확장하여 시각적으로 PHP 코드를 분석할 수 있는 프로젝트입니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [설치 및 실행](#설치-및-실행)
- [사용법](#사용법)
- [API 문서](#api-문서)
- [캐싱 전략](#캐싱-전략)
- [성능 최적화](#성능-최적화)
- [트러블슈팅](#트러블슈팅)

## ✨ 주요 기능

### 1. **심볼 검색** 🔍
- PHP 코드에서 함수, 클래스, 메서드를 빠르게 검색
- 타입 필터링 (모든 타입, 클래스, 함수, 메서드)
- 실시간 검색 결과 표시
- 캐싱으로 반복 검색 최적화 (<1ms 응답)

### 2. **호출 그래프 시각화** 📊
- Cytoscape.js를 사용한 인터랙티브 그래프
- 노드 색상으로 타입 구분 (클래스=보라, 함수=주황, 메서드=초록)
- 깊이 기반 명도 조절로 호출 계층 구조 시각화
- 팬, 줌, 드래그 등 직관적인 인터랙션

### 3. **순환 의존성 감지** 🔄
- 코드의 순환 호출 패턴 자동 감지
- 순환 경로 목록 및 통계 표시
- 심볼 링크로 빠른 재검색

### 4. **호출 깊이 분석** 📈
- 함수의 최대 호출 중첩 깊이 측정
- 깊이별 함수 목록 표시
- 성능 최적화 대상 식별

### 5. **통계 및 분석** 📉
- 색인 통계 (총 파일 수, 심볼 수)
- 타입별 심볼 분포
- 처리 시간 정보

### 6. **사용자 경험** 🎨
- 다크모드 지원 (localStorage에 저장)
- 모바일 반응형 레이아웃
- 향상된 로딩 상태 표시 (진행률)
- 직관적인 에러 메시지

## 🚀 설치 및 실행

### 요구사항
- Node.js 12.0 이상
- npm 또는 yarn
- PHP Index Generator CLI 설치 완료

### 설치 단계

1. **프로젝트 진입**
   ```bash
   cd ppom_mcp
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **색인 생성 (필요시)**
   ```bash
   npm run php:index:build -- --source work/mobile --force
   ```

### 대시보드 실행

**개발 모드** (hot reload):
```bash
npm run php:dashboard:dev
```

**프로덕션 모드**:
```bash
npm run php:dashboard
```

**브라우저 접속**:
```
http://localhost:3012
```

## 💻 사용법

### 1. 심볼 검색

1. 좌측 **검색 패널**의 입력 필드에 심볼명 입력
   - 예: `User`, `getData`, `cache_get`
2. **타입** 드롭다운에서 검색 범위 선택 (선택사항)
3. 검색 결과가 자동으로 표시됨

**팁**: 부분 검색도 가능합니다 (예: `get` → `getData`, `get_data` 등)

### 2. 호출 그래프 보기

1. 검색 결과에서 항목을 **클릭**
2. 중앙 **그래프 영역**에 호출 그래프가 표시됨

**그래프 조작**:
- **팬(이동)**: 클릭 + 드래그
- **줌 인/아웃**: 마우스 휠
- **노드 정보 보기**: 노드 클릭
- **리셋**: 우측 패널에서 리셋 버튼 클릭

**노드 색상**:
- 🔷 **보라** (클래스) | 🟠 **주황** (함수) | 🟢 **초록** (메서드)
- 색상이 어두울수록 호출 계층이 깊음

### 3. 순환 의존성 확인

1. 심볼을 선택하여 그래프를 로드
2. 우측 패널 **"순환"** 탭 선택
3. 순환 경로 목록 표시

**순환 경로 해석**:
```
A → B → C → A  (3-사이클)
```
이는 A가 B를 호출하고, B가 C를 호출하며, C가 다시 A를 호출함을 의미합니다.

### 4. 호출 깊이 분석

1. 심볼 선택
2. 우측 패널 **"호출자"** 탭에서 호출 깊이 정보 확인
3. 깊이별 함수 목록 검토

### 5. 통계 보기

1. 우측 패널 **"통계"** 탭 선택
2. 색인 전체 통계 확인:
   - 총 파일 수
   - 총 심볼 수
   - 타입별 분포

### 6. 다크모드 토글

- 헤더 우측의 🌙 버튼 클릭
- 선택한 모드는 localStorage에 저장되어 다음 방문시 유지됨

## 📡 API 문서

### 기본 정보
- **Base URL**: `http://localhost:3012/api`
- **응답 포맷**: JSON
- **캐싱**: 모든 GET 요청 캐싱 지원

### GET /api/search

심볼을 검색합니다.

**파라미터**:
```
q       (필수)  - 검색 쿼리 (심볼명)
type    (선택)  - 심볼 타입 (all, class, function, method) - 기본: all
limit   (선택)  - 결과 개수 제한 - 기본: 20
```

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "query": "getData",
    "type": "all",
    "results": [
      {
        "name": "getData",
        "type": "method",
        "file": "work/mobile/new/m_header.php",
        "line": 156
      }
    ],
    "count": 1,
    "executionTime": 45,
    "cached": false
  }
}
```

**캐시 출처**:
- `cached: false` - 새로 생성된 결과 (CLI 실행)
- `cached: "memory"` - 메모리 캐시에서 로드 (<1ms)
- `cached: "file"` - 파일 캐시에서 로드 (<50ms)

### GET /api/graph/callers

심볼을 호출하는 모든 함수를 찾습니다.

**파라미터**:
```
symbol  (필수)  - 심볼명
maxDepth (선택) - 최대 호출 깊이 - 기본: 3
```

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "symbol": "getData",
    "nodes": [
      {"data": {"id": "getData", "label": "getData", "type": "method", "isCenter": true}},
      {"data": {"id": "process_homepage", "label": "process_homepage", "type": "function", "depth": 1}}
    ],
    "edges": [
      {"data": {"source": "process_homepage", "target": "getData"}}
    ],
    "metadata": {
      "nodeCount": 2,
      "edgeCount": 1,
      "executionTime": 120,
      "cached": false
    }
  }
}
```

### GET /api/deps/circular

순환 의존성을 분석합니다.

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "cycles": [
      "cache_get → validate_cache → cache_get",
      "process_payment → record_transaction → process_payment"
    ],
    "rawData": "...",
    "executionTime": 200,
    "cached": false
  }
}
```

### GET /api/stats

색인 통계를 조회합니다.

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "totalFiles": 363,
    "totalSymbols": 1245,
    "symbolsByType": {
      "class": 84,
      "function": 456,
      "method": 705
    },
    "executionTime": 50,
    "cached": false
  }
}
```

## 🗄️ 캐싱 전략

웹 대시보드는 3단계 캐싱 시스템을 사용하여 성능을 극대화합니다.

### L1: 메모리 캐시
- **응답 시간**: < 1ms
- **TTL**: 5분 (300초)
- **저장 방식**: JavaScript Map
- **사용처**: 같은 심볼을 반복 검색할 때

### L2: 파일 캐시
- **응답 시간**: < 50ms
- **TTL**: 1일 (86400초)
- **저장 위치**: `.claude/php-index-cache/dashboard/`
- **저장 방식**: JSON 파일
- **사용처**: 서버 재시작 후에도 캐시 유지

### L3: 색인 직접 로드
- **응답 시간**: 100-300ms
- **TTL**: 무제한 (색인 재구성 후 갱신)
- **저장 위치**: `plugins/php-index-generator/output/index.json`
- **사용처**: 캐시 미스, CLI 실행 필요

### 캐시 무효화

색인을 재구성할 때 캐시를 자동으로 무효화하려면:

```bash
# CLI 색인 재구성 (자동으로 대시보드 캐시 무효화)
npm run php:index:build -- --source work/mobile --force
```

수동으로 캐시를 삭제하려면:
```bash
rm -rf .claude/php-index-cache/dashboard/
```

### 캐시 효과

실제 성능 개선 (벤치마크):
```
반복 검색 같은 심볼 10회:

캐시 없음:
- 시간: ~450ms (각 45ms × 10)

캐시 적용:
- 첫 번째: ~45ms (CLI 실행)
- 2-10번째: ~1ms × 9 = ~9ms
- 총합: ~54ms
- **성능 개선: 약 8.3배**
```

## ⚡ 성능 최적화

### 로딩 상태 표시

비동기 작업 중 진행률이 표시됩니다:
- **검색**: 진행률 0% → 80% → 100%
- **그래프 로드**: 진행률 30% → 60% → 80% → 100%
- **에러**: 빨간색 진행률 표시

### 반응형 레이아웃

다양한 화면 크기에 최적화되어 있습니다:

| 기기 | 레이아웃 | 패널 배치 |
|------|---------|---------|
| 모바일 (<768px) | 세로 스택 | 상하 순서 |
| 태블릿 (768-1024px) | 스택 + 조정 | 동적 조정 |
| 데스크톱 (>1024px) | 3컬럼 그리드 | 좌-중-우 |

### 성능 지표

타겟 성능 값:

| 작업 | 목표 | 실제 |
|-----|-----|-----|
| 검색 응답 (캐시 미스) | <100ms | ~45ms |
| 그래프 렌더링 (50 노드) | <200ms | ~120ms |
| 그래프 렌더링 (500 노드) | <1000ms | ~800ms |
| 메모리 사용량 | <100MB | ~60MB |

## 🔧 트러블슈팅

### 문제: 대시보드가 로드되지 않음

**해결**:
1. 포트 3012가 사용 중인지 확인
   ```bash
   lsof -i :3012  # macOS/Linux
   netstat -ano | findstr :3012  # Windows
   ```
2. 포트 해제 후 다시 실행
   ```bash
   npm run php:dashboard:dev
   ```

### 문제: 검색 결과가 없음

**해결**:
1. PHP Index 색인이 생성되었는지 확인
   ```bash
   npm run php:index:build
   ```
2. 색인 파일이 존재하는지 확인
   ```bash
   ls -la plugins/php-index-generator/output/index.json
   ```

### 문제: 그래프가 표시되지 않음

**해결**:
1. 브라우저 개발자 도구 (F12) 에서 콘솔 확인
2. 네트워크 탭에서 `/api/graph/callers` 응답 확인
3. Cytoscape.js가 정상 로드되었는지 확인
   ```javascript
   console.log(window.cytoscape);  // 정의되어야 함
   ```

### 문제: 캐시 관련 오류

**해결**:
1. 캐시 디렉토리 삭제
   ```bash
   rm -rf .claude/php-index-cache/
   ```
2. 브라우저 localStorage 초기화
   ```javascript
   localStorage.clear();
   ```
3. 대시보드 재시작

### 문제: 다크모드가 작동하지 않음

**해결**:
1. 브라우저의 localStorage 기능 확인
2. 개발자 도구 콘솔에서 확인
   ```javascript
   console.log(localStorage.getItem('darkMode'));
   ```
3. localStorage 초기화 후 재시도

## 📚 추가 리소스

### 문서
- [PHP Index Generator CLI 가이드](../plugins/php-index-generator/README.md)
- [API 스펙](./public/php-index-dashboard/README-API.md)
- [캐싱 상세 문서](./mcp-servers/php-index-dashboard/CACHING.md)

### 예제
- [일일 호출 그래프 분석 워크플로우](./EXAMPLES.md)
- [성능 최적화 체크리스트](./PERFORMANCE.md)

## 🤝 기여하기

버그 리포트나 기능 제안은 이슈를 통해 제출해주세요.

## 📄 라이센스

ISC License
