#!/usr/bin/env node

/**
 * 뽐뿌 자유게시판 현황 분석 스크립트
 * 사용: node scripts/analyze-freeboard.js [csv파일경로]
 */

const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2] || 'freeboard.csv';

if (!fs.existsSync(csvPath)) {
  console.error(`❌ 파일을 찾을 수 없습니다: ${csvPath}`);
  process.exit(1);
}

// ===== CSV 파싱 =====
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const content = fs.readFileSync(csvPath, 'utf8').trim();
const lines = content.split('\n');

const posts = [];
for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  if (fields.length >= 7 && fields[0]) {
    posts.push({
      no: fields[0].trim(),
      title: fields[1].trim(),
      author: fields[2].trim(),
      date: fields[3].trim(),
      recommend: fields[4].trim(),
      views: fields[5].trim(),
      url: fields[6].trim()
    });
  }
}

// ===== 분석 함수들 =====

function categorizePosts(posts) {
  const categories = {
    '정치/검찰개혁': /검찰|대통령|윤석열|이재명|여당|야당|민주당|정권|검찰개혁|의원|국무/gi,
    '국제 이슈': /호르무즈|이란|미국|이스라엘|중국|해협|해외|외교/gi,
    '스포츠': /야구|WBC|팀|경기|도미니카|선수|게임/gi,
    '연예/종교': /김어준|신천지|영화|드라마|반지의제왕|포도원|교회|종교/gi,
    '경제/쇼핑': /포인트|네이버|페이|쿠폰|다만|비행택시|상품/gi,
    '생활': /일상|고민|의견|분열|망상|하소연|이야기|마음|지겨움/gi
  };

  const classified = {};
  Object.keys(categories).forEach(cat => classified[cat] = []);
  classified['기타'] = [];

  posts.forEach(post => {
    let found = false;
    for (const [category, regex] of Object.entries(categories)) {
      if (regex.test(post.title)) {
        classified[category].push(post);
        found = true;
        break;
      }
    }
    if (!found) {
      classified['기타'].push(post);
    }
  });

  return classified;
}

function extractKeywords(posts) {
  const stopwords = ['의', '를', '가', '이', '을', '으로', '에', '에게', '들', '한', '하는', '입니다', '있는', '있습니다', '없나', '없다', '아니고', '아니면', '없지', '없으니', '네요', '인가', '이게', '그', '저', '뭔가', '뭔데', '것', '나', '다', '기', '해'];

  const keywords = {};
  posts.forEach(post => {
    // 제목에서 한글 추출 및 분석
    const words = post.title
      .replace(/[\[\]()'"]/g, '')
      .split(/\s|[^가-힣a-zA-Z0-9]/);

    words.forEach(word => {
      if (word.length > 1 && !stopwords.includes(word)) {
        keywords[word] = (keywords[word] || 0) + 1;
      }
    });
  });

  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function getTopPosts(posts, limit = 5) {
  return posts
    .map(p => ({
      no: p.no,
      title: p.title,
      views: parseInt(p.views) || 0,
      recommend: p.recommend ? parseInt(p.recommend.split('-')[0]) || 0 : 0,
      author: p.author,
      url: p.url
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

function analyzeEngagement(posts) {
  const recs = posts.map(p =>
    p.recommend ? parseInt(p.recommend.split('-')[0]) || 0 : 0
  );

  return {
    avgRecommend: (recs.reduce((a, b) => a + b, 0) / posts.length).toFixed(0),
    maxRecommend: Math.max(...recs),
    avgViews: (posts.reduce((sum, p) => sum + (parseInt(p.views) || 0), 0) / posts.length).toFixed(0)
  };
}

function analyzeTimeline(posts) {
  const timeline = {};
  posts.forEach(post => {
    const hour = post.date.substring(0, 2);
    timeline[hour] = (timeline[hour] || 0) + 1;
  });

  return Object.entries(timeline)
    .sort()
    .map(([hour, count]) => ({
      hour,
      count,
      percent: ((count / posts.length) * 100).toFixed(0)
    }));
}

// ===== 마크다운 생성 =====

function generateReport(posts, classified, keywords, topPosts, engagement, timeline) {
  const now = new Date().toISOString().substring(0, 10);

  let md = `# 뽐뿌 자유게시판 현황 분석

**분석 일시**: ${now}\n**분석 대상**: 자유게시판 page 1 (30개 게시물)\n\n`;

  // 핵심 요약
  md += `## 🎯 핵심 요약\n\n`;
  const topCat = Object.entries(classified)
    .sort((a, b) => b[1].length - a[1].length)[0];
  const topCatPercent = ((topCat[1].length / posts.length) * 100).toFixed(0);
  const topTimeline = timeline.sort((a, b) => b.count - a.count)[0];

  md += `- **총 게시물**: ${posts.length}개\n`;
  md += `- **가장 많은 카테고리**: ${topCat[0]} (${topCat[1].length}개, ${topCatPercent}%)\n`;
  md += `- **가장 활발한 시간**: ${topTimeline.hour}:00 ~ ${topTimeline.hour}:59 (${topTimeline.count}개)\n`;
  md += `- **평균 추천수**: ${engagement.avgRecommend}개\n\n`;

  // 카테고리별 분포
  md += `## 📊 카테고리별 분포\n\n`;
  md += `| 카테고리 | 게시물 | 비율 |\n`;
  md += `|---------|--------|------|\n`;

  Object.entries(classified)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([cat, posts]) => {
      const percent = ((posts.length / posts.length) * 100).toFixed(0);
      md += `| ${cat} | ${posts.length} | ${percent}% |\n`;
    });

  md += `\n`;

  // 핵심 키워드
  md += `## 🔥 핵심 키워드 (TOP 10)\n\n`;
  keywords.forEach((kw, idx) => {
    md += `${idx + 1}. **${kw.word}** (${kw.count}회)\n`;
  });
  md += `\n`;

  // 최고 참여도 게시물
  md += `## 🏆 최고 참여도 게시물 (TOP 5)\n\n`;
  md += `| No | 제목 | 작성자 | 조회 | 추천 |\n`;
  md += `|-----|------|--------|------|------|\n`;

  topPosts.forEach(p => {
    const recStr = p.recommend > 0 ? p.recommend : '-';
    md += `| ${p.no} | ${p.title.substring(0, 30)}... | ${p.author} | ${p.views} | ${recStr} |\n`;
  });
  md += `\n`;

  // 참여도 분석
  md += `## 💬 참여도 분석\n\n`;
  md += `| 지표 | 값 |\n`;
  md += `|------|------|\n`;
  md += `| **평균 추천수** | ${engagement.avgRecommend}개 |\n`;
  md += `| **최대 추천수** | ${engagement.maxRecommend}개 |\n`;
  md += `| **평균 조회수** | ${engagement.avgViews}개 |\n`;
  md += `| **활발도** | ${engagement.maxRecommend > 500 ? '높음 ⭐⭐⭐' : engagement.maxRecommend > 100 ? '중간 ⭐⭐' : '낮음 ⭐'} |\n`;
  md += `\n`;

  // 시간대 분석
  md += `## ⏰ 시간대 분석\n\n`;
  md += `| 시간대 | 게시물 | 비율 |\n`;
  md += `|--------|--------|------|\n`;
  timeline.forEach(t => {
    md += `| ${t.hour}:00~${t.hour}:59 | ${t.count}개 | ${t.percent}% |\n`;
  });
  md += `\n`;

  // 해석
  md += `## 📈 주요 해석\n\n`;
  const politicsCount = classified['정치/검찰개혁']?.length || 0;
  const intlCount = classified['국제 이슈']?.length || 0;
  const sportsCount = classified['스포츠']?.length || 0;

  md += `- **정치 이슈가 주요 화제**: 검찰개혁 관련 ${politicsCount}개 게시물\n`;
  if (intlCount > 0) md += `- **국제 분쟁 관심**: 호르무즈 해협, 이란 이슈 ${intlCount}개 게시물\n`;
  if (sportsCount > 0) md += `- **스포츠 관심**: WBC 야구 경기 ${sportsCount}개 게시물\n`;
  md += `- **활발한 야간 활동**: 자정 이후 게시물 집중\n\n`;

  // 푸터
  md += `---\n\n`;
  md += `**자동 생성 보고서**\n`;
  md += `생성 시간: ${new Date().toISOString()}\n`;
  md += `스크립트: \`scripts/analyze-freeboard.js\`\n`;

  return md;
}

// ===== 메인 실행 =====

console.log(`\n📊 뽐뿌 자유게시판 분석 시작...`);
console.log(`📄 파일: ${csvPath}`);
console.log(`📈 게시물: ${posts.length}개\n`);

const classified = categorizePosts(posts);
const keywords = extractKeywords(posts);
const topPosts = getTopPosts(posts);
const engagement = analyzeEngagement(posts);
const timeline = analyzeTimeline(posts);

const report = generateReport(posts, classified, keywords, topPosts, engagement, timeline);

// 파일 저장
const reportPath = 'freeboard-analysis.md';
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`✅ 분석 완료!`);
console.log(`📄 리포트 저장: ${reportPath}\n`);
console.log(report);
