#!/usr/bin/env node

/**
 * PHP Code Migrator Plugin
 * PHP 5.6 레거시 코드를 현대적인 Static 메소드 클래스로 자동 변환
 * 기반: docs/02-design/PHP_LEGACY_CONVERTER.md
 */

const fs = require('fs');
const path = require('path');

class PHPCodeMigrator {
  constructor(options = {}) {
    this.options = {
      preserveEncoding: options.preserveEncoding !== false,
      generateDocstring: options.generateDocstring !== false,
      phpNamespacePrefix: options.phpNamespacePrefix || 'App\\Legacy',
      ...options
    };
  }

  /**
   * 파일 인코딩 감지
   * BOM 확인 → UTF-8 유효성 검증 → EUC-KR 시도
   */
  detectEncoding(buffer) {
    const iconv = require('iconv-lite');

    // UTF-16 BE BOM
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      return 'utf16be';
    }
    // UTF-16 LE BOM
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf16le';
    }
    // UTF-8 BOM
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf8';
    }

    // UTF-8 유효성 검증
    try {
      const text = buffer.toString('utf8');
      const validUtf8 = /^[\x00-\x7F]*$|^([\x00-\x7F]|[\xC0-\xFF][\x80-\xBF])*$/.test(text);
      if (validUtf8) return 'utf8';
    } catch (e) {
      // pass
    }

    // EUC-KR 시도 (한글 파일 일반적)
    try {
      const euckrText = iconv.decode(buffer, 'euc-kr');
      if (euckrText && euckrText.length > 0) {
        return 'euc-kr';
      }
    } catch (e) {
      // pass
    }

    return 'utf8'; // 기본값
  }

  /**
   * 함수명 → 클래스명 변환
   * 규칙: get_user_by_id → UserGetter
   */
  generateClassName(functionName) {
    const parts = functionName.split('_');

    if (parts.length === 0) return 'Legacy';

    // is_* 함수 → *Validator
    if (parts[0] === 'is') {
      const subjectParts = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return subjectParts.join('') + 'Validator';
    }

    // get_* 함수 → *Getter
    if (parts[0] === 'get') {
      const subjectParts = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return subjectParts.join('') + 'Getter';
    }

    // set_* 함수 → *Setter
    if (parts[0] === 'set') {
      const subjectParts = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return subjectParts.join('') + 'Setter';
    }

    // total_* 함수 → *Total
    if (parts[0] === 'total') {
      const subjectParts = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return subjectParts.join('') + 'Total';
    }

    // plus_* 함수 → *Plus
    if (parts[0] === 'plus') {
      const subjectParts = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return subjectParts.join('') + 'Plus';
    }

    // 일반: 모든 단어를 PascalCase로
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }

  /**
   * PHP 파일에서 함수 추출
   * 함수 본체까지 포함
   */
  extractFunctions(phpCode) {
    const functions = [];
    const functionRegex = /function\s+(\w+)\s*\((.*?)\)\s*{/g;

    let match;
    while ((match = functionRegex.exec(phpCode)) !== null) {
      const functionName = match[1];
      const params = match[2];
      const startPos = match.index + match[0].length - 1;

      // 중괄호 매칭으로 함수 본체 추출
      let braceCount = 1;
      let bodyEndPos = startPos;
      let inString = false;
      let stringChar = '';
      let inLineComment = false;
      let inBlockComment = false;

      for (let i = startPos + 1; i < phpCode.length; i++) {
        const char = phpCode[i];
        const prevChar = i > 0 ? phpCode[i - 1] : '';

        // 라인 주석 처리
        if (!inString && !inBlockComment && char === '/' && phpCode[i + 1] === '/') {
          inLineComment = true;
          continue;
        }
        if (inLineComment && char === '\n') {
          inLineComment = false;
          continue;
        }
        if (inLineComment) continue;

        // 블록 주석 처리
        if (!inString && char === '/' && phpCode[i + 1] === '*') {
          inBlockComment = true;
          continue;
        }
        if (inBlockComment && char === '*' && phpCode[i + 1] === '/') {
          inBlockComment = false;
          i++; // * 와 / 모두 스킵
          continue;
        }
        if (inBlockComment) continue;

        // 문자열 처리
        if (!inBlockComment && !inLineComment) {
          if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
            if (!inString) {
              inString = true;
              stringChar = char;
            } else if (char === stringChar) {
              inString = false;
            }
          }
        }

        // 중괄호 카운트
        if (!inString && !inLineComment && !inBlockComment) {
          if (char === '{') braceCount++;
          if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              bodyEndPos = i;
              break;
            }
          }
        }
      }

      const functionBody = phpCode.substring(startPos, bodyEndPos + 1);
      functions.push({
        name: functionName,
        params,
        body: functionBody,
        fullBody: functionBody.slice(1, -1) // 중괄호 제거
      });
    }

    return functions;
  }

  /**
   * 들여쓰기 정규화
   */
  normalizeIndentation(code) {
    const lines = code.split('\n');

    // 최소 들여쓰기 찾기
    let minIndent = Infinity;
    lines.forEach(line => {
      if (line.trim() === '') return;
      const indent = line.match(/^(\s*)/)[1].length;
      minIndent = Math.min(minIndent, indent);
    });

    if (minIndent === Infinity) minIndent = 0;

    // 정규화
    return lines.map(line => {
      if (line.trim() === '') return '';
      return line.substring(minIndent);
    }).join('\n');
  }

  /**
   * 함수를 Static 메소드 클래스로 변환
   */
  convertFunctionToClass(func) {
    const className = this.generateClassName(func.name);
    const methodBody = this.normalizeIndentation(func.fullBody);

    const docstring = this.options.generateDocstring ? `
    /**
     * ${func.name}
     *
     * 원본 함수: ${func.name}
     * @param ${func.params || ''}
     * @return mixed
     */` : '';

    return `
/**
 * ${className}
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: ${new Date().toISOString()}
 */
class ${className}
{${docstring}
    public static function ${func.name}(${func.params})
    {
${methodBody.split('\n').map(line => '        ' + line).join('\n')}
    }

}
`;
  }

  /**
   * PHP 파일 변환
   */
  convert(phpCode) {
    const functions = this.extractFunctions(phpCode);

    if (functions.length === 0) {
      return {
        success: false,
        error: 'PHP 함수를 찾을 수 없습니다'
      };
    }

    // 변환된 클래스들 생성
    const convertedCode = `<?php

namespace ${this.options.phpNamespacePrefix};

${functions.map(func => this.convertFunctionToClass(func)).join('\n')}`;

    return {
      success: true,
      data: {
        convertedCode,
        functionCount: functions.length,
        classes: functions.map(f => this.generateClassName(f.name)),
        functions: functions.map(f => f.name),
        methodCount: functions.length
      },
      message: `${functions.length}개 함수가 ${functions.length}개 클래스로 변환되었습니다`
    };
  }

  /**
   * PHP 파일 분석
   */
  analyze(phpCode, fileName = 'unknown.php') {
    const buffer = Buffer.from(phpCode);
    const encoding = this.detectEncoding(buffer);
    const functions = this.extractFunctions(phpCode);

    return {
      success: true,
      data: {
        fileName,
        encoding,
        functionCount: functions.length,
        functions: functions.map(f => ({
          name: f.name,
          params: f.params,
          className: this.generateClassName(f.name)
        })),
        canConvert: functions.length > 0,
        sourceInfo: {
          fileEncoding: encoding,
          hasBOM: phpCode.charCodeAt(0) === 0xef,
          isValidUtf8: true,
          detectedEncoding: true
        }
      },
      message: `${functions.length}개 함수를 발견했습니다`
    };
  }
}

/**
 * Plugin 인터페이스
 */
module.exports = {
  name: 'php-code-migrator',
  description: 'PHP 5.6 레거시 코드를 현대적인 Static 메소드 클래스로 자동 변환',
  version: '1.0.0',

  async execute(command, options = {}) {
    const migrator = new PHPCodeMigrator({
      preserveEncoding: options.preserveEncoding !== false,
      generateDocstring: options.generateDocstring !== false,
      phpNamespacePrefix: options.phpNamespacePrefix || 'App\\Legacy',
      ...options
    });

    switch (command) {
      case 'convert':
        if (!options.phpCode) {
          return { success: false, error: 'phpCode 파라미터 필수' };
        }
        const convertResult = migrator.convert(options.phpCode);
        return {
          ...convertResult,
          data: convertResult.data ? {
            ...convertResult.data,
            encoding: options.encoding || 'utf8'
          } : undefined
        };

      case 'analyze':
        if (!options.phpCode) {
          return { success: false, error: 'phpCode 파라미터 필수' };
        }
        return migrator.analyze(options.phpCode, options.fileName);

      default:
        return { success: false, error: '알 수 없는 명령어: ' + command };
    }
  },

  // 파일 기반 처리
  async convertFile(filePath, outputPath, options = {}) {
    try {
      const iconv = require('iconv-lite');
      const buffer = fs.readFileSync(filePath);
      const migrator = new PHPCodeMigrator(options);
      const encoding = migrator.detectEncoding(buffer);

      // iconv-lite로 디코딩 (EUC-KR 지원)
      const phpCode = iconv.decode(buffer, encoding);

      const result = await this.execute('convert', {
        phpCode,
        encoding,
        preserveEncoding: options.preserveEncoding !== false,
        phpNamespacePrefix: options.phpNamespacePrefix || 'App\\Legacy'
      });

      if (result.success) {
        const outputEncoding = options.preserveEncoding !== false ? encoding : 'utf8';

        // iconv-lite로 인코딩 (EUC-KR 지원)
        const outputBuffer = iconv.encode(result.data.convertedCode, outputEncoding);
        fs.writeFileSync(outputPath, outputBuffer);

        return {
          success: true,
          message: `변환 완료: ${outputPath} (인코딩: ${outputEncoding})`,
          outputPath,
          encoding: outputEncoding
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// CLI 사용 가능하게 (node plugins/php-code-migrator/index.js convert lib.php)
if (require.main === module) {
  const [, , command, filePath] = process.argv;
  const migrator = new PHPCodeMigrator();

  if (command === 'convert' && filePath) {
    try {
      const phpCode = fs.readFileSync(filePath, 'utf8');
      const result = migrator.convert(phpCode);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('사용법: node index.js convert <php-file>');
    process.exit(1);
  }
}
