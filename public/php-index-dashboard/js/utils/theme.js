/**
 * 테마 관리 (라이트모드만 지원)
 */

class Theme {
  constructor() {
    this.initTheme();
  }

  initTheme() {
    // 항상 라이트모드 사용
    document.documentElement.classList.remove('dark-mode');
  }
}

// 초기화
const theme = new Theme();
