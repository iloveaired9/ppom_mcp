/**
 * PHP Index Generator Dashboard - 메인 애플리케이션
 */

class App {
  constructor() {
    console.log('🚀 PHP Index Dashboard 초기화 중...');

    // 컴포넌트 초기화
    this.initComponents();

    // 탭 전환 이벤트
    this.setupTabSwitching();

    // 초기 데이터 로드
    this.loadInitialData();

    console.log('✅ PHP Index Dashboard 준비 완료');
  }

  initComponents() {
    // API 클라이언트: api (이미 초기화됨)
    // 테마: theme (이미 초기화됨)
    // 포매터: Formatter (이미 초기화됨)
    // 검색 패널: searchPanel (이미 초기화됨)
    // 그래프 렌더러: graphRenderer (이미 초기화됨)
    // 통계 패널: statsPanel (이미 초기화됨)
    // 코드 뷰어: codeViewer (이미 초기화됨)

    // 다크모드 변경 감지
    this.setupThemeListener();
  }

  setupThemeListener() {
    // 다크모드 변경 시 highlight.js 테마도 함께 변경
    const htmlElement = document.documentElement;
    const observer = new MutationObserver(() => {
      this.updateHighlightTheme();
    });

    observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    // 초기 테마 설정
    this.updateHighlightTheme();
  }

  updateHighlightTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark-mode') ||
                      document.documentElement.getAttribute('data-theme') === 'dark';

    const themeLink = document.getElementById('hljs-theme');
    if (themeLink) {
      const theme = isDarkMode
        ? 'atom-one-dark.min.css'
        : 'atom-one-light.min.css';
      themeLink.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${theme}`;
      console.log(`[App] highlight.js 테마 변경: ${theme}`);
    }
  }

  setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');

        // 모든 탭 비활성화
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // 선택한 탭 활성화
        button.classList.add('active');
        const targetPane = document.getElementById(`${tabName}-tab`);
        if (targetPane) {
          targetPane.classList.add('active');
        }
      });
    });
  }

  async loadInitialData() {
    try {
      // 통계 로드 (statsPanel에서 자동 처리)
      // 검색 입력에 포커스
      document.getElementById('search-input').focus();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}

// 애플리케이션 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

// 전역 오류 처리
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
