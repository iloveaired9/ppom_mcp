# PHP Index Generator - API 문서

## 📚 목차

1. [IndexCache API](#indexcache-api)
2. [PHPParser API](#phpparser-api)
3. [IndexBuilder API](#indexbuilder-api)
4. [IndexSearcher API](#indexsearcher-api)
5. [데이터 구조](#데이터-구조)
6. [에러 처리](#에러-처리)

---

## IndexCache API

파일 변경을 추적하고 캐시를 관리하는 모듈입니다.

### Class: IndexCache

```javascript
const IndexCache = require('./lib/IndexCache');
const cache = new IndexCache(cacheDir);
```

#### 메서드

##### `loadCache(): Promise<CacheData>`

기존 캐시 데이터를 로드합니다.

```javascript
const cache = await indexCache.loadCache();
console.log(cache.files['app/Models/User.php'].hash);
// → "abc123def456..."
```

**반환값** (PHP 5.6 예제):
```javascript
{
  files: {
    'work\\mobile\\include\\libraries\\notice_ad.class.php': {
      hash: '7984074247046b44d3f1c58ccff12f099af53073874a8e7f7ea107ee062b67e9',
      mtime: 1735194967000,
      symbols: ['include\\libraries\\notice_ad.class.php::NoticeAd']
    }
  },
  version: '1.0.0'
}
```

**주목:** FQCN은 `filename::symbol` 형식입니다 (네임스페이스 없음, PHP 5.6)

---

##### `saveCache(cacheData): Promise<void>`

캐시를 파일에 저장합니다.

```javascript
await indexCache.saveCache({
  files: { /* ... */ },
  version: '1.0.0'
});
```

---

##### `hasChanged(filePath): Promise<boolean>`

파일의 변경 여부를 확인합니다.

```javascript
const changed = await indexCache.hasChanged('app/Models/User.php');
if (changed) {
  console.log('파일이 변경되었습니다');
}
```

**로직**:
1. 파일 존재 확인 (mtime)
2. SHA256 해시 계산
3. 캐시의 해시와 비교

---

##### `updateHash(filePath, hash): Promise<void>`

파일 해시를 캐시에 업데이트합니다.

```javascript
const hash = crypto.createHash('sha256')
  .update(fileContent)
  .digest('hex');
await indexCache.updateHash('app/Models/User.php', hash);
```

---

##### `getPreviousSymbols(filePath): string[]`

이전에 저장된 심볼 목록을 반환합니다.

```javascript
const previousSymbols = cache.getPreviousSymbols('app/Models/User.php');
// → ['App\\Models\\User', 'App\\Models\\UserFactory']
```

---

##### `clearFile(filePath): Promise<void>`

특정 파일의 캐시 항목을 삭제합니다.

```javascript
await indexCache.clearFile('app/Models/User.php');
```

---

##### `clearAll(): Promise<void>`

전체 캐시를 초기화합니다.

```javascript
await indexCache.clearAll();
```

---

## PHPParser API

PHP 코드를 파싱하여 심볼을 추출합니다.

### Class: PHPParser

```javascript
const PHPParser = require('./lib/PHPParser');
const parser = new PHPParser(options);
```

#### 생성자 옵션

```javascript
{
  encoding: 'utf-8',        // 파일 인코딩
  strictMode: false,        // 엄격한 파싱
  maxLineLength: 10000,     // 최대 라인 길이
  commentRegex: /\/\/.*|\/\*[\s\S]*?\*\//  // 주석 패턴
}
```

#### 메서드

##### `parseFile(filePath): Promise<ParseResult>`

PHP 파일을 파싱하여 심볼을 추출합니다.

```javascript
const result = await parser.parseFile('app/Models/User.php');
console.log(result);
```

**반환값**:
```javascript
{
  file: 'app/Models/User.php',
  namespace: 'App\\Models',
  symbols: [
    {
      name: 'User',
      type: 'class',
      line: 12,
      extends: 'Model',
      implements: ['Authenticatable'],
      methods: [ /* ... */ ],
      properties: [ /* ... */ ]
    }
  ]
}
```

---

##### `extractClasses(content): Symbol[]`

문자열 콘텐츠에서 클래스 정의를 추출합니다.

```javascript
const classes = parser.extractClasses(fileContent);
// [
//   { name: 'User', type: 'class', line: 12, ... },
//   { name: 'Post', type: 'class', line: 150, ... }
// ]
```

**정규식**:
```regex
/(?:class|abstract\s+class|final\s+class)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\\,\s]+))?/gm
```

---

##### `extractFunctions(content): Symbol[]`

전역 함수 정의를 추출합니다.

```javascript
const functions = parser.extractFunctions(fileContent);
// [
//   { name: 'getUser', type: 'function', line: 5, ... }
// ]
```

---

##### `extractMethods(content, className): Symbol[]`

특정 클래스의 메서드를 추출합니다.

```javascript
const methods = parser.extractMethods(fileContent, 'User');
// [
//   { name: 'create', type: 'method', line: 45, visibility: 'public', ... },
//   { name: 'update', type: 'method', line: 78, visibility: 'public', ... }
// ]
```

---

##### `extractProperties(content, className): Symbol[]`

클래스의 속성을 추출합니다.

```javascript
const properties = parser.extractProperties(fileContent, 'User');
// [
//   { name: '$table', type: 'property', line: 20, visibility: 'protected', ... }
// ]
```

---

##### `extractInterfaces(content): Symbol[]`

인터페이스 정의를 추출합니다.

```javascript
const interfaces = parser.extractInterfaces(fileContent);
// [
//   { name: 'UserContract', type: 'interface', line: 8, ... }
// ]
```

---

##### `extractTraits(content): Symbol[]`

Trait 정의를 추출합니다.

```javascript
const traits = parser.extractTraits(fileContent);
// [
//   { name: 'Timestamps', type: 'trait', line: 5, ... }
// ]
```

---

##### `getNamespace(content): string`

파일의 네임스페이스를 추출합니다.

```javascript
const namespace = parser.getNamespace(fileContent);
// → 'App\\Models'
```

---

## IndexBuilder API

색인을 생성하고 관리합니다.

### Class: IndexBuilder

```javascript
const IndexBuilder = require('./lib/IndexBuilder');
const builder = new IndexBuilder(options);
```

#### 옵션

```javascript
{
  sourceDir: 'work/mobile',
  outputDir: 'plugins/php-index-generator/output',
  cacheDir: '.claude/php-index-cache',
  excludePatterns: ['vendor/*', 'tests/*'],
  includePatterns: ['app/**/*.php'],
  incremental: true,
  followSymlinks: false
}
```

#### 메서드

##### `build(options): Promise<BuildResult>`

색인을 생성합니다.

```javascript
const result = await builder.build({ force: true });
console.log(result);
```

**반환값**:
```javascript
{
  success: true,
  totalFiles: 245,
  processedFiles: 12,
  addedSymbols: 87,
  removedSymbols: 5,
  totalSymbols: 3421,
  buildTime: 2543,
  outputFile: 'plugins/php-index-generator/output/index.json'
}
```

---

##### `buildIncremental(): Promise<BuildResult>`

변경된 파일만 재색인합니다.

```javascript
const result = await builder.buildIncremental();
// 캐시에서 해시 확인, 변경된 파일만 처리
```

---

##### `collectFiles(sourceDir): Promise<string[]>`

PHP 파일 목록을 수집합니다.

```javascript
const files = await builder.collectFiles('work/mobile');
// [
//   'work/mobile/app/Models/User.php',
//   'work/mobile/app/Controllers/UserController.php',
//   ...
// ]
```

---

##### `processFile(filePath): Promise<Symbol[]>`

단일 파일을 처리하고 심볼을 추출합니다.

```javascript
const symbols = await builder.processFile('app/Models/User.php');
```

---

##### `mergeSymbols(allSymbols): Index`

여러 파일의 심볼을 병합합니다.

```javascript
const mergedIndex = builder.mergeSymbols(allSymbols);
// FQCN을 키로 하는 인덱스 생성
```

---

##### `writeIndex(index): Promise<void>`

색인을 JSON 파일로 저장합니다.

```javascript
await builder.writeIndex(indexData);
```

---

##### `generateMetadata(index): Metadata`

색인 메타데이터를 생성합니다.

```javascript
const metadata = builder.generateMetadata(index);
// {
//   totalFiles: 245,
//   totalSymbols: 3421,
//   namespaces: ['App\\Models', ...],
//   buildTime: 2543
// }
```

---

## IndexSearcher API

색인에서 심볼을 검색합니다.

### Class: IndexSearcher

```javascript
const IndexSearcher = require('./lib/IndexSearcher');
const searcher = new IndexSearcher(indexPath);
await searcher.loadIndex();
```

#### 메서드

##### `loadIndex(): Promise<void>`

색인 파일을 메모리로 로드합니다.

```javascript
await searcher.loadIndex();
```

---

##### `search(query, options): SearchResult[]`

심볼을 검색합니다.

```javascript
const results = await searcher.search('User', {
  type: 'class',
  limit: 10,
  exact: false
});

// [
//   {
//     name: 'App\\Models\\User',
//     type: 'class',
//     file: 'app/Models/User.php',
//     line: 12,
//     score: 1.0
//   },
//   ...
// ]
```

**옵션**:
```javascript
{
  type: 'class',           // 'class', 'method', 'function', 'property'
  limit: 10,               // 결과 개수 제한
  exact: false,            // 정확 일치 여부
  namespace: 'App\\Models' // 네임스페이스 필터
}
```

---

##### `searchByType(type): SearchResult[]`

타입별로 검색합니다.

```javascript
const classes = searcher.searchByType('class');
// 모든 클래스 반환
```

---

##### `searchInNamespace(namespace): SearchResult[]`

특정 네임스페이스 내에서 검색합니다.

```javascript
const symbols = searcher.searchInNamespace('App\\Models');
// App\Models 네임스페이스의 모든 심볼
```

---

##### `getSymbolInfo(fullName): SymbolInfo`

심볼의 상세 정보를 반환합니다.

```javascript
const info = searcher.getSymbolInfo('App\\Models\\User');
// {
//   name: 'User',
//   type: 'class',
//   file: 'app/Models/User.php',
//   line: 12,
//   extends: 'Model',
//   implements: ['Authenticatable'],
//   members: { ... }
// }
```

---

##### `findDefinition(symbol): Location`

심볼의 정의 위치를 찾습니다.

```javascript
const location = searcher.findDefinition('App\\Models\\User');
// {
//   file: 'app/Models/User.php',
//   line: 12,
//   column: 7
// }
```

---

##### `findReferences(symbol): Location[]`

심볼이 사용된 모든 위치를 찾습니다.

```javascript
const references = await searcher.findReferences('App\\Models\\User');
// [
//   { file: 'app/Controllers/UserController.php', line: 5 },
//   { file: 'app/Services/UserService.php', line: 15 }
// ]
```

---

## 데이터 구조

### Symbol

```javascript
{
  name: string,                    // 심볼명
  type: 'class'|'method'|...,      // 타입
  file: string,                    // 파일 경로
  line: number,                    // 라인 번호
  column?: number,                 // 열 번호
  namespace?: string,              // 네임스페이스
  extends?: string,                // 상속 클래스
  implements?: string[],           // 구현 인터페이스
  visibility?: 'public'|'private'|'protected', // 접근성
  static?: boolean,                // 정적 여부
  abstract?: boolean,              // 추상 여부
  methods?: Symbol[],              // 메서드 (클래스)
  properties?: Symbol[]            // 속성 (클래스)
}
```

### Index

```javascript
{
  version: '1.0.0',
  generated: '2026-03-16T07:30:00Z',
  metadata: {
    sourceDir: string,
    totalFiles: number,
    totalSymbols: number,
    namespaces: string[],
    buildTime: number,
    mode: 'full'|'incremental'
  },
  symbols: {
    [fullName: string]: Symbol
  },
  fileMap: {
    [filePath: string]: {
      hash: string,
      mtime: number,
      symbols: string[]
    }
  }
}
```

### SearchResult

```javascript
{
  name: string,          // 심볼명
  type: string,          // 타입
  file: string,          // 파일 경로
  line: number,          // 라인 번호
  namespace: string,     // 네임스페이스
  score: number,         // 일치 점수 (0-1)
  preview?: string       // 코드 미리보기
}
```

---

## 에러 처리

### 표준 에러 클래스

```javascript
class PHPIndexError extends Error {
  constructor(message, code, details) {
    this.code = code;
    this.details = details;
  }
}
```

### 에러 코드

| 코드 | 설명 | 대응 방법 |
|------|------|----------|
| `ENOENT` | 파일/디렉토리 없음 | 경로 확인 |
| `EACCES` | 접근 권한 없음 | 권한 확인 |
| `EPARSE` | 파싱 오류 | PHP 문법 확인 |
| `ECACHE` | 캐시 오류 | 캐시 재생성 |
| `EINDEX` | 색인 오류 | 색인 재생성 |

### 사용 예제

```javascript
try {
  await builder.build();
} catch (error) {
  if (error.code === 'EPARSE') {
    console.error('파싱 오류:', error.details.file, error.details.line);
  } else if (error.code === 'ECACHE') {
    console.error('캐시 오류: 캐시 초기화 후 재시도');
    await indexCache.clearAll();
  } else {
    throw error;
  }
}
```

---

## 실제 사용 예제

### 예제 1: 전체 워크플로우

```javascript
const IndexCache = require('./lib/IndexCache');
const IndexBuilder = require('./lib/IndexBuilder');
const IndexSearcher = require('./lib/IndexSearcher');

async function fullWorkflow() {
  // 1. 캐시 로드
  const cache = new IndexCache('.claude/php-index-cache');
  await cache.loadCache();

  // 2. 색인 빌더 생성
  const builder = new IndexBuilder({
    sourceDir: 'work/mobile',
    outputDir: 'plugins/php-index-generator/output',
    cacheDir: '.claude/php-index-cache'
  });

  // 3. 증분 색인 생성 (변경된 파일만 처리)
  const buildResult = await builder.build({ force: false });
  console.log(`
    ✅ 색인 생성 완료
    • 처리 파일: ${buildResult.processedFiles}개
    • 총 심볼: ${buildResult.totalSymbols}개
    • 빌드 시간: ${buildResult.buildTime}ms
  `);

  // 4. 검색 엔진 초기화
  const searcher = new IndexSearcher(buildResult.outputFile);
  await searcher.loadIndex();

  // 5. NoticeAd 클래스 검색 (실제 예제)
  const results = searcher.search('NoticeAd', { type: 'class' });
  console.log(`🔍 검색 결과: ${results.length}개`);

  // 6. 상세 정보
  if (results.length > 0) {
    const info = searcher.getSymbolInfo(results[0].name);
    console.log(`
      📄 파일: ${info.file}
      📍 라인: ${info.line}
      🔗 FQCN: ${results[0].name}
    `);
  }
}

fullWorkflow().catch(console.error);
```

### 예제 2: 증분 색인화

```javascript
async function incrementalBuild() {
  const builder = new IndexBuilder(options);

  while (true) {
    const result = await builder.buildIncremental();
    console.log(`처리: ${result.processedFiles}개 파일`);

    // 1분마다 확인
    await new Promise(r => setTimeout(r, 60000));
  }
}
```

### 예제 3: 실시간 검색

```javascript
class LiveSearch {
  constructor(indexPath) {
    this.searcher = new IndexSearcher(indexPath);
    this.searcher.loadIndex();
  }

  search(query) {
    return this.searcher.search(query, {
      limit: 5,
      exact: false
    });
  }

  gotoDefinition(symbol) {
    return this.searcher.findDefinition(symbol);
  }
}

const liveSearch = new LiveSearch('output/index.json');
liveSearch.search('User').then(console.log);
```

---

## 성능 최적화 팁

### 1. 색인 로딩 시간 단축

```javascript
// 인덱싱된 검색 사용
const results = searcher.search('User');  // 빠름 (~50ms)

// 파일 시스템 검색 피함
const files = await fs.readdir('work/mobile');  // 느림
```

### 2. 메모리 사용량 감소

```javascript
// 대규모 색인은 프로세스 분리
const worker = new Worker('./search-worker.js');
worker.postMessage({ query: 'User' });
```

### 3. 색인 생성 속도 향상

```javascript
// 병렬 파싱 (향후 구현)
const workers = [];
for (let i = 0; i < 4; i++) {
  workers.push(new Worker('./parse-worker.js'));
}
```

---

## PHP 5.6 특화 기능

### FQCN 형식

PHP 5.6 코드에는 네임스페이스가 없으므로, FQCN은 `filename::symbol` 형식입니다:

```javascript
// 예제
'include\\libraries\\notice_ad.class.php::NoticeAd'
'api\\gcm\\etc_alarm.php::send_header'
'new\\bbs_notice.php::noticeAd'
```

### 종료 태그 없는 파일 처리

PHP 파일이 종료 태그 (`?>`)로 끝나지 않아도 정상 처리됩니다:

```php
<?php
// 파일 내용...
class NoticeAd { ... }
// 종료 태그 없음 (PHP 권장 사항)
```

### 단기 기능

- ✅ 짧은 태그 `<?: ... ?>` 지원
- ✅ `include`/`require` 의존성 추적
- ✅ 주석 처리 (HTML `<!-- -->`, PHP `/* */`, `//`)
- ✅ 메서드/속성의 접근성 감지 (public/private/protected)
