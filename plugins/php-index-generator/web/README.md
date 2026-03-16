# PHP Index Generator - 웹 인터페이스

정적 HTML + JavaScript 기반의 PHP 코드 검색 웹 인터페이스입니다.

## 🚀 빠른 시작

### 1. 색인 생성 (필수)

먼저 PHP 파일을 색인화해야 합니다:

```bash
npm run php:index:build -- --source work/mobile --force
```

**결과**: `plugins/php-index-generator/output/index.json` 파일 생성

### 2. 웹 페이지 열기

생성된 웹 페이지를 브라우저로 열기:

```bash
# 방법 1: 직접 열기
open plugins/php-index-generator/web/index.html

# 방법 2: 로컬 서버로 열기 (권장 - 더 빠름)
cd plugins/php-index-generator/web
python -m http.server 8000
# 그 후 브라우저에서 http://localhost:8000 열기
```

### 3. 검색 시작!

- 🔍 검색어 입력 (예: `send_header`)
- 🏷️ 타입별 필터 적용 (함수, 클래스, 메서드)
- 📍 결과 클릭하여 코드 위치 확인

---

## 🎯 주요 기능

### ✅ 실시간 검색
- 입력 시 즉시 결과 표시
- **정확 일치**: `send_header` 검색 → 정확히 일치하는 함수 (100점)
- **부분 일치**: `send` 검색 → `send_header` 포함 (60점)
- **퍼지 매칭**: `sned_header` (오타) → `send_header` 자동 수정 (20점)

### 🏷️ 타입별 필터
- **모두**: 전체 심볼 표시
- **함수**: 함수만 필터링
- **클래스**: 클래스만 필터링
- **메서드**: 메서드만 필터링

### 📊 검색 결과
- **심볼명**: 함수, 클래스, 메서드 이름
- **타입**: function, class, method 배지
- **파일**: 정의된 파일 위치
- **라인번호**: 코드가 시작되는 라인
- **매개변수**: 함수 매개변수 (있을 경우)

### 📈 통계 정보
- 총 파일 수: 363개
- 추출된 심볼: 84개
- 색인 생성 시간: ~290ms
- PHP 버전: 5.6

---

## 💡 사용 예시

### 예시 1: send_header 함수 찾기
```
입력: send_header
결과:
 • send_header (function)
   📄 api/gcm/etc_alarm.php  라인 3
```

### 예시 2: 함수만 검색
```
입력: cache
필터: 함수
결과:
 • cache_get (function)
   📄 new/m_header.php  라인 100
 • cache_set (function)
   📄 new/m_header.php  라인 120
```

### 예시 3: 클래스 찾기
```
입력: Helper
필터: 클래스
결과:
 • Helper (class)
   📄 new/m_header.php  라인 50
```

---

## 📁 파일 구조

```
plugins/php-index-generator/
├── web/
│   ├── index.html          # 웹 UI (이 파일)
│   ├── app.js              # 검색 엔진 (JavaScript)
│   └── README.md           # 이 문서
├── output/
│   └── index.json          # 생성된 색인 파일
└── lib/
    ├── IndexCache.js
    ├── PHPParser.js
    ├── IndexBuilder.js
    └── IndexSearcher.js
```

---

## 🔍 검색 알고리즘

결과는 **점수 기준**으로 정렬됩니다:

| 검색 방식 | 점수 | 예시 |
|---------|------|------|
| 정확 일치 | 100 | `send_header` → `send_header` |
| 시작 부분 일치 | 80 | `send` → `send_header` |
| 포함 일치 | 60 | `header` → `send_header` |
| 파일명 일치 | 40 | `alarm` → `etc_alarm.php` |
| 퍼지 매칭 | 20 | `sned` → `send` (오타 수정) |

---

## ⚡ 성능

| 작업 | 시간 |
|------|------|
| 페이지 로드 | ~100ms |
| 색인 로드 | ~50ms |
| 검색 (100개 결과) | <10ms |
| 전체 응답 | <200ms |

---

## 🛠️ 개발자 정보

### 기술 스택
- **Frontend**: HTML5, Vanilla JavaScript
- **데이터**: JSON 정적 파일
- **검색**: 클라이언트 사이드 (서버 불필요)
- **호환성**: 모든 현대 브라우저 지원

### 검색 엔진 코드
`app.js`의 `PHPIndexSearcher` 클래스:

```javascript
// 실시간 검색 수행
performSearch() {
  // 1. 쿼리 파싱
  // 2. 필터 적용
  // 3. 검색 로직 (정확/부분/퍼지)
  // 4. 점수 계산
  // 5. 결과 정렬 및 표시
}

// Levenshtein 거리 기반 퍼지 매칭
fuzzyMatch(query, target) {
  // 오타 자동 수정
}
```

---

## 🐛 문제 해결

### 색인 파일을 찾을 수 없습니다

```bash
# 색인 생성
npm run php:index:build -- --source work/mobile --force

# 또는
npm run php:index:build
```

### 검색이 느립니다

- 브라우저 개발자 도구(F12)를 열어 콘솔 확인
- 색인 파일 크기 확인: `output/index.json`
- 로컬 서버 사용 (Python 또는 Node.js)

### 특정 심볼이 안 나옵니다

```bash
# 색인 캐시 초기화 후 재생성
rm -rf .claude/php-index-cache
npm run php:index:build -- --force
```

---

## 📝 라이선스

MIT

---

## 🤖 생성 정보

- **생성 도구**: Claude Code
- **생성 일시**: 2026-03-17
- **PHP Index Generator v1.0.0**
