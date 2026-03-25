/**
 * String Search Controller
 * PHP 코드에서 문자열을 검색하고 반환합니다
 */

const StringIndexer = require('../../../plugins/php-string-finder/lib/StringIndexer');
const path = require('path');

// StringIndexer 인스턴스
let stringIndexer = null;

/**
 * StringIndexer 초기화
 */
function getIndexer() {
  if (!stringIndexer) {
    try {
      stringIndexer = new StringIndexer({
        sourceDir: 'work/mobile',
        outputDir: './plugins/php-string-finder/output'
      });
    } catch (error) {
      console.error('StringIndexer 초기화 실패:', error.message);
      // 빈 색인 반환
      return {
        search: () => [],
        analyze: () => ({ totalStrings: 0, totalOccurrences: 0, totalFiles: 0 }),
        listStrings: () => [],
        getStats: () => ({})
      };
    }
  }
  return stringIndexer;
}

/**
 * 문자열 검색
 * GET /api/search/string?q=검색어&type=search&limit=20
 */
exports.search = async (req, res) => {
  try {
    const { q, type = 'search', limit = 20, caseSensitive = false } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요'
      });
    }

    const indexer = getIndexer();

    // 색인에서 검색
    const results = indexer.search(q, {
      caseSensitive: caseSensitive === 'true',
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      searchTerm: q,
      type,
      resultCount: results.length,
      results: results.map(r => ({
        id: `${r.file}:${r.line}`,
        file: r.file,
        line: r.line,
        functionName: r.functionName,
        type: r.type,
        content: r.content,
        // 의존성 정보 추가 (아직 미구현)
        dependencies: []
      }))
    });

  } catch (error) {
    console.error('String search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '검색 중 오류가 발생했습니다'
    });
  }
};

/**
 * 색인 생성/갱신
 * POST /api/string/index
 */
exports.buildIndex = async (req, res) => {
  try {
    const { force = false } = req.body;

    console.log('🔍 문자열 색인 생성 시작...');

    const indexer = getIndexer();
    const result = await indexer.build({ force });

    res.json({
      success: true,
      message: '색인 생성 완료',
      result
    });

  } catch (error) {
    console.error('Index build error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '색인 생성 중 오류가 발생했습니다'
    });
  }
};

/**
 * 색인 분석
 * GET /api/string/analyze
 */
exports.analyze = (req, res) => {
  try {
    const indexer = getIndexer();
    const analysis = indexer.analyze();

    res.json({
      success: true,
      analysis: {
        totalStrings: analysis.totalStrings,
        totalOccurrences: analysis.totalOccurrences,
        totalFiles: analysis.totalFiles,
        topStrings: analysis.topStrings || [],
        buildTime: analysis.buildTime
      }
    });

  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '분석 중 오류가 발생했습니다'
    });
  }
};

/**
 * 색인된 문자열 목록
 * GET /api/string/list?limit=20&sort=count
 */
exports.listStrings = (req, res) => {
  try {
    const { limit = 20, sort = 'count' } = req.query;

    const indexer = getIndexer();
    const strings = indexer.listStrings({
      limit: parseInt(limit) || 20,
      sortBy: sort
    });

    res.json({
      success: true,
      count: strings.length,
      strings: strings.map(s => ({
        string: s.string,
        occurrences: s.count,
        fileCount: s.files.length,
        functionCount: s.functions.length,
        files: s.files,
        functions: s.functions
      }))
    });

  } catch (error) {
    console.error('List strings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '목록 조회 중 오류가 발생했습니다'
    });
  }
};

/**
 * 색인 통계
 * GET /api/string/stats
 */
exports.getStats = (req, res) => {
  try {
    const indexer = getIndexer();
    const analysis = indexer.analyze();

    res.json({
      success: true,
      stats: {
        totalStrings: analysis.totalStrings,
        totalOccurrences: analysis.totalOccurrences,
        totalFiles: analysis.totalFiles,
        averageOccurrencesPerString: (
          analysis.totalOccurrences / analysis.totalStrings
        ).toFixed(2),
        lastBuildTime: analysis.buildTime
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 특정 문자열의 상세 정보
 * GET /api/string/detail?q=검색어
 */
exports.getDetail = (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요'
      });
    }

    const indexer = getIndexer();
    const results = indexer.search(q, { limit: 999 });

    // 파일별로 그룹화
    const byFile = {};
    results.forEach(r => {
      if (!byFile[r.file]) {
        byFile[r.file] = [];
      }
      byFile[r.file].push({
        line: r.line,
        functionName: r.functionName,
        context: r.content
      });
    });

    res.json({
      success: true,
      searchTerm: q,
      totalOccurrences: results.length,
      files: Object.entries(byFile).map(([file, occurrences]) => ({
        file,
        occurrenceCount: occurrences.length,
        occurrences
      }))
    });

  } catch (error) {
    console.error('Get detail error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
