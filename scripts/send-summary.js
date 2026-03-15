#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Send freeboard summary via email
 */
async function sendSummary(boardType = 'freeboard', page = 1) {
  // Read CSV data
  const csvFile = path.join(__dirname, `../freeboard-${new Date().toISOString().split('T')[0]}-page${page}.csv`);
  const fallbackCsv = path.join(__dirname, '../freeboard.csv');

  let csvPath = fs.existsSync(csvFile) ? csvFile : fallbackCsv;

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV 파일을 찾을 수 없습니다.');
    return false;
  }

  // Parse CSV and generate summary
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').slice(1).filter(l => l.trim());

  const summary = generateSummary(lines);

  // Setup email
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });

  // Create email content
  const emailHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; }
          .header { background: #0d1117; color: #58a6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #58a6ff; border-bottom: 2px solid #30363d; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0; }
          th { background: #f5f5f5; font-weight: bold; }
          .category { display: inline-block; background: #e8f4f8; padding: 4px 12px; margin: 2px; border-radius: 20px; font-size: 12px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 뽐뿌 게시판 요약</h1>
            <p>${boardType} | 페이지 ${page} | ${new Date().toLocaleDateString('ko-KR')}</p>
          </div>

          <div class="section">
            <h3>📈 주요 통계</h3>
            <table>
              <tr>
                <th>항목</th>
                <th>수값</th>
              </tr>
              <tr>
                <td>전체 게시물</td>
                <td><strong>${summary.totalPosts}</strong></td>
              </tr>
              <tr>
                <td>평균 추천수</td>
                <td><strong>${summary.avgRecommend}</strong></td>
              </tr>
              <tr>
                <td>최고 추천수</td>
                <td><strong>${summary.maxRecommend}</strong></td>
              </tr>
              <tr>
                <td>평균 조회수</td>
                <td><strong>${summary.avgViews}</strong></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3>🔥 상위 게시물 (추천순)</h3>
            <table>
              <tr>
                <th>제목</th>
                <th>추천</th>
                <th>조회</th>
              </tr>
              ${summary.topPosts.map(p => `
              <tr>
                <td>${p.title}</td>
                <td>${p.recommend}</td>
                <td>${p.views}</td>
              </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <h3>🏷️ 카테고리 분포</h3>
            <div>
              ${summary.categories.map(c =>
                `<span class="category">${c.name}: ${c.count}</span>`
              ).join('')}
            </div>
          </div>

          <div class="section">
            <h3>💬 핵심 키워드 (Top 5)</h3>
            <p>${summary.keywords.join(', ')}</p>
          </div>

          <div class="footer">
            <p>🤖 자동 생성된 요약입니다 | ppomppu-crawler MCP</p>
            <p><a href="http://localhost:8888">시스템 대시보드 보기</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.MAIL_RECIPIENT,
    subject: `📊 뽐뿌 ${boardType} 페이지 ${page} 요약 - ${new Date().toLocaleDateString('ko-KR')}`,
    html: emailHtml
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 메일 발송 성공!');
    console.log(`📧 To: ${process.env.MAIL_RECIPIENT}`);
    console.log(`📝 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ 메일 발송 실패:', error.message);
    return false;
  }
}

function generateSummary(lines) {
  const posts = lines.map(line => {
    const parts = line.split(',');
    return {
      no: parts[0],
      title: parts[1],
      author: parts[2],
      date: parts[3],
      recommend: parseInt(parts[4]) || 0,
      views: parseInt(parts[5]) || 0,
      url: parts[6]
    };
  });

  // Top posts by recommendation
  const topPosts = [...posts]
    .sort((a, b) => b.recommend - a.recommend)
    .slice(0, 5)
    .map(p => ({
      title: p.title.substring(0, 50) + (p.title.length > 50 ? '...' : ''),
      recommend: p.recommend,
      views: p.views
    }));

  // Categories
  const categories = [
    {
      name: '정치/검찰',
      keywords: ['검찰', '대통령', '여당', '야당', '윤석열', '이재명'],
      count: 0
    },
    {
      name: '국제',
      keywords: ['호르무즈', '이란', '미국', '이스라엘', '중국'],
      count: 0
    },
    {
      name: '스포츠',
      keywords: ['야구', 'WBC', '팀', '경기', '선수', '구단'],
      count: 0
    },
    {
      name: '연예',
      keywords: ['배우', '가수', '영화', '드라마'],
      count: 0
    }
  ];

  posts.forEach(post => {
    const title = post.title.toLowerCase();
    categories.forEach(cat => {
      if (cat.keywords.some(k => title.includes(k.toLowerCase()))) {
        cat.count++;
      }
    });
  });

  // Keywords extraction
  const allWords = posts
    .flatMap(p => p.title.split(/[\s\-,.\[\]()]/))
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  const keywords = [...new Set(allWords)]
    .map(w => ({ word: w, count: allWords.filter(x => x === w).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(k => k.word);

  return {
    totalPosts: posts.length,
    avgRecommend: Math.round(posts.reduce((a, p) => a + p.recommend, 0) / posts.length),
    maxRecommend: Math.max(...posts.map(p => p.recommend)),
    avgViews: Math.round(posts.reduce((a, p) => a + p.views, 0) / posts.length),
    topPosts,
    categories: categories.filter(c => c.count > 0),
    keywords
  };
}

// Main
const boardType = process.argv[2] || 'freeboard';
const page = parseInt(process.argv[3]) || 1;

sendSummary(boardType, page);
