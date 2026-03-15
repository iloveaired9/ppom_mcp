// plugins/top-views/index.js
const TopViewsAnalyzer = require('./top-views-analyzer');

module.exports = {
  name: 'top_views',
  version: '1.0.0',
  description: '조회수 기준 TOP N 게시물 조회 플러그인',

  tools: {
    get_top_views: {
      name: 'get_top_views',
      description: '게시판에서 조회수 기준 TOP N 게시물을 조회합니다',
      parameters: {
        board: {
          type: 'string',
          required: true,
          description: '게시판 ID (freeboard, baseball, ppomppu, stock)'
        },
        page: {
          type: 'integer',
          required: false,
          description: '페이지 번호 (기본: 1)',
          default: 1
        },
        limit: {
          type: 'integer',
          required: false,
          description: '조회수 TOP N 개수 (기본: 10)',
          default: 10
        }
      },
      execute: async ({ board, page, limit = 10 }) => {
        try {
          const analyzer = new TopViewsAnalyzer();
          const result = await analyzer.getTopViews(board, page, limit);
          return result;
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }
    }
  }
};