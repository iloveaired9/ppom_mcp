// plugins/top-views/top-views-analyzer.js
const axios = require('axios');
const cheerio = require('cheerio');

class TopViewsAnalyzer {
  constructor() {
    this.baseUrl = 'https://www.ppomppu.co.kr';
  }

  async getTopViews(board, page = 1, limit = 10) {
    // 1. 원본 데이터 수집
    const rawBoardData = await this.fetchRawData(board, page);

    if (!rawBoardData.success) {
      return rawBoardData;
    }

    // 2. 조회수 기준 정렬
    const sortedPosts = this.sortByViews(rawBoardData.data.posts);

    // 3. TOP N 추출
    const topNPosts = sortedPosts.slice(0, limit);

    // 4. 결과 반환
    return {
      success: true,
      metadata: {
        board: board,
        page: page,
        limit: limit,
        totalPosts: rawBoardData.data.posts.length,
        topN: topNPosts.length
      },
      data: {
        boardId: rawBoardData.data.boardId,
        page: rawBoardData.data.page,
        limit: limit,
        topPosts: topNPosts
      }
    };
  }

  async fetchRawData(board, page) {
    try {
      // MCP 서버의 엔드포인트를 통해 데이터 조회 (안정성이 더 높음)
      const mcpUrl = `http://localhost:3008/${board}?page=${page}`;
      const response = await axios.get(mcpUrl);

      if (!response.data.success) {
        return {
          success: false,
          error: `데이터 수집 실패: ${response.data.error || 'Unknown error'}`
        };
      }

      return {
        success: true,
        data: {
          boardId: board,
          page: page,
          postCount: response.data.data.postCount,
          posts: response.data.data.posts
        }
      };
    } catch (error) {
      // MCP 서버가 응답하지 않으면 직접 크롤링 시도
      try {
        return await this.crawlDirectly(board, page);
      } catch (fallbackError) {
        return {
          success: false,
          error: `데이터 수집 실패: ${error.message}. 대체 크롤링도 실패: ${fallbackError.message}`
        };
      }
    }
  }

  async crawlDirectly(board, page) {
    const iconv = require('iconv-lite');
    const url = `${this.baseUrl}/zboard/zboard.php?id=${board}&page=${page}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'arraybuffer'
    });

    // EUC-KR → UTF-8 변환
    const html = iconv.decode(response.data, 'cp949');
    const $ = cheerio.load(html);

    const posts = [];
    const rows = $('tr.baseList');

    rows.each((index, element) => {
      try {
        const cells = $(element).find('td');

        const no = $(cells[0]).text().trim();
        const titleLink = $(cells[1]).find('a.baseList-title');
        let title = titleLink.find('span').text().trim();
        if (!title || title.startsWith('[')) {
          title = titleLink.text().trim();
        }
        const link = titleLink.attr('href');
        const author = $(cells[2]).text().trim();
        const date = $(cells[3]).text().trim();
        const recommend = $(cells[4]).text().trim();
        const views = $(cells[5]).text().trim();

        const postNo = parseInt(no, 10);
        if (no && title && !isNaN(postNo) && postNo > 0) {
          let fullUrl = link;
          if (!link.startsWith('http')) {
            if (!link.startsWith('/')) {
              fullUrl = `/zboard/${link}`;
            }
            fullUrl = `https://www.ppomppu.co.kr${fullUrl}`;
          }

          posts.push({
            no: no,
            title: title,
            link: link,
            author: author,
            date: date,
            views: views,
            recommend: recommend,
            url: fullUrl
          });
        }
      } catch (err) {
        console.error(`행 파싱 에러: ${err.message}`);
      }
    });

    return {
      success: true,
      data: {
        boardId: board,
        page: page,
        postCount: posts.length,
        posts: posts
      }
    };
  }

  sortByViews(posts) {
    return posts
      .map(post => {
        // 조회수 숫자로 변환 (문자열에서 숫자 추출)
        const viewsNum = parseInt(post.views.replace(/[^0-9]/g, '')) || 0;
        return {
          ...post,
          viewsNum: viewsNum
        };
      })
      .sort((a, b) => b.viewsNum - a.viewsNum); // 내림차순 정렬
  }
}

module.exports = TopViewsAnalyzer;