/**
 * 호출 그래프 컨트롤러
 * 캐싱 지원 (CacheManager L1/L2)
 */

const PHPIndexService = require('../services/PHPIndexService');
const CacheManager = require('../services/CacheManager');

// 캐시 매니저 인스턴스 (싱글톤)
let cacheManager = null;

function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * GET /api/graph/callers?symbol=<symbol>&maxDepth=<maxDepth>
 */
async function getCallers(req, res) {
  try {
    const { symbol, maxDepth = 3 } = req.query;

    if (!symbol) {
      return res.json({
        success: false,
        error: 'Query parameter "symbol" is required'
      });
    }

    const cache = getCacheManager();
    const cacheKey = { symbol, maxDepth };
    const startTime = Date.now();

    // L1/L2 캐시 조회
    const cachedResult = await cache.get('graph:callers', cacheKey);
    if (cachedResult) {
      const cached = cachedResult.data;
      const executionTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: {
          ...cached,
          metadata: {
            ...cached.metadata,
            executionTime,
            cached: cachedResult.source  // 캐시 출처 표시
          }
        }
      });
    }

    // PHP Index CLI 호출 (callers 분석)
    const callersData = await PHPIndexService.getCallers(symbol);

    // Cytoscape 형식으로 변환
    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    // 중심 노드 추가
    nodeSet.add(symbol);
    nodes.push({
      group: 'nodes',
      data: {
        id: symbol,
        label: symbol,
        type: 'target',
        isCenter: true
      }
    });

    // 호출자 노드 및 엣지 추가
    if (callersData && callersData.data) {
      const lines = callersData.data.split('\n');
      lines.forEach((line) => {
        if (line.trim() && !line.includes('호출')) {
          const caller = line.trim().split('(')[0].trim();
          if (caller && caller !== symbol) {
            // 노드 추가
            if (!nodeSet.has(caller)) {
              nodeSet.add(caller);
              nodes.push({
                group: 'nodes',
                data: {
                  id: caller,
                  label: caller.split('::').pop(),
                  type: 'function'
                }
              });
            }

            // 엣지 추가 (caller → symbol)
            edges.push({
              group: 'edges',
              data: {
                source: caller,
                target: symbol
              }
            });
          }
        }
      });
    }

    const graphData = {
      symbol,
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    };

    // 캐시 저장
    await cache.set('graph:callers', cacheKey, graphData);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...graphData,
        metadata: {
          ...graphData.metadata,
          executionTime,
          cached: false  // 새로 생성된 결과
        }
      }
    });
  } catch (error) {
    console.error('Get callers error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '호출 그래프 조회 중 오류가 발생했습니다',
      code: 'GRAPH_CALLERS_FAILED',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * GET /api/graph/calls?symbol=<symbol>&maxDepth=<maxDepth>
 */
async function getCalls(req, res) {
  try {
    const { symbol, maxDepth = 3 } = req.query;

    if (!symbol) {
      return res.json({
        success: false,
        error: 'Query parameter "symbol" is required'
      });
    }

    const cache = getCacheManager();
    const cacheKey = { symbol, maxDepth };
    const startTime = Date.now();

    // L1/L2 캐시 조회
    const cachedResult = await cache.get('graph:calls', cacheKey);
    if (cachedResult) {
      const cached = cachedResult.data;
      const executionTime = Date.now() - startTime;

      return res.json({
        success: true,
        data: {
          ...cached,
          metadata: {
            ...cached.metadata,
            executionTime,
            cached: cachedResult.source  // 캐시 출처 표시
          }
        }
      });
    }

    // PHP Index CLI 호출 (trace 분석)
    const traceData = await PHPIndexService.getCallTrace(symbol, { maxDepth });

    // Cytoscape 형식으로 변환
    const nodes = [];
    const edges = [];
    const nodeSet = new Set();

    // 중심 노드 추가
    nodeSet.add(symbol);
    nodes.push({
      group: 'nodes',
      data: {
        id: symbol,
        label: symbol,
        type: 'source',
        isCenter: true,
        depth: 0
      }
    });

    // 호출 함수들 추가 (텍스트 파싱)
    if (traceData && traceData.data) {
      const lines = traceData.data.split('\n');
      let currentDepth = 0;

      lines.forEach((line) => {
        // 깊이 계산 (들여쓰기 기반)
        const depth = (line.match(/^\s*/)[0].length / 2) || 0;

        const funcName = line.trim().replace(/[•├─│\s]+/g, '').split('(')[0].trim();

        if (funcName && funcName !== symbol && !funcName.includes('└')) {
          if (!nodeSet.has(funcName)) {
            nodeSet.add(funcName);
            nodes.push({
              group: 'nodes',
              data: {
                id: funcName,
                label: funcName,
                type: 'function',
                depth: Math.min(depth, maxDepth)
              }
            });
          }

          // 이전 노드와 엣지 생성
          if (nodes.length > 1) {
            const parentNode = nodes[nodes.length - 2];
            edges.push({
              group: 'edges',
              data: {
                source: parentNode.data.id,
                target: funcName
              }
            });
          }
        }
      });
    }

    const graphData = {
      symbol,
      nodes,
      edges,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        maxDepth
      }
    };

    // 캐시 저장
    await cache.set('graph:calls', cacheKey, graphData);

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...graphData,
        metadata: {
          ...graphData.metadata,
          executionTime,
          cached: false  // 새로 생성된 결과
        }
      }
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '호출 경로 조회 중 오류가 발생했습니다',
      code: 'GRAPH_CALLS_FAILED',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  getCallers,
  getCalls
};
