/**
 * 데이터 포맷팅 유틸리티
 */

const Formatter = {
  // 파일 경로 단순화
  simplifyPath(path) {
    if (!path) return '';
    const parts = path.split('\\').pop().split('/').pop();
    return parts;
  },

  // 심볼명 추출
  extractSymbolName(fqcn) {
    if (!fqcn) return '';
    return fqcn.includes('::') ? fqcn.split('::').pop() : fqcn;
  },

  // 심볼 타입별 아이콘
  getSymbolIcon(type) {
    const icons = {
      'class': '🔷',
      'function': '🟠',
      'method': '🟢',
      'interface': '💜',
      'trait': '🔵',
      'property': '⚪'
    };
    return icons[type] || '⚪';
  },

  // 깊이별 색상
  getDepthColor(depth, maxDepth = 10) {
    const ratio = Math.min(depth / maxDepth, 1);
    const hue = (1 - ratio) * 120; // 녹색(120) ~ 빨강(0)
    return `hsl(${hue}, 70%, 50%)`;
  },

  // 시간 포맷
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },

  // 숫자 포맷 (1,000 형식)
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};
