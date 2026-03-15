/**
 * SampleDataManager
 * myawsdb에서 샘플 데이터를 조회하고 CSV로 저장
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SampleDataManager {
  constructor(options = {}) {
    this.options = {
      myawsdbUrl: process.env.MYAWSDB_URL || 'http://localhost:3004',
      defaultTable: 'posts',
      defaultLimit: 1,
      outputDir: 'samples',
      ...options
    };
  }

  /**
   * myawsdb에서 샘플 레코드 조회
   * @param {string} tableName - 테이블명 (기본값: posts)
   * @param {object} options - 조회 옵션
   * @returns {Promise<array>} 샘플 레코드 배열
   */
  async fetchSampleRecord(tableName = null, options = {}) {
    const table = tableName || this.options.defaultTable;
    const limit = options.limit || this.options.defaultLimit;

    try {
      console.log(`📥 Fetching sample data from myawsdb (table: ${table})...`);

      const response = await axios.post(`${this.options.myawsdbUrl}/query`, {
        tableName: table,
        limit: limit,
        offset: 0
      }, {
        timeout: 10000
      });

      if (!response.data || !response.data.records) {
        throw new Error('Invalid response from myawsdb');
      }

      console.log(`✅ Fetched ${response.data.records.length} record(s) from ${table}`);

      return response.data.records;
    } catch (error) {
      console.error(`❌ Failed to fetch sample data: ${error.message}`);
      throw new Error(`myawsdb connection failed: ${error.message}`);
    }
  }

  /**
   * 샘플 데이터를 CSV로 저장
   * @param {string} tableName - 테이블명
   * @param {array} records - 레코드 배열
   * @param {object} options - 저장 옵션
   * @returns {Promise<string>} 저장된 파일 경로
   */
  async generateSampleCSV(tableName, records, options = {}) {
    if (!records || records.length === 0) {
      throw new Error('No records to save');
    }

    const outputDir = options.outputDir || this.options.outputDir;
    const fileName = options.fileName || `${tableName}_sample.csv`;

    // 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, fileName);

    try {
      // CSV 데이터 생성
      const csvContent = this.convertToCSV(records);

      // 파일 저장
      fs.writeFileSync(filePath, csvContent, 'utf8');

      console.log(`✅ Sample CSV saved: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error(`❌ Failed to save CSV: ${error.message}`);
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  }

  /**
   * 레코드 배열을 CSV 문자열로 변환
   * @param {array} records - 레코드 배열
   * @returns {string} CSV 문자열
   */
  convertToCSV(records) {
    if (!records || records.length === 0) {
      return '';
    }

    const headers = Object.keys(records[0]);

    // 헤더 행
    const csvLines = [headers.join(',')];

    // 데이터 행
    for (const record of records) {
      const values = headers.map(header => {
        const value = record[header];
        return this.escapeCsvValue(value);
      });

      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * CSV 값 이스케이프 (쉼표, 따옴표, 개행 포함 값 처리)
   * @param {*} value
   * @returns {string} 이스케이프된 값
   */
  escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // 쉼표, 따옴표, 개행을 포함하면 따옴표로 감싸기
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      // 내부의 따옴표를 이중으로
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * 샘플 데이터를 JavaScript 객체로 변환
   * @param {array} records - 레코드 배열
   * @returns {string} JavaScript 객체 코드
   */
  convertToJsObject(records) {
    return JSON.stringify(records, null, 2);
  }

  /**
   * 전체 프로세스: 조회 → CSV 생성
   * @param {string} tableName - 테이블명
   * @param {object} options - 옵션
   * @returns {Promise<object>} { records, csvPath }
   */
  async processSampleData(tableName = null, options = {}) {
    try {
      // Step 1: 샘플 데이터 조회
      const records = await this.fetchSampleRecord(tableName, {
        limit: options.limit || this.options.defaultLimit
      });

      // Step 2: CSV 생성 및 저장
      const table = tableName || this.options.defaultTable;
      const csvPath = await this.generateSampleCSV(table, records, {
        outputDir: options.outputDir || this.options.outputDir
      });

      return {
        records,
        csvPath,
        tableName: table,
        recordCount: records.length
      };
    } catch (error) {
      console.error(`❌ Sample data processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * CSV 파일 검증
   * @param {string} filePath - CSV 파일 경로
   * @returns {object} 검증 결과
   */
  validateCSV(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');

      if (lines.length < 2) {
        throw new Error('CSV must have at least header and one data row');
      }

      const headers = lines[0].split(',');
      const dataRows = lines.slice(1);

      return {
        valid: true,
        filePath,
        headerCount: headers.length,
        dataRowCount: dataRows.length,
        totalLines: lines.length,
        headers: headers
      };
    } catch (error) {
      return {
        valid: false,
        filePath,
        error: error.message
      };
    }
  }
}

module.exports = SampleDataManager;
