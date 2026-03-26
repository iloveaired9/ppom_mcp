/**
 * Index Management Panel Component
 * 색인 상태 조회, 재생성, 캐시 관리 등을 제공하는 UI 컴포넌트
 */

class IndexManagementPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.api = api;
    this.autoRefreshInterval = null;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.loadStatus();

    // 10초마다 상태 자동 갱신
    this.autoRefreshInterval = setInterval(() => {
      this.loadStatus();
    }, 10000);
  }

  render() {
    this.container.innerHTML = `
      <div class="index-management-panel">
        <h2>🔧 색인 관리</h2>
        <p class="subtitle">PHP Index 색인의 상태를 확인하고 관리하세요</p>

        <!-- 색인 상태 정보 -->
        <div id="index-status-section" class="section">
          <h3>📊 색인 상태 정보</h3>
          <div id="index-loading" class="loading-indicator active">
            <div class="spinner"></div>
            <span>색인 상태 로딩 중...</span>
          </div>
          <div id="index-info-container" style="display: none;">
            <!-- 위치 정보 (1행) -->
            <div class="index-info-location">
              <div class="location-box">
                <div class="location-label">🎯 색인 파일 위치</div>
                <div class="location-value" id="info-path">-</div>
              </div>
              <div class="location-box">
                <div class="location-label">📂 소스 폴더 위치</div>
                <div class="location-value" id="info-source-dir">-</div>
              </div>
            </div>

            <!-- 상세 정보 (2행) -->
            <div class="index-info-grid">
              <div class="index-info-box">
                <div class="label">💾 파일 크기</div>
                <div class="value" id="info-size">-</div>
              </div>
              <div class="index-info-box">
                <div class="label">📈 심볼 수</div>
                <div class="value" id="info-symbols">-</div>
              </div>
              <div class="index-info-box">
                <div class="label">⏰ 생성 시간</div>
                <div class="value" id="info-created">-</div>
              </div>
              <div class="index-info-box">
                <div class="label">📊 커버리지</div>
                <div class="value" id="info-coverage">-</div>
              </div>
            </div>
            <div id="index-error" class="error-message" style="display: none;"></div>
          </div>
        </div>

        <!-- 통계 정보 -->
        <div id="index-stats-section" class="section" style="display: none;">
          <h3>📈 통계 정보</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">함수</span>
              <span class="stat-value" id="stat-functions">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">클래스</span>
              <span class="stat-value" id="stat-classes">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">파일</span>
              <span class="stat-value" id="stat-files">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">라인</span>
              <span class="stat-value" id="stat-lines">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">인코딩</span>
              <span class="stat-value" id="stat-encoding">UTF-8</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">버전</span>
              <span class="stat-value" id="stat-version">1.0.0</span>
            </div>
          </div>
        </div>

        <!-- 소스 폴더 변경 -->
        <div class="section">
          <h3>📂 소스 폴더 변경</h3>
          <div class="source-dir-input-group">
            <input
              type="text"
              id="source-dir-input"
              class="source-dir-input"
              placeholder="예: work/mobile, /path/to/php/files"
              value="work/mobile"
            >
            <button id="btn-change-source" class="btn btn-secondary">
              <span class="btn-icon">📁</span>
              <span class="btn-text">경로 변경 및 재색인</span>
            </button>
          </div>
          <small class="help-text">새로운 소스 폴더 경로를 입력하고 버튼을 클릭하면 해당 폴더를 색인화합니다.</small>
        </div>

        <!-- 관리 도구 -->
        <div class="section">
          <h3>🔨 관리 도구</h3>
          <div class="action-buttons">
            <button id="btn-rebuild" class="btn btn-primary">
              <span class="btn-icon">⚙️</span>
              <span class="btn-text">현재 경로 재색인</span>
            </button>
            <button id="btn-clear-cache" class="btn btn-secondary">
              <span class="btn-icon">🗑️</span>
              <span class="btn-text">캐시 삭제</span>
            </button>
            <button id="btn-export" class="btn btn-secondary">
              <span class="btn-icon">📥</span>
              <span class="btn-text">내보내기</span>
            </button>
          </div>
          <div id="export-menu" class="export-menu" style="display: none;">
            <button class="export-option" data-format="json">📄 JSON으로 내보내기</button>
            <button class="export-option" data-format="csv">📋 CSV로 내보내기</button>
          </div>
        </div>

        <!-- 진행률 -->
        <div id="rebuild-progress" class="rebuild-progress" style="display: none;">
          <div class="progress-info">
            <span class="progress-label">색인 재생성 중...</span>
            <span class="progress-percent" id="progress-percent">0%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill" style="width: 0%;"></div>
          </div>
        </div>

        <!-- 마지막 갱신 시간 -->
        <div class="footer">
          <small id="last-update">ℹ️ 마지막 갱신: 방금 전</small>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // 재색인 버튼
    document.getElementById('btn-rebuild').addEventListener('click', () => {
      if (confirm('색인을 재생성하시겠습니까? 이 작업은 시간이 걸릴 수 있습니다.')) {
        this.rebuildIndex();
      }
    });

    // 캐시 삭제 버튼
    document.getElementById('btn-clear-cache').addEventListener('click', () => {
      if (confirm('캐시를 삭제하시겠습니까?')) {
        this.clearCache();
      }
    });

    // 소스 폴더 변경 및 재색인 버튼
    document.getElementById('btn-change-source').addEventListener('click', () => {
      const sourceDir = document.getElementById('source-dir-input').value.trim();
      if (!sourceDir) {
        this.showError('소스 폴더 경로를 입력해주세요.');
        return;
      }
      if (confirm(`소스 폴더를 "${sourceDir}"로 변경하고 재색인하시겠습니까?\n이 작업은 시간이 걸릴 수 있습니다.`)) {
        this.rebuildIndexWithSourceDir(sourceDir);
      }
    });

    // 내보내기 버튼
    document.getElementById('btn-export').addEventListener('click', (e) => {
      const menu = document.getElementById('export-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    });

    // 내보내기 옵션
    document.querySelectorAll('.export-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const format = e.target.getAttribute('data-format');
        this.exportIndex(format);
        document.getElementById('export-menu').style.display = 'none';
      });
    });

    // 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', () => {
      document.getElementById('export-menu').style.display = 'none';
    });
  }

  async loadStatus() {
    try {
      this.showLoading(true);
      const response = await fetch('/api/index/status');
      const data = await response.json();

      if (data.success) {
        this.displayStatus(data.data);
        this.loadStats();
      } else {
        this.showError(data.error || '상태 조회 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async loadStats() {
    try {
      const response = await fetch('/api/index/stats');
      const data = await response.json();

      if (data.success) {
        this.displayStats(data.data);
      }
    } catch (error) {
      console.error('Statistics loading error:', error);
    }
  }

  displayStatus(data) {
    const container = document.getElementById('index-info-container');
    const statsSection = document.getElementById('index-stats-section');

    if (!data.exists) {
      container.style.display = 'none';
      statsSection.style.display = 'none';
      this.showError('색인이 아직 생성되지 않았습니다. 재색인 버튼을 클릭하세요.');
      return;
    }

    container.style.display = 'block';
    statsSection.style.display = 'block';

    // 정보 채우기
    document.getElementById('info-path').textContent = data.path || '-';
    document.getElementById('info-source-dir').textContent = data.sourceDir || '-';
    document.getElementById('info-size').textContent = data.size || '-';
    document.getElementById('info-symbols').textContent = (data.symbols || 0).toLocaleString();
    document.getElementById('info-created').textContent = this.formatDate(data.createdAt);
    document.getElementById('info-coverage').textContent = data.coverage || '-';

    // 마지막 갱신 시간
    const lastUpdate = new Date(data.lastModified);
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffMins = Math.floor(diffMs / 60000);
    const timeStr = diffMins === 0 ? '방금 전' : `${diffMins}분 전`;
    document.getElementById('last-update').textContent = `ℹ️ 마지막 갱신: ${timeStr}`;

    // 재색인 중 상태
    if (data.isRebuilding) {
      document.getElementById('rebuild-progress').style.display = 'block';
    } else {
      document.getElementById('rebuild-progress').style.display = 'none';
    }

    document.getElementById('index-error').style.display = 'none';
  }

  displayStats(data) {
    if (!data.exists) return;

    document.getElementById('stat-functions').textContent = (data.byType?.function || 0).toLocaleString();
    document.getElementById('stat-classes').textContent = (data.byType?.class || 0).toLocaleString();
    document.getElementById('stat-files').textContent = (data.totalFiles || 0).toLocaleString();
    document.getElementById('stat-lines').textContent = (data.metadata?.totalLines || 0).toLocaleString();
    document.getElementById('stat-version').textContent = data.metadata?.version || '1.0.0';
  }

  async rebuildIndex() {
    try {
      this.showLoading(true);
      document.getElementById('rebuild-progress').style.display = 'block';

      const response = await fetch('/api/index/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('색인 재생성이 시작되었습니다');

        // 진행률 시뮬레이션
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 95) progress = 95;

          document.getElementById('progress-fill').style.width = Math.floor(progress) + '%';
          document.getElementById('progress-percent').textContent = Math.floor(progress) + '%';

          if (progress > 95) {
            clearInterval(interval);
            this.loadStatus();
          }
        }, 500);

        // 5초 후 상태 재확인
        setTimeout(() => this.loadStatus(), 5000);
      } else {
        this.showError(data.error || '재색인 시작 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async rebuildIndexWithSourceDir(sourceDir) {
    try {
      this.showLoading(true);
      document.getElementById('rebuild-progress').style.display = 'block';

      const response = await fetch('/api/index/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, sourceDir: sourceDir })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(`"${sourceDir}" 경로의 색인 재생성이 시작되었습니다`);

        // 진행률 시뮬레이션
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 95) progress = 95;

          document.getElementById('progress-fill').style.width = Math.floor(progress) + '%';
          document.getElementById('progress-percent').textContent = Math.floor(progress) + '%';

          if (progress > 95) {
            clearInterval(interval);
            this.loadStatus();
          }
        }, 500);

        // 5초 후 상태 재확인
        setTimeout(() => this.loadStatus(), 5000);
      } else {
        this.showError(data.error || '재색인 시작 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async clearCache() {
    try {
      this.showLoading(true);

      const response = await fetch('/api/index/cache', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess(data.message || '캐시가 삭제되었습니다');
        this.loadStatus();
      } else {
        this.showError(data.error || '캐시 삭제 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async exportIndex(format) {
    try {
      const response = await fetch(`/api/index/export?format=${format}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `php-index.${format === 'json' ? 'json' : 'csv'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.showSuccess('파일이 다운로드되었습니다');
      } else {
        this.showError('내보내기 실패');
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  showLoading(show) {
    const loading = document.getElementById('index-loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('index-error');
    if (errorDiv) {
      errorDiv.textContent = `❌ ${message}`;
      errorDiv.style.display = 'block';
    }
  }

  showSuccess(message) {
    // 토스트 메시지 표시 (기존 패턴 사용)
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = `✅ ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR');
  }

  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }
}

// 전역 변수로 등록
const indexManagementPanel = window.indexManagementPanel = new IndexManagementPanel('index-management-container');
