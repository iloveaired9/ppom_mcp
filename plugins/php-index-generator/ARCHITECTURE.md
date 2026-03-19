# PHP Index Generator - 아키텍처 문서

## 🏗️ 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI / Skill Interface                  │
│  (npm run php:index:* / /php-index <command>)              │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │   index.js     │  Main CLI Entry Point
         │  (argument     │
         │   parsing)     │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│ Build  │  │ Search  │  │   Info   │
│Command │  │Command  │  │ Command  │
└────┬───┘  └────┬────┘  └────┬─────┘
     │           │             │
     └───────────┼─────────────┘
                 │
         ┌───────▼──────────────────────────┐
         │   IndexBuilder (배치 처리)     │
         │  - 파일 스캔 (Batch 단위)     │
         │  - 메모리 최적화 (GC)         │
         │  - SQLite 저장                │
         │  - JSON 내보내기              │
         └───────┬──────────────────────┘
                 │
     ┌───────────┼────────────┬──────────────┐
     │           │            │              │
     ▼           ▼            ▼              ▼
┌─────────┐ ┌────────┐ ┌─────────┐  ┌──────────────┐
│PHPParser│ │  Cache │ │ SQLite  │  │ IndexSearcher│
│ (정규식)│ │(메타데이터) │  DB  │  │  (JSON)      │
└─────────┘ └────────┘ └─────────┘  └──────────────┘
         │           │
         └───────┬───┘
                 │
      ┌──────────▼──────────┐
      │  output/            │
      ├── index.db          │
      ├── index.db-shm      │
      ├── index.db-wal      │
      └── index.json        │
      └──────────────────────┘
```

## 📦 모듈별 역할

### 1. IndexCache.js (파일 추적)

**책임**: 파일 메타데이터 관리, 변경 감지

```javascript
// 주요 기능
- loadCache()         // 기존 캐시 로드
- saveCache()         // 캐시 저장
- hasChanged(file)    // 파일 변경 여부 확인
- updateHash(file)    // 파일 해시 업데이트
- getPreviousSymbols()// 이전 심볼 조회
```

**데이터 구조**:
```json
{
  "files": {
    "work/mobile/app/Models/User.php": {
      "hash": "sha256_hash_value",
      "mtime": 1710570000000,
      "symbols": [
        "App\\Models\\User",
        "UserFactory"
      ]
    }
  }
}
```

### 2. PHPParser.js (PHP 코드 파싱)

**책임**: PHP 파일에서 심볼 추출

```javascript
// 주요 기능
- parseFile(filePath)           // 파일 파싱
- extractClasses()              // class 정의 추출
- extractFunctions()            // function 정의 추출
- extractMethods(className)     // 메서드 추출
- extractProperties(className)  // 속성 추출
- extractInterfaces()           // interface 정의 추출
- extractTraits()               // trait 정의 추출
- getNamespace()                // 네임스페이스 추출
```

**파싱 규칙 (정규식 기반)**:

```regex
# 클래스
/(?:class|abstract\s+class|final\s+class)\s+(\w+)/

# 함수
/(?:public|private|protected)?\s*(?:static)?\s*function\s+(\w+)/

# 인터페이스
/interface\s+(\w+)/

# Trait
/trait\s+(\w+)/

# 네임스페이스
/namespace\s+([\w\\]+)/

# 상수
/const\s+(\w+)\s*=/
```

**반환 형식**:
```javascript
{
  file: "work/mobile/app/Models/User.php",
  namespace: "App\\Models",
  symbols: [
    {
      name: "User",
      type: "class",
      line: 12,
      extends: "Model",
      implements: ["Authenticatable"],
      methods: [
        { name: "create", type: "method", line: 45, visibility: "public" },
        { name: "update", type: "method", line: 78, visibility: "public" }
      ],
      properties: [
        { name: "$table", type: "property", line: 20, visibility: "protected" }
      ]
    }
  ]
}
```

### 3. IndexBuilder.js (색인 생성 - SQLite 배치 처리)

**책임**: 파일 시스템 스캔, 배치 처리, SQLite 저장

```javascript
// 주요 기능
- build(sourceDir, options)       // 전체 색인 생성
- buildIncremental()              // 증분 색인화
- collectFiles(sourceDir)         // PHP 파일 수집
- processFileBatch(files)         // 배치 단위 파일 처리 (메모리 최적화)
- saveBatchToDatabase(batch)      // SQLite에 배치 저장
- loadIndexFromDatabase()         // SQLite에서 색인 로드 (스트리밍)
- writeIndex()                    // JSON 내보내기
- generateMetadata()              // 메타데이터 생성
```

**처리 흐름 (배치 기반)**:
```
1. sourceDir 스캔 → PHP 파일 목록
   ↓
2. 캐시 로드 → 변경된 파일 필터링
   ↓
3. 파일을 BATCH_SIZE만큼 분할
   ↓
4. 각 배치 처리:
   - 파일 파싱 → 심볼 추출
   - SQLite에 저장 (INSERT)
   - 메모리 해제 (GC)
   ↓
5. SQLite에서 심볼 로드 (스트리밍)
   ↓
6. JSON 내보내기 (index.json)
   ↓
7. 캐시 업데이트
```

**메모리 최적화**:
- BATCH_SIZE = 1 (파일당 즉시 저장)
- 스트리밍 쿼리로 대용량 심볼 처리
- 파일 > 1MB 후 즉시 GC
- WAL 모드로 동시성 향상

**출력 형식** (output/index.json):
```json
{
  "version": "1.0.0",
  "generated": "2026-03-16T07:30:00Z",
  "metadata": {
    "sourceDir": "work/mobile",
    "totalFiles": 245,
    "totalSymbols": 3421,
    "namespaces": ["App\\Models", "App\\Controllers", ...],
    "buildTime": 2543,
    "mode": "incremental"
  },
  "symbols": {
    "App\\Models\\User": {
      "type": "class",
      "file": "work/mobile/app/Models/User.php",
      "line": 12,
      "namespace": "App\\Models",
      "extends": "Model",
      "implements": ["Authenticatable"],
      "members": {
        "create": {
          "type": "method",
          "line": 45,
          "visibility": "public",
          "static": false
        },
        "update": {
          "type": "method",
          "line": 78,
          "visibility": "public",
          "static": false
        }
      }
    }
  },
  "fileMap": {
    "work/mobile/app/Models/User.php": {
      "hash": "abc123...",
      "mtime": 1710570000,
      "symbols": ["App\\Models\\User"]
    }
  }
}
```

### 4. IndexSearcher.js (검색 엔진 - JSON 기반)

**책임**: 고속 심볼 검색 (JSON 색인 사용)

```javascript
// 주요 기능
- loadIndex()                    // JSON 색인 로드 (메모리)
- search(query, options)         // 심볼 검색 (부분 일치)
- searchByType(type)             // 타입별 검색 (class, function, method)
- searchInNamespace(namespace)   // 네임스페이스 검색
- getSymbolInfo(fullName)        // 심볼 상세 정보
- findDefinition(symbol)         // 정의 위치 찾기 (파일, 라인)
- searchByFilename(filename)     // 파일명 기반 심볼 검색 (NEW!)
```

**검색 전략**:
- JSON 메모리 로드 (빠른 검색)
- 정확 일치 → 부분 일치 → 퍼지 매칭
- 파일명 기반 매칭 (확장자 제거, 경로 정규화)

**검색 알고리즘**:
```
1. 정확 일치 (FQCN)
   → "App\\Models\\User" → 1.0 점수

2. 부분 일치 (마지막 부분)
   → "User" → 0.8 점수

3. 네임스페이스 + 클래스명
   → "App\\User" → 0.7 점수

4. 퍼지 매칭 (Levenshtein 거리)
   → "UserMode" vs "UserModel" → 0.5 점수

5. 결과 정렬 (점수 내림차순)
```

**검색 예제**:
```javascript
// 정확 검색
searcher.search("App\\Models\\User")
→ { type: "class", file: "...", line: 12 }

// 부분 검색
searcher.search("User", { type: "class" })
→ [ { name: "App\\Models\\User", ... }, { name: "App\\Factories\\UserFactory", ... } ]

// 네임스페이스 검색
searcher.searchInNamespace("App\\Models")
→ [ { name: "User", ... }, { name: "Post", ... } ]
```

## 🔄 워크플로우

### 색인 생성 흐름

```
Build 명령어
    ↓
[force 플래그?] ──Yes→ 전체 재색인
    ↓ No
캐시 로드
    ↓
변경된 파일 필터링
    ↓
필터링된 파일 파싱
    ↓
기존 심볼 + 새 심볼 병합
    ↓
메타데이터 생성
    ↓
output/index.json 저장
    ↓
캐시 업데이트
    ↓
완료 (변경 파일 수, 추가/제거 심볼 수 출력)
```

### 검색 흐름

```
Search 쿼리
    ↓
색인 파일 로드 (메모리)
    ↓
정확 일치 확인
    ↓
정확 일치 없으면 부분 일치 검색
    ↓
결과 정렬 (점수)
    ↓
상위 N개 결과 반환
    ↓
파일 경로 + 라인 번호 포함
```

## 🎯 핵심 설계 결정

### 1. 정규식 기반 파싱
- **장점**: 의존성 없음, 빠름, 간단함
- **단점**: 복잡한 문법 처리 제한
- **대안**: PHP-Parser (의존성 추가, 느림)

### 2. 메모리 캐시
- **장점**: 빠른 검색 (<50ms)
- **단점**: 대규모 프로젝트에서 메모리 사용
- **최적화**: 색인 로드 시 간단한 캐시 구현

### 3. JSON 색인 형식
- **장점**: 텍스트 기반, 버전 관리 가능, 도구 호환성
- **단점**: 바이너리보다 느림 (해결: 메모리 로드)
- **대안**: MessagePack, Protocol Buffers

### 4. 증분 업데이트
- **기술**: 파일 해시 (SHA256) + mtime 추적
- **효율성**: 245개 파일 중 보통 5-10개만 재파싱

## 📊 성능 최적화

### 병목 분석

```
전체 시간: 2543ms (245개 파일)
├─ 파일 수집:       150ms (5.9%)
├─ 파싱:           1800ms (70.8%) ← 가장 많이 소요
├─ 병합:            300ms (11.8%)
├─ 저장:            200ms (7.9%)
└─ 캐시 업데이트:    93ms (3.7%)
```

### 최적화 기법

1. **병렬 파싱** (Node.js Worker Threads)
   - 8-core CPU: 70.8% → 15-20%로 단축 가능

2. **점진식 파싱**
   - 필요시 파일만 파싱 (Lazy loading)

3. **색인 압축**
   - JSON → gzip: 2.5MB → 300KB

4. **검색 인덱싱**
   - Trie 또는 B-tree로 검색 최적화

## 🔐 에러 처리

```javascript
// 파일 읽기 오류
try {
  const content = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  console.error(`[WARN] 파일 읽기 실패: ${filePath}`);
  continue; // 다음 파일 처리
}

// 파싱 오류
try {
  const symbols = PHPParser.parseFile(filePath);
} catch (err) {
  console.error(`[WARN] 파싱 실패: ${filePath} - ${err.message}`);
  continue;
}

// 색인 저장 오류
try {
  fs.writeFileSync(indexPath, JSON.stringify(index));
} catch (err) {
  console.error(`[ERROR] 색인 저장 실패: ${err.message}`);
  process.exit(1);
}
```

## 🧪 테스트 전략

```javascript
// PHPParser 테스트
- extractClasses()
- extractFunctions()
- extractMethods()
- getNamespace()

// IndexBuilder 테스트
- 증분 vs 전체 색인화
- 심볼 병합
- 메타데이터 생성

// IndexSearcher 테스트
- 정확 검색
- 부분 검색
- 네임스페이스 검색
- 결과 정렬

// 통합 테스트
- 색인 생성 → 검색 → 정의 위치 확인
```
