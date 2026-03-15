#!/usr/bin/env node

const fs = require('fs');
const jsonFile = process.argv[2];
const csvFile = process.argv[3];
const pageNum = process.argv[4] || 1;

try {
  const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const posts = jsonData.data.posts;
  const boardId = jsonData.data.boardId || 'unknown';

  // CSV 헤더
  let csv = '게시물번호,제목,작성자,시간,조회,추천\n';

  // CSV 데이터
  posts.forEach(post => {
    const title = post.title.replace(/"/g, '""'); // CSV 이스케이프
    const recommend = post.recommend || '';
    csv += `${post.no},"${title}",${post.author},${post.date},${post.views},"${recommend}"\n`;
  });

  fs.writeFileSync(csvFile, csv);

  // 게시판별 카테고리 분류
  let categories = {
    '정치/검찰': /검찰|윤석열|이재명|민주당|국민의힘|오세훈|이준석/i,
    '경제/투자': /현대차|주식|투자|포인트|갤럭시|파이어족/i,
    '스포츠': /야구|WBC|경기|선수/i,
    '기타': /.*/
  };

  // 야구 게시판 특화 분석
  if (boardId === 'baseball' || posts.some(p => /^\[/.test(p.title))) {
    categories = {
      '일반': /\[일반\]/i,
      '정보': /\[정보\]/i,
      '질문': /\[질문\]/i,
      '해외': /\[해외\]/i,
      '팀': /\[롯데\]|\[삼성\]|\[LG\]|\[두산\]|\[KIA\]|\[SK\]|\[한화\]|\[NC\]|\[KT\]|\[SSG\]/i,
      '기타': /.*/
    };
  }

  const categoryCounts = {};
  Object.keys(categories).forEach(cat => categoryCounts[cat] = 0);

  posts.forEach(p => {
    for (const [cat, regex] of Object.entries(categories)) {
      if (regex.test(p.title)) {
        categoryCounts[cat]++;
        return;
      }
    }
  });

  // 키워드 추출 (게시판별 처리)
  const wordFreq = {};

  if (boardId === 'baseball' || posts.some(p => /^\[/.test(p.title))) {
    // 야구 게시판: 작성자 활동도 분석
    const authorCount = {};
    posts.forEach(p => {
      authorCount[p.author] = (authorCount[p.author] || 0) + 1;
      // 태그 추출
      const tag = p.title.match(/\[([^\]]+)\]/);
      if (tag) {
        const tagName = tag[1];
        wordFreq[`[${tagName}]`] = (wordFreq[`[${tagName}]`] || 0) + 1;
      }
    });

    // 활동 저자 추가
    Object.entries(authorCount).forEach(([author, count]) => {
      if (count > 1) {
        wordFreq[`👤 ${author}`] = count;
      }
    });
  } else {
    // 일반 게시판: 제목 키워드 추출
    posts.forEach(p => {
      const words = p.title.match(/[가-힣]{2,}/g) || [];
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
    });
  }

  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 상위 게시물
  const topPosts = posts
    .filter(p => p.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // 마크다운 생성
  let md = '# 📊 뽐뿌 자유게시판 현황 분석\n\n';
  const now = new Date().toISOString();
  md += `**분석 시간**: ${now}\n`;
  md += `**페이지**: ${pageNum}\n`;
  md += `**총 게시물**: ${posts.length}개\n\n`;

  md += '## 🎯 핵심 요약\n\n';
  md += '| 지표 | 값 |\n';
  md += '|------|-----|\n';
  const maxCat = Object.entries(categoryCounts)
    .filter(([k]) => k !== '기타')
    .sort((a, b) => b[1] - a[1])[0];
  md += `| 가장 많은 카테고리 | ${maxCat[0]} (${maxCat[1]}개) |\n`;
  md += `| 최고 조회 | ${topPosts[0]?.views || 0}회 |\n`;
  md += `| 최고 추천 | ${topPosts[0]?.recommend || '-'} |\n`;
  md += `| 분석 시간 | ${now.split('T')[1].split('.')[0]} |\n\n`;

  md += '## 📊 카테고리별 분포\n\n';
  md += '| 카테고리 | 게시물 | 비율 |\n';
  md += '|---------|--------|------|\n';
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    const pct = ((count / posts.length) * 100).toFixed(1);
    md += `| ${cat} | ${count} | ${pct}% |\n`;
  });
  md += '\n';

  md += '## 🔥 핵심 키워드 (TOP 10)\n\n';
  topKeywords.forEach((kw, i) => {
    md += `${i + 1}. **${kw[0]}** - ${kw[1]}회\n`;
  });
  md += '\n';

  md += '## 🏆 최고 조회 게시물 (TOP 5)\n\n';
  md += '| 순위 | No | 제목 | 조회 | 작성자 |\n';
  md += '|-----|-----|------|------|--------|\n';
  topPosts.forEach((p, i) => {
    const title = p.title.substring(0, 30) + (p.title.length > 30 ? '...' : '');
    md += `| ${i + 1} | ${p.no} | ${title} | ${p.views} | ${p.author} |\n`;
  });
  md += '\n';

  md += '## ⏰ 시간대 분석\n\n';
  const hourCounts = {};
  posts.forEach(p => {
    if (p.time) {
      const hour = p.time.substring(0, 2);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  if (Object.keys(hourCounts).length > 0) {
    Object.entries(hourCounts)
      .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
      .slice(0, 5)
      .forEach(([hour, count]) => {
        const pct = ((count / posts.length) * 100).toFixed(1);
        md += `- **${hour}:00대**: ${count}개 (${pct}%)\n`;
      });
  } else {
    md += '시간대 데이터 없음\n';
  }

  console.log(md);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
