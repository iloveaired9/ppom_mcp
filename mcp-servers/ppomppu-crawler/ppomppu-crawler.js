/**
 * Ppomppu Crawler MCP Server (Node.js http 표준)
 * 뽐뿌 게시판 크롤러 - MCP 프로토콜 표준화
 *
 * URL: https://www.ppomppu.co.kr/zboard/zboard.php?id=freeboard&page=X
 */
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const PORT = process.env.PPOMPPU_PORT || 3008;
const BASE_URL = 'https://www.ppomppu.co.kr/zboard/zboard.php';

/**
 * User-Agent 설정 (웹 크롤링 차단 우회)
 */
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Referer': 'https://www.ppomppu.co.kr/'
};

/**
 * ========================================
 * MCP TOOLS 정의 (표준화)
 * ========================================
 */
const tools = [
    {
        name: 'crawl_board',
        description: '뽐뿌 게시판 페이지 크롤링 (모든 게시판)',
        inputSchema: {
            type: 'object',
            properties: {
                board: {
                    type: 'string',
                    enum: ['freeboard', 'baseball', 'ppomppu', 'stock'],
                    description: '게시판 ID'
                },
                page: {
                    type: 'number',
                    minimum: 1,
                    description: '페이지 번호'
                }
            },
            required: ['board', 'page']
        }
    },
    {
        name: 'analyze_board',
        description: '게시판 데이터 분석 (카테고리, 키워드, 통계)',
        inputSchema: {
            type: 'object',
            properties: {
                board: {
                    type: 'string',
                    enum: ['freeboard', 'baseball', 'ppomppu', 'stock'],
                    description: '게시판 ID'
                },
                page: {
                    type: 'number',
                    minimum: 1,
                    description: '페이지 번호'
                }
            },
            required: ['board', 'page']
        }
    },
    {
        name: 'get_top_views',
        description: '게시판에서 조회수 기준 TOP N 게시물을 조회합니다',
        inputSchema: {
            type: 'object',
            properties: {
                board: {
                    type: 'string',
                    enum: ['freeboard', 'baseball', 'ppomppu', 'stock'],
                    description: '게시판 ID'
                },
                page: {
                    type: 'number',
                    minimum: 1,
                    description: '페이지 번호',
                    default: 1
                },
                limit: {
                    type: 'number',
                    minimum: 1,
                    description: '조회수 TOP N 개수',
                    default: 10
                }
            },
            required: ['board']
        }
    },
    {
        name: 'get_freeboard',
        description: '자유게시판(freeboard) 특정 페이지 조회',
        inputSchema: {
            type: 'object',
            properties: {
                page: { type: 'number', minimum: 1 }
            },
            required: ['page']
        }
    },
    {
        name: 'get_baseball',
        description: '야구 게시판(baseball) 특정 페이지 조회',
        inputSchema: {
            type: 'object',
            properties: {
                page: { type: 'number', minimum: 1 }
            },
            required: ['page']
        }
    },
    {
        name: 'get_ppomppu',
        description: '뽐뿌 일반 게시판(ppomppu) 특정 페이지 조회',
        inputSchema: {
            type: 'object',
            properties: {
                page: { type: 'number', minimum: 1 }
            },
            required: ['page']
        }
    },
    {
        name: 'get_stock',
        description: '주식 게시판(stock) 특정 페이지 조회',
        inputSchema: {
            type: 'object',
            properties: {
                page: { type: 'number', minimum: 1 }
            },
            required: ['page']
        }
    },
    {
        name: 'get_help',
        description: 'ppomppu-crawler 사용법 및 도구 목록',
        inputSchema: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    enum: ['overview', 'tools', 'boards', 'examples', 'all'],
                    description: '도움말 주제'
                }
            }
        }
    }
];

/**
 * ========================================
 * 코어 크롤링 함수 (변경 없음)
 * ========================================
 */
async function crawlBoard(boardId = 'freeboard', pageNum = 1) {
    try {
        console.log(`🔍 크롤링 시작: ${boardId}, page ${pageNum}`);

        const crawlUrl = `${BASE_URL}?id=${boardId}&page=${pageNum}`;
        const response = await axios.get(crawlUrl, {
            headers: HEADERS,
            timeout: 10000,
            responseType: 'arraybuffer'
        });

        // EUC-KR → UTF-8 변환
        const html = iconv.decode(response.data, 'cp949');
        const $ = cheerio.load(html);
        const posts = [];

        // 게시판 리스트 테이블 파싱
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
                if (no && title && link && !isNaN(postNo) && postNo > 0) {
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

        console.log(`✅ ${posts.length}개 게시물 발견`);
        return posts;

    } catch (error) {
        console.error(`크롤링 오류: ${error.message}`);
        throw error;
    }
}

/**
 * ========================================
 * 분석 유틸리티 함수들
 * ========================================
 */

function analyzeTimeline(posts) {
    const hourlyDistribution = {};

    posts.forEach(post => {
        const hourMatch = post.date.match(/(\d{2}):/);
        if (hourMatch) {
            const hour = hourMatch[1];
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        }
    });

    const hours = Object.entries(hourlyDistribution)
        .sort((a, b) => b[1] - a[1]);
    const peakHours = hours.slice(0, 1).map(h => h[0]);
    const peakHourCount = peakHours.length > 0 ? hourlyDistribution[peakHours[0]] : 0;
    const concentration = posts.length > 0 ? ((peakHourCount / posts.length) * 100).toFixed(1) : 0;

    return {
        hourlyDistribution,
        peakHours,
        peakHourCount,
        concentration: parseFloat(concentration)
    };
}

function extractKeywords(posts, topN = 5) {
    const keywordMap = {};
    const koreanWordRegex = /[가-힣]{2,}/g;

    posts.forEach(post => {
        const words = post.title.match(koreanWordRegex) || [];
        words.forEach(word => {
            keywordMap[word] = (keywordMap[word] || 0) + 1;
        });
    });

    const sortedKeywords = Object.entries(keywordMap)
        .map(([text, count]) => ({
            text,
            count,
            score: Math.min(1.0, 0.5 + (count / posts.length) * 0.5)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

    const totalKeywords = Object.keys(keywordMap).reduce((sum, key) => sum + keywordMap[key], 0);
    const uniqueKeywords = Object.keys(keywordMap).length;
    const avgFrequency = uniqueKeywords > 0 ? (totalKeywords / uniqueKeywords).toFixed(2) : 0;

    return {
        keywords: sortedKeywords,
        totalKeywords,
        uniqueKeywords,
        avgFrequency: parseFloat(avgFrequency)
    };
}

function categorizePost(posts) {
    const categories = {
        '정치/검찰': ['검찰개혁', '검찰', '대통령', '윤석열', '이재명', '민주당', '여당', '야당'],
        '국제': ['호르무즈', '이란', '미국', '이스라엘', '중국', 'WBC', '해협', '기뢰'],
        '스포츠': ['야구', '팀', '경기', '선수', '승리', '패배', '스포츠'],
        '연예/종교': ['김어준', '신천지', '영화', '드라마', '반지의제왕', '배우'],
        '경제/쇼핑': ['포인트', '네이버', '페이', '구매', '쿠폰', '가격', '할인'],
        '일상': ['고민', '의견', '이야기', '일상', '생활']
    };

    const categoryDistribution = {};
    const categoryNames = Object.keys(categories);

    categoryNames.forEach(cat => {
        categoryDistribution[cat] = { count: 0, percentage: 0 };
    });

    posts.forEach(post => {
        let found = false;
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => post.title.includes(keyword))) {
                categoryDistribution[category].count++;
                found = true;
                break;
            }
        }
        if (!found) {
            if (!categoryDistribution['기타']) {
                categoryDistribution['기타'] = { count: 0, percentage: 0 };
            }
            categoryDistribution['기타'].count++;
        }
    });

    const totalPosts = posts.length;
    Object.keys(categoryDistribution).forEach(cat => {
        categoryDistribution[cat].percentage =
            totalPosts > 0 ? parseFloat(((categoryDistribution[cat].count / totalPosts) * 100).toFixed(1)) : 0;
    });

    const topCategory = Object.entries(categoryDistribution)
        .sort((a, b) => b[1].count - a[1].count)[0];

    return {
        categoryDistribution,
        topCategory: topCategory ? topCategory[0] : '기타',
        topCategoryCount: topCategory ? topCategory[1].count : 0
    };
}

function analyzeParticipation(posts) {
    const recommends = [];
    const dislikes = [];
    const views = [];

    posts.forEach(post => {
        const viewCount = parseInt(post.views, 10) || 0;
        views.push(viewCount);

        const [upStr, downStr] = post.recommend.split('-');
        const up = parseInt(upStr, 10) || 0;
        const down = parseInt(downStr, 10) || 0;
        recommends.push(up);
        dislikes.push(down);
    });

    const calcStats = (arr) => {
        if (arr.length === 0) return { average: 0, max: 0, min: 0, median: 0, stdDev: 0 };
        const sorted = [...arr].sort((a, b) => a - b);
        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = sum / arr.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
        const stdDev = Math.sqrt(variance);

        return {
            average: parseFloat(avg.toFixed(2)),
            max: Math.max(...arr),
            min: Math.min(...arr),
            median,
            stdDev: parseFloat(stdDev.toFixed(2))
        };
    };

    const recommendsStats = calcStats(recommends);
    const dislikesStats = calcStats(dislikes);
    const viewsStats = calcStats(views);

    const highEngagement = recommends.filter(r => r > 500).length;
    const mediumEngagement = recommends.filter(r => r > 100 && r <= 500).length;
    const lowEngagement = recommends.filter(r => r <= 100).length;

    const avgRecommend = recommendsStats.average;
    const activityLevel = avgRecommend > 300 ? '높음' : avgRecommend > 100 ? '중간' : '낮음';

    return {
        recommends: recommendsStats,
        dislikes: dislikesStats,
        views: viewsStats,
        engagement: {
            highEngagement,
            mediumEngagement,
            lowEngagement
        },
        activityLevel
    };
}

function getTopPosts(posts, topN = 5) {
    return posts
        .map(post => ({
            no: post.no,
            title: post.title,
            author: post.author,
            views: parseInt(post.views, 10) || 0,
            recommends: (() => {
                const [up, down] = post.recommend.split('-');
                return { up: parseInt(up, 10) || 0, down: parseInt(down, 10) || 0 };
            })(),
            createdAt: post.date,
            url: post.url
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, topN);
}

function analyzeFreeboard(posts) {
    const startTime = Date.now();

    const analysis = {
        timeline: analyzeTimeline(posts),
        keywords: extractKeywords(posts, 5),
        categories: categorizePost(posts),
        participation: analyzeParticipation(posts),
        topPosts: getTopPosts(posts, 5),
        metadata: {
            totalPosts: posts.length,
            analyzedAt: new Date().toISOString(),
            processingTime: `${Date.now() - startTime}ms`
        }
    };

    return analysis;
}

/**
 * ========================================
 * 도움말 생성 함수 (/help 엔드포인트용)
 * ========================================
 */
function generateHelp(topic = 'overview') {
    const help = {
        overview: {
            name: 'ppomppu-crawler',
            version: '2.0.0-mcp-standard',
            description: '뽐뿌 게시판 MCP 크롤러 (Node.js http 표준)',
            status: '✅ 활성화',
            port: PORT,
            baseUrl: BASE_URL,
            lastUpdated: new Date().toISOString()
        },
        tools: [
            {
                name: 'crawl_board',
                description: '뽐뿌 게시판 페이지 크롤링 (모든 게시판)',
                params: { board: 'freeboard|baseball|ppomppu|stock', page: '1+' },
                endpoint: 'POST /crawl'
            },
            {
                name: 'analyze_board',
                description: '게시판 데이터 분석 (카테고리, 키워드, 통계)',
                params: { board: 'freeboard|baseball|ppomppu|stock', page: '1+' },
                endpoint: 'GET /analyze?board=freeboard&page=1'
            },
            {
                name: 'get_top_views',
                description: '조회수 기준 TOP N 게시물 조회',
                params: { board: 'freeboard|baseball|ppomppu|stock', page: '1+', limit: '1+' },
                endpoint: 'GET /top-views?board=freeboard&page=1&limit=5'
            },
            {
                name: 'get_freeboard',
                description: '자유게시판(freeboard) 조회',
                params: { page: '1+' },
                endpoint: 'GET /freeboard?page=1'
            },
            {
                name: 'get_baseball',
                description: '야구 게시판(baseball) 조회',
                params: { page: '1+' },
                endpoint: 'GET /baseball?page=1'
            },
            {
                name: 'get_ppomppu',
                description: '뽐뿌 일반 게시판(ppomppu) 조회',
                params: { page: '1+' },
                endpoint: 'GET /ppomppu?page=1'
            },
            {
                name: 'get_stock',
                description: '주식 게시판(stock) 조회',
                params: { page: '1+' },
                endpoint: 'GET /stock?page=1'
            }
        ],
        boards: [
            { id: 'freeboard', name: '자유게시판', endpoint: 'GET /freeboard?page=1' },
            { id: 'baseball', name: '야구 게시판', endpoint: 'GET /baseball?page=1' },
            { id: 'ppomppu', name: '뽐뿌 일반', endpoint: 'GET /ppomppu?page=1' },
            { id: 'stock', name: '주식 게시판', endpoint: 'GET /stock?page=1' }
        ],
        analysis: [
            { feature: 'timeline', description: '시간대별 분석' },
            { feature: 'keywords', description: '핵심 키워드 추출' },
            { feature: 'categories', description: '게시물 카테고리 분류' },
            { feature: 'participation', description: '사용자 참여도 분석' }
        ],
        examples: [
            {
                description: 'freeboard 1페이지 조회',
                command: `curl "http://localhost:${PORT}/freeboard?page=1"`
            },
            {
                description: 'baseball 분석',
                command: `curl "http://localhost:${PORT}/analyze?board=baseball&page=1"`
            },
            {
                description: 'top views 조회',
                command: `curl "http://localhost:${PORT}/top-views?board=freeboard&page=1&limit=5"`
            },
            {
                description: '도구 목록 확인',
                command: `curl "http://localhost:${PORT}/tools"`
            },
            {
                description: '서버 상태 확인',
                command: `curl "http://localhost:${PORT}/health"`
            }
        ]
    };

    // 요청한 토픽 반환 (없으면 overview 반환)
    if (topic === 'all') {
        // 모든 정보를 한 번에 반환
        return {
            server: help.overview,
            tools: help.tools,
            boards: help.boards,
            analysis: help.analysis,
            examples: help.examples,
            timestamp: new Date().toISOString()
        };
    }

    return help[topic] || help.overview;
}

/**
 * ========================================
 * HTTP 서버 (Node.js 표준)
 * ========================================
 */
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // 공통 응답 헤더 설정
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // ===== /tools =====
        if (pathname === '/tools' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({ tools }, null, 2));
            return;
        }

        // ===== /crawl (POST) =====
        if (pathname === '/crawl' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { boardId = 'freeboard', page = 1 } = data;

                    if (!boardId || !page || page < 1) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            success: false,
                            error: '유효하지 않은 boardId 또는 page 번호'
                        }));
                        return;
                    }

                    const posts = await crawlBoard(boardId, page);

                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            boardId: boardId,
                            page: page,
                            postCount: posts.length,
                            posts: posts,
                            timestamp: new Date().toISOString()
                        },
                        message: `${boardId} ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
                    }, null, 2));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
            return;
        }

        // ===== /freeboard =====
        if (pathname === '/freeboard' && req.method === 'GET') {
            const page = parseInt(query.page) || 1;
            const posts = await crawlBoard('freeboard', page);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    boardId: 'freeboard',
                    page: page,
                    postCount: posts.length,
                    posts: posts,
                    timestamp: new Date().toISOString()
                },
                message: `자유게시판 ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
            }, null, 2));
            return;
        }

        // ===== /ppomppu =====
        if (pathname === '/ppomppu' && req.method === 'GET') {
            const page = parseInt(query.page) || 1;
            const posts = await crawlBoard('ppomppu', page);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    boardId: 'ppomppu',
                    page: page,
                    postCount: posts.length,
                    posts: posts,
                    timestamp: new Date().toISOString()
                },
                message: `뽐뿌 게시판 ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
            }, null, 2));
            return;
        }

        // ===== /baseball =====
        if (pathname === '/baseball' && req.method === 'GET') {
            const page = parseInt(query.page) || 1;
            const posts = await crawlBoard('baseball', page);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    boardId: 'baseball',
                    page: page,
                    postCount: posts.length,
                    posts: posts,
                    timestamp: new Date().toISOString()
                },
                message: `야구 게시판 ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
            }, null, 2));
            return;
        }

        // ===== /stock =====
        if (pathname === '/stock' && req.method === 'GET') {
            const page = parseInt(query.page) || 1;
            const posts = await crawlBoard('stock', page);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    boardId: 'stock',
                    page: page,
                    postCount: posts.length,
                    posts: posts,
                    timestamp: new Date().toISOString()
                },
                message: `주식 게시판 ${page}페이지에서 ${posts.length}개 게시물을 조회했습니다`
            }, null, 2));
            return;
        }

        // ===== /analyze =====
        if (pathname === '/analyze' && req.method === 'GET') {
            const requestStartTime = Date.now();
            const { board = 'freeboard', page = 1 } = query;

            if (!board) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    error: 'board parameter is required',
                    code: 'INVALID_BOARD',
                    supportedBoards: ['freeboard', 'baseball', 'stock', 'ppomppu']
                }));
                return;
            }

            if (page < 1 || page > 999) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    error: 'page must be between 1 and 999',
                    code: 'INVALID_PAGE'
                }));
                return;
            }

            const posts = await crawlBoard(board, parseInt(page, 10));

            if (!posts || posts.length === 0) {
                res.writeHead(503);
                res.end(JSON.stringify({
                    error: 'No data available',
                    code: 'NO_DATA'
                }));
                return;
            }

            const analysis = analyzeFreeboard(posts);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                metadata: {
                    board,
                    page: parseInt(page, 10),
                    totalPosts: posts.length,
                    analyzedAt: new Date().toISOString(),
                    processingTime: `${Date.now() - requestStartTime}ms`
                },
                analysis
            }, null, 2));
            return;
        }

        // ===== /top-views =====
        if (pathname === '/top-views' && req.method === 'GET') {
            const requestStartTime = Date.now();
            const { board = 'freeboard', page = 1, limit = 10 } = query;

            if (!board) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    error: 'board parameter is required',
                    code: 'INVALID_BOARD',
                    supportedBoards: ['freeboard', 'baseball', 'stock', 'ppomppu']
                }));
                return;
            }

            if (page < 1 || page > 999) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    error: 'page must be between 1 and 999',
                    code: 'INVALID_PAGE'
                }));
                return;
            }

            const posts = await crawlBoard(board, parseInt(page, 10));

            if (!posts || posts.length === 0) {
                res.writeHead(503);
                res.end(JSON.stringify({
                    error: 'No data available',
                    code: 'NO_DATA'
                }));
                return;
            }

            // 조회수 기준 정렬 및 TOP N 추출
            const sortedPosts = posts
                .map(post => ({
                    no: post.no,
                    title: post.title,
                    author: post.author,
                    views: parseInt(post.views, 10) || 0,
                    recommends: (() => {
                        const [up, down] = post.recommend.split('-');
                        return { up: parseInt(up, 10) || 0, down: parseInt(down, 10) || 0 };
                    })(),
                    createdAt: post.date,
                    url: post.url
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, parseInt(limit, 10) || 10);

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                metadata: {
                    board,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10) || 10,
                    totalPosts: posts.length,
                    processedAt: new Date().toISOString(),
                    processingTime: `${Date.now() - requestStartTime}ms`
                },
                data: {
                    boardId: board,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10) || 10,
                    topPosts: sortedPosts
                }
            }, null, 2));
            return;
        }

        // ===== /health =====
        if (pathname === '/health' && req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                server: 'ppomppu-crawler-mcp',
                version: '2.0.0-mcp-standard',
                timestamp: new Date().toISOString(),
                baseUrl: BASE_URL
            }, null, 2));
            return;
        }

        // ===== /help =====
        if (pathname === '/help' && req.method === 'GET') {
            const topic = query.topic || 'all';
            res.writeHead(200);
            res.end(JSON.stringify(generateHelp(topic), null, 2));
            return;
        }

        // ===== 404 Not Found =====
        res.writeHead(404);
        res.end(JSON.stringify({
            error: 'Not Found',
            code: 'NOT_FOUND',
            availableEndpoints: ['/tools', '/health', '/crawl', '/freeboard', '/ppomppu', '/baseball', '/stock', '/analyze', '/top-views']
        }));
    } catch (error) {
        console.error('서버 오류:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: error.message,
            code: 'SERVER_ERROR'
        }));
    }
});

/**
 * ========================================
 * 서버 시작
 * ========================================
 */
server.listen(PORT, () => {
    console.log(`\n🚀 Ppomppu Crawler MCP Server 시작 (Node.js HTTP 표준)`);
    console.log(`📍 포트: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📺 뽐뿌: https://www.ppomppu.co.kr/zboard/zboard.php\n`);

    console.log(`📊 MCP 도구 (자동 발견 가능):`);
    tools.forEach(tool => {
        console.log(`  • ${tool.name} - ${tool.description}`);
    });

    console.log(`\n사용 가능한 엔드포인트:`);
    console.log(`  GET  /tools              - MCP 도구 목록 (메타데이터)`);
    console.log(`  POST /crawl              - 게시판 크롤링`);
    console.log(`  GET  /health             - 서버 상태\n`);

    console.log(`📰 게시판 조회 (원본 데이터):`);
    console.log(`  GET  /freeboard?page=1   - 자유게시판`);
    console.log(`  GET  /ppomppu?page=1     - 뽐뿌 일반 게시판`);
    console.log(`  GET  /baseball?page=1    - 야구 게시판`);
    console.log(`  GET  /stock?page=1       - 주식 게시판\n`);

    console.log(`📊 분석 기능:`);
    console.log(`  GET  /analyze?board=freeboard&page=1  - 데이터 조회 + 분석`);
    console.log(`  GET  /top-views?board=freeboard&page=1&limit=5  - 조회수 TOP N 게시물\n`);

    console.log(`예시:`);
    console.log(`  curl "http://localhost:${PORT}/tools"`);
    console.log(`  curl "http://localhost:${PORT}/analyze?board=baseball&page=1"`);
    console.log(`  curl "http://localhost:${PORT}/top-views?board=freeboard&page=1&limit=3"`);
    console.log(`  curl "http://localhost:${PORT}/health\n"`);
});

module.exports = { crawlBoard, analyzeFreeboard, tools };