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
      const lines = content.split('\n');
      const cleanLines = cleanContent.split('\n');

      // 네임스페이스 추출
      const namespace = this.getNamespace(cleanContent);

      // 클래스 추출
      const classes = this.extractClasses(cleanContent, lines);

      // 인터페이스 추출
      const interfaces = this.extractInterfaces(cleanContent, lines);

      // Trait 추출
      const traits = this.extractTraits(cleanContent, lines);

      // 함수 추출 (클래스 밖의 함수만)
      const functions = this.extractFunctions(cleanContent, lines);

      // include/require 추적
      const includes = this.extractIncludes(content, lines);

      // 모든 심볼 합치기
      const symbols = [...classes, ...interfaces, ...traits, ...functions];

      return {
        file: filePath,
        namespace,
        symbols,
        includes,
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
    let match;

    while ((match = this.patterns.method.exec(content)) !== null) {
      const methodName = match[1];
      const line = this.getLineNumber(match.index, content);

      // 메서드가 클래스 내에 있는지 확인
      // (간단한 휴리스틱: 클래스 이후, 다음 클래스 이전)
      const beforeMatch = this.patterns.class.exec(content);
      if (beforeMatch && beforeMatch.index < match.index) {
        methods[methodName] = {
          type: 'method',
          line,
          visibility: this.extractVisibility(content, match.index)
        };
      }
    }

    this.patterns.method.lastIndex = 0;
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
}

module.exports = PHPParser;
