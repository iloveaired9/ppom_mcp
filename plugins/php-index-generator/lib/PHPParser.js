#!/usr/bin/env node

/**
 * PHPParser.js
 * 정규식 기반 PHP 코드 파싱 (PHP 5.6 특화)
 *
 * 특징:
 * - 짧은 태그 <? 지원
 * - 네임스페이스 없는 코드 (PHP 5.6)
 * - HTML 섞인 파일 처리
 * - include/require 추적
 */

const fs = require('fs');

class PHPParser {
  constructor(options = {}) {
    this.options = {
      encoding: 'utf-8',
      strictMode: false,
      maxLineLength: 10000,
      ...options
    };

    // PHP 5.6 특화 정규식
    this.patterns = {
      // 네임스페이스 (PHP 5.6은 거의 없음)
      namespace: /namespace\s+([\w\\]+);/gm,

      // 클래스 정의 (abstract, final, extends, implements)
      class: /(?:^|\s)(?:class|abstract\s+class|final\s+class)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s\\]+))?/gm,

      // 인터페이스
      interface: /(?:^|\s)interface\s+(\w+)(?:\s+extends\s+([\w,\s\\]+))?/gm,

      // Trait
      trait: /(?:^|\s)trait\s+(\w+)/gm,

      // 전역 함수 (클래스 밖)
      function: /(?:^|\s)function\s+(\w+)\s*\(/gm,

      // 메서드 (public/protected/private, static 포함)
      method: /(?:public|protected|private)\s+(?:static\s+)?function\s+(\w+)\s*\(/gm,

      // 속성 (public/protected/private $var)
      property: /(?:public|protected|private)\s+(?:static\s+)?\$(\w+)/gm,

      // 상수 (class const, global const)
      const: /const\s+(\w+)\s*=/gm,

      // include/require (의존성 추적)
      include: /(?:include|require)(?:_once)?\s+(['\"]?)(.+?)\1/gm,

      // 함수 매개변수
      functionParams: /function\s+\w+\s*\((.*?)\)/,

      // 메서드 가시성
      visibility: /(?:public|protected|private)/
    };
  }

  /**
   * PHP 파일을 파싱하여 심볼을 추출합니다.
   * @param {string} filePath - PHP 파일 경로
   * @returns {Promise<object>} 파싱 결과
   */
  async parseFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, this.options.encoding);
      return this.parseContent(content, filePath);
    } catch (error) {
      console.warn(`[WARN] 파일 파싱 실패 (${filePath}): ${error.message}`);
      return {
        file: filePath,
        namespace: '',
        symbols: [],
        includes: [],
        error: error.message
      };
    }
  }

  /**
   * PHP 코드 내용을 파싱합니다.
   * @param {string} content - PHP 코드 내용
   * @param {string} filePath - 파일 경로 (메타데이터용)
   * @returns {object} 파싱 결과
   */
  parseContent(content, filePath = '') {
    try {
      // HTML과 PHP 분리 (HTML 부분 제거)
      const phpContent = this.stripHTMLCode(content);

      // 주석 제거
      const cleanContent = this.stripComments(phpContent);

      // 라인별로 처리하기 위해 라인 번호 추적
      // 원본 content를 기준으로 라인 번호 계산 (정확한 파일 라인)
      const lines = content.split('\n');
      const cleanLines = cleanContent.split('\n');

      // 네임스페이스 추출
      const namespace = this.getNamespace(cleanContent);

      // 클래스 추출
      // Note: Use phpContent (not cleanContent) for accurate line numbers!
      // cleanContent has comments removed, which affects character positions
      const classes = this.extractClasses(phpContent, lines);

      // 인터페이스 추출
      // Note: Use phpContent (not cleanContent) for accurate line numbers!
      const interfaces = this.extractInterfaces(phpContent, lines);

      // Trait 추출
      // Note: Use phpContent (not cleanContent) for accurate line numbers!
      const traits = this.extractTraits(phpContent, lines);

      // 함수 추출 (클래스 밖의 함수만)
      // Note: Use phpContent (not cleanContent) for accurate line numbers!
      // cleanContent has comments removed, which affects character positions
      const functions = this.extractFunctions(phpContent, lines);

      // include/require 추적
      const includes = this.extractIncludes(content, lines);

      // 함수 호출 추출 (파일 레벨)
      const functionCalls = this.extractFunctionCalls(cleanContent);

      // 클래스 메서드들을 별도의 심볼로 추출
      const methods = [];
      for (const classSymbol of classes) {
        if (classSymbol.methods) {
          for (const [methodName, methodInfo] of Object.entries(classSymbol.methods)) {
            methods.push({
              name: methodName,
              type: 'method',
              line: methodInfo.line,
              visibility: methodInfo.visibility,
              className: classSymbol.name
            });
          }
        }
      }

      // 인터페이스 메서드들도 추출
      const interfaceMethods = [];
      for (const interfaceSymbol of interfaces) {
        if (interfaceSymbol.methods) {
          for (const [methodName, methodInfo] of Object.entries(interfaceSymbol.methods)) {
            interfaceMethods.push({
              name: methodName,
              type: 'method',
              line: methodInfo.line,
              interfaceName: interfaceSymbol.name
            });
          }
        }
      }

      // 모든 심볼 합치기
      const symbols = [...classes, ...interfaces, ...traits, ...functions, ...methods, ...interfaceMethods];

      // 각 심볼별 호출 관계 분석 (함수 레벨)
      const symbolCallMap = this.buildSymbolCallMap(cleanContent, symbols);

      return {
        file: filePath,
        namespace,
        symbols,
        includes,
        symbolCallMap, // 새로 추가: 심볼별 호출 정보
        dependencies: {
          functionCalls,
          classDependencies: this.extractClassDependencies(cleanContent),
          fileDependencies: includes
        },
        error: null
      };
    } catch (error) {
      console.warn(`[WARN] 콘텐츠 파싱 실패: ${error.message}`);
      return {
        file: filePath,
        namespace: '',
        symbols: [],
        includes: [],
        error: error.message
      };
    }
  }

  /**
   * 네임스페이스를 추출합니다.
   * @param {string} content - PHP 코드
   * @returns {string} 네임스페이스 (없으면 빈 문자열)
   */
  getNamespace(content) {
    const match = this.patterns.namespace.exec(content);
    this.patterns.namespace.lastIndex = 0; // 정규식 상태 초기화
    return match ? match[1] : '';
  }

  /**
   * 클래스 정의를 추출합니다.
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열
   * @returns {array} 클래스 배열
   */
  extractClasses(content, lines) {
    const classes = [];
    let match;

    while ((match = this.patterns.class.exec(content)) !== null) {
      const className = match[1];
      const extends_ = match[2] || null;
      const implements_ = match[3] ? match[3].split(',').map(i => i.trim()) : null;

      // 라인 번호 계산 (내용에서의 위치로부터)
      const line = this.getLineNumber(match.index, content, lines);

      const classSymbol = {
        name: className,
        type: 'class',
        line,
        namespace: '',
        extends: extends_,
        implements: implements_,
        methods: this.extractMethodsForClass(content, className, line),
        properties: this.extractPropertiesForClass(content, className)
      };

      classes.push(classSymbol);
    }

    this.patterns.class.lastIndex = 0;
    return classes;
  }

  /**
   * 특정 클래스의 메서드를 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} className - 클래스 이름
   * @param {number} classLine - 클래스 시작 라인
   * @returns {object} 메서드 객체
   */
  extractMethodsForClass(content, className, classLine) {
    const methods = {};
    // 별도의 정규식 인스턴스 사용 (공유 패턴 lastIndex 충돌 방지)
    const methodRegex = /(?:public|protected|private)\s+(?:static\s+)?function\s+(\w+)\s*\(/gm;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      const line = this.getLineNumber(match.index, content);

      // 클래스 시작 라인 이후의 메서드만 포함
      if (line >= classLine) {
        methods[methodName] = {
          type: 'method',
          line,
          visibility: this.extractVisibility(content, match.index)
        };
      }
    }

    return methods;
  }

  /**
   * 특정 클래스의 속성을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} className - 클래스 이름
   * @returns {array} 속성 배열
   */
  extractPropertiesForClass(content, className) {
    const properties = [];
    let match;

    while ((match = this.patterns.property.exec(content)) !== null) {
      const propertyName = match[1];
      const line = this.getLineNumber(match.index, content);

      properties.push({
        name: propertyName,
        type: 'property',
        line,
        visibility: this.extractVisibility(content, match.index)
      });
    }

    this.patterns.property.lastIndex = 0;
    return properties;
  }

  /**
   * 전역 함수를 추출합니다 (클래스 밖).
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열
   * @returns {array} 함수 배열
   */
  extractFunctions(content, lines) {
    const functions = [];
    let match;

    while ((match = this.patterns.function.exec(content)) !== null) {
      const functionName = match[1];
      const line = this.getLineNumber(match.index, content, lines);

      const functionSymbol = {
        name: functionName,
        type: 'function',
        line,
        params: [] // 매개변수는 필요시 추출 가능
      };

      functions.push(functionSymbol);
    }

    this.patterns.function.lastIndex = 0;
    return functions;
  }

  /**
   * 함수 본문을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} functionName - 함수명
   * @returns {string} 함수 본문 (중괄호 포함)
   */
  extractFunctionBody(content, functionName) {
    // function functionName( ... ) { ... }
    // 단어 경계를 추가하여 autolink5 와 autolink5_callback 구분
    const pattern = new RegExp(
      `function\\s+${functionName}\\b\\s*\\([^)]*\\)\\s*\\{`,
      'i'
    );

    const match = pattern.exec(content);
    if (!match) return '';

    let braceCount = 0;
    let startIndex = match.index + match[0].length - 1; // 시작 중괄호 위치
    let endIndex = startIndex;
    let inString = false;
    let stringChar = '';

    // 중괄호 매칭으로 함수 본문 끝 찾기
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      // 문자열 처리
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    return content.substring(startIndex, endIndex + 1);
  }

  /**
   * 메서드 본문을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} methodName - 메서드명
   * @param {string} className - 클래스명 (메서드가 속한 클래스)
   * @returns {string} 메서드 본문 (중괄호 포함)
   */
  extractMethodBody(content, methodName, className = null) {
    // public/protected/private function methodName( ... ) { ... }
    // 단어 경계를 추가하여 메서드 이름 정확히 매칭
    const pattern = new RegExp(
      `(?:public|protected|private)?\\s+(?:static\\s+)?function\\s+${methodName}\\b\\s*\\([^)]*\\)\\s*\\{`,
      'i'
    );

    const match = pattern.exec(content);
    if (!match) return '';

    let braceCount = 0;
    let startIndex = match.index + match[0].length - 1; // 시작 중괄호 위치
    let endIndex = startIndex;
    let inString = false;
    let stringChar = '';

    // 중괄호 매칭으로 메서드 본문 끝 찾기
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      // 문자열 처리
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    return content.substring(startIndex, endIndex + 1);
  }

  /**
   * 클래스 본문을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} className - 클래스명
   * @param {number} maxLines - 최대 라인 수 (기본값: 200, 매우 큰 클래스의 경우)
   * @returns {string} 클래스 본문 (중괄호 포함)
   */
  extractClassBody(content, className, maxLines = 200) {
    // class ClassName { ... }
    // 단어 경계를 추가하여 클래스 이름 정확히 매칭
    const pattern = new RegExp(
      `(?:abstract\\s+)?(?:final\\s+)?class\\s+${className}\\b\\s*(?:extends\\s+\\w+)?\\s*(?:implements\\s+[\\w,\\s]+)?\\s*\\{`,
      'i'
    );

    const match = pattern.exec(content);
    if (!match) return '';

    let braceCount = 0;
    let startIndex = match.index + match[0].length - 1; // 시작 중괄호 위치
    let endIndex = startIndex;
    let inString = false;
    let stringChar = '';
    let lineCount = 0;

    // 중괄호 매칭으로 클래스 본문 끝 찾기
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      // 라인 수 확인
      if (char === '\n') {
        lineCount++;
        if (lineCount > maxLines) {
          // 최대 라인을 초과하면 여기서 끝냄
          endIndex = i;
          break;
        }
      }

      // 문자열 처리
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      } else if (inString && char === stringChar && content[i - 1] !== '\\') {
        inString = false;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    return content.substring(startIndex, endIndex + 1);
  }

  /**
   * 라인 범위 기반으로 코드를 추출합니다.
   * @param {string} content - PHP 코드
   * @param {number} startLine - 시작 라인 (1부터 시작)
   * @param {number} endLine - 종료 라인 (포함)
   * @returns {string} 추출된 코드
   */
  extractCodeRange(content, startLine, endLine) {
    const lines = content.split('\n');

    // 1-indexed를 0-indexed로 변환
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, endLine);

    return lines.slice(start, end).join('\n');
  }

  /**
   * PHP 코드의 함수 호출을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {string} sourceFunction - 어느 함수에서 호출되는지 (선택사항)
   * @returns {array} 함수 호출 배열
   */
  extractFunctionCalls(content, sourceFunction = null) {
    const calls = [];
    const seen = new Set();

    // 1. 일반 함수 호출: functionName(
    const functionCallPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    const controlKeywords = new Set(['if', 'for', 'while', 'foreach', 'switch', 'catch', 'elseif']);

    let match;
    while ((match = functionCallPattern.exec(content)) !== null) {
      const functionName = match[1];

      // 제어문 제외
      if (controlKeywords.has(functionName)) {
        continue;
      }

      // 내장 함수 감지 (대부분의 PHP 내장 함수)
      const isBuiltIn = this.isBuiltInFunction(functionName);

      const key = `function:${functionName}`;
      if (!seen.has(key)) {
        calls.push({
          name: functionName,
          type: 'function',
          builtin: isBuiltIn,
          source: 'direct'
        });
        seen.add(key);
      }
    }

    // 2. 메서드 호출: $obj->method(
    const methodCallPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*)->([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    while ((match = methodCallPattern.exec(content)) !== null) {
      const methodName = match[2];
      const key = `method:${methodName}`;

      if (!seen.has(key)) {
        calls.push({
          name: methodName,
          type: 'method',
          builtin: false,
          source: 'instance'
        });
        seen.add(key);
      }
    }

    // 3. 정적 메서드 호출: ClassName::method(
    const staticMethodPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*::\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    while ((match = staticMethodPattern.exec(content)) !== null) {
      const className = match[1];
      const methodName = match[2];
      const key = `static:${className}::${methodName}`;

      if (!seen.has(key)) {
        calls.push({
          name: methodName,
          class: className,
          type: 'static_method',
          builtin: false,
          source: 'static'
        });
        seen.add(key);
      }
    }

    return calls;
  }

  /**
   * 내장 PHP 함수인지 확인합니다.
   * @param {string} functionName - 함수명
   * @returns {boolean} 내장 함수 여부
   */
  isBuiltInFunction(functionName) {
    // PHP 5.6 주요 내장 함수들
    const builtins = new Set([
      'echo', 'print', 'var_dump', 'print_r', 'exit', 'die',
      'strlen', 'substr', 'strpos', 'str_replace', 'trim', 'explode', 'implode',
      'array_push', 'array_pop', 'array_shift', 'array_unshift', 'array_merge', 'array_keys', 'array_values',
      'count', 'sizeof', 'in_array', 'array_key_exists',
      'json_encode', 'json_decode', 'serialize', 'unserialize',
      'file_get_contents', 'file_put_contents', 'fopen', 'fclose', 'fread', 'fwrite',
      'mkdir', 'rmdir', 'unlink', 'file_exists', 'is_dir', 'is_file',
      'isset', 'empty', 'is_null', 'is_array', 'is_string', 'is_int', 'is_float', 'is_bool',
      'intval', 'floatval', 'strval', 'boolval',
      'date', 'time', 'strtotime', 'mktime',
      'preg_match', 'preg_match_all', 'preg_replace', 'preg_split',
      'strtoupper', 'strtolower', 'ucfirst', 'lcfirst', 'ucwords',
      'htmlspecialchars', 'htmlentities', 'urlencode', 'urldecode', 'base64_encode', 'base64_decode',
      'md5', 'sha1', 'hash',
      'mysql_query', 'mysql_fetch_array', 'mysql_fetch_assoc', 'mysql_fetch_row',
      'mysqli_query', 'mysqli_fetch_array', 'mysqli_fetch_assoc',
      'define', 'defined', 'constant',
      'class_exists', 'function_exists', 'method_exists', 'property_exists',
      'get_class', 'get_parent_class', 'get_class_methods', 'get_class_vars',
      'error_log', 'trigger_error', 'set_error_handler', 'restore_error_handler',
      'header', 'headers_sent', 'http_response_code',
      'session_start', 'session_destroy', 'session_id',
      'header_remove', 'setcookie', 'setrawcookie'
    ]);

    return builtins.has(functionName);
  }

  /**
   * 인터페이스 정의를 추출합니다.
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열
   * @returns {array} 인터페이스 배열
   */
  extractInterfaces(content, lines) {
    const interfaces = [];
    let match;

    while ((match = this.patterns.interface.exec(content)) !== null) {
      const interfaceName = match[1];
      const extends_ = match[2] ? match[2].split(',').map(i => i.trim()) : null;
      const line = this.getLineNumber(match.index, content, lines);

      interfaces.push({
        name: interfaceName,
        type: 'interface',
        line,
        extends: extends_
      });
    }

    this.patterns.interface.lastIndex = 0;
    return interfaces;
  }

  /**
   * Trait 정의를 추출합니다.
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열
   * @returns {array} Trait 배열
   */
  extractTraits(content, lines) {
    const traits = [];
    let match;

    while ((match = this.patterns.trait.exec(content)) !== null) {
      const traitName = match[1];
      const line = this.getLineNumber(match.index, content, lines);

      traits.push({
        name: traitName,
        type: 'trait',
        line
      });
    }

    this.patterns.trait.lastIndex = 0;
    return traits;
  }

  /**
   * include/require 문을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열
   * @returns {array} include 배열
   */
  extractIncludes(content, lines) {
    const includes = [];
    let match;
    const includeRegex = /(?:include|require)(?:_once)?\s+(['\"]?)(.+?)\1/gm;

    while ((match = includeRegex.exec(content)) !== null) {
      const type = content.substring(match.index, match.index + 10).includes('require') ? 'require' : 'include';
      const path = match[2];
      const line = this.getLineNumber(match.index, content, lines);

      includes.push({
        type,
        path,
        line
      });
    }

    return includes;
  }

  /**
   * 주석을 제거합니다.
   * @param {string} content - PHP 코드
   * @returns {string} 주석이 제거된 코드
   */
  stripComments(content) {
    let result = content;

    // /* */ 주석 제거
    result = result.replace(/\/\*[\s\S]*?\*\//gm, '');

    // // 주석 제거
    result = result.replace(/\/\/.*$/gm, '');

    // # 주석 제거
    result = result.replace(/#.*$/gm, '');

    return result;
  }

  /**
   * HTML 코드를 제거하고 PHP만 추출합니다.
   * @param {string} content - 혼합 코드 (PHP + HTML)
   * @returns {string} PHP만 추출한 코드
   */
  stripHTMLCode(content) {
    // PHP 5.6: 종료 태그가 없는 파일도 처리
    // 패턴 1: <? ... ?> (종료 태그 있음)
    // 패턴 2: <? ... (파일 끝까지, 종료 태그 없음)

    const phpBlocks = [];

    // 먼저 정상적인 PHP 블록 (<? ... ?>) 추출
    const phpRegexWithClose = /<\?(?:php)?([\s\S]*?)\?>/gm;
    let match;
    const processedRanges = []; // 처리된 범위 추적

    while ((match = phpRegexWithClose.exec(content)) !== null) {
      phpBlocks.push(match[1] || match[0]);
      processedRanges.push({ start: match.index, end: match.index + match[0].length });
    }

    // 다음으로 종료 태그 없이 시작하는 PHP 블록 추출
    const phpRegexNoClose = /<\?(?:php)?([\s\S]*?)$/gm;
    const lastPhpStart = content.lastIndexOf('<?');

    if (lastPhpStart !== -1) {
      const isInProcessedRange = processedRanges.some(range =>
        lastPhpStart >= range.start && lastPhpStart < range.end
      );

      if (!isInProcessedRange) {
        // 종료 태그 없는 PHP 블록 (파일 끝까지)
        const phpStartMatch = content.substring(lastPhpStart).match(/^<\?(?:php)?([\s\S]*)$/);
        if (phpStartMatch && phpStartMatch[1]) {
          phpBlocks.push(phpStartMatch[1]);
        }
      }
    }

    return phpBlocks.join('\n');
  }

  /**
   * 주어진 위치의 라인 번호를 계산합니다.
   * @param {number} index - 콘텐츠 내 인덱스
   * @param {string} content - PHP 코드
   * @param {array} lines - 원본 라인 배열 (선택사항)
   * @returns {number} 라인 번호 (1부터 시작)
   */
  getLineNumber(index, content, lines) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 지정된 위치의 가시성(public/protected/private)을 추출합니다.
   * @param {string} content - PHP 코드
   * @param {number} index - 매치 인덱스
   * @returns {string} 가시성
   */
  extractVisibility(content, index) {
    const before = content.substring(Math.max(0, index - 50), index);
    const match = before.match(/(public|protected|private)\s+/);
    return match ? match[1] : 'public'; // 기본값: public
  }

  /**
   * 각 심볼별 호출 관계 맵을 생성합니다.
   * @param {string} content - PHP 코드
   * @param {array} symbols - 추출된 심볼 배열
   * @returns {object} 심볼명 → 호출 정보 매핑
   */
  buildSymbolCallMap(content, symbols) {
    const callMap = {};

    // 함수들에 대해
    for (const symbol of symbols) {
      if (symbol.type === 'function') {
        // 함수 본문 추출
        const body = this.extractFunctionBody(content, symbol.name);
        if (body) {
          // 본문에서 호출되는 함수들 추출
          const calls = this.extractFunctionCalls(body);
          callMap[symbol.name] = {
            type: 'function',
            calls: calls.filter(c => !c.builtin), // 내장 함수 제외
            allCalls: calls
          };
        }
      } else if (symbol.type === 'class' && symbol.methods) {
        // 클래스의 각 메서드에 대해
        callMap[symbol.name] = {
          type: 'class',
          methods: {}
        };

        for (const methodName of Object.keys(symbol.methods)) {
          // 메서드 본문 추출
          const methodPattern = new RegExp(
            `(?:public|protected|private)?\\s+(?:static\\s+)?function\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{`,
            'i'
          );
          const match = methodPattern.exec(content);

          if (match) {
            let braceCount = 0;
            let startIndex = match.index + match[0].length - 1;
            let endIndex = startIndex;
            let inString = false;
            let stringChar = '';

            for (let i = startIndex; i < content.length; i++) {
              const char = content[i];

              if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
                continue;
              } else if (inString && char === stringChar && content[i - 1] !== '\\') {
                inString = false;
                continue;
              }

              if (!inString) {
                if (char === '{') {
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endIndex = i;
                    break;
                  }
                }
              }
            }

            const methodBody = content.substring(startIndex, endIndex + 1);
            const calls = this.extractFunctionCalls(methodBody);

            callMap[symbol.name].methods[methodName] = {
              calls: calls.filter(c => !c.builtin),
              allCalls: calls
            };
          }
        }
      }
    }

    return callMap;
  }

  /**
   * 클래스 간의 의존성을 추출합니다 (상속, 구현).
   * @param {string} content - PHP 코드
   * @returns {array} 클래스 의존성 배열
   */
  extractClassDependencies(content) {
    const dependencies = [];
    const seen = new Set();

    // extends 관계
    const extendsPattern = /class\s+(\w+)\s+extends\s+(\w+)/g;
    let match;

    while ((match = extendsPattern.exec(content)) !== null) {
      const childClass = match[1];
      const parentClass = match[2];
      const key = `extends:${childClass}:${parentClass}`;

      if (!seen.has(key)) {
        dependencies.push({
          type: 'extends',
          class: childClass,
          parent: parentClass
        });
        seen.add(key);
      }
    }

    // implements 관계
    const implementsPattern = /class\s+(\w+)\s+(?:extends\s+\w+)?\s+implements\s+([\w,\s]+)/g;
    while ((match = implementsPattern.exec(content)) !== null) {
      const className = match[1];
      const interfaces = match[2].split(',').map(i => i.trim());

      for (const iface of interfaces) {
        const key = `implements:${className}:${iface}`;
        if (!seen.has(key)) {
          dependencies.push({
            type: 'implements',
            class: className,
            interface: iface
          });
          seen.add(key);
        }
      }
    }

    return dependencies;
  }
}

module.exports = PHPParser;
