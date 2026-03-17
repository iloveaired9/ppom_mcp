/**
 * 통계 패널 컴포넌트
 */

class StatsPanel {
  constructor() {
    this.statsElement = document.getElementById('stats-info');
    this.loadStats();
  }

  async loadStats() {
    try {
      const response = await api.getStats();

      if (response.success) {
        this.displayStats(response.data);
        this.updateHeaderStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.statsElement.innerHTML = '<p class="empty">통계를 불러올 수 없습니다</p>';
    }
  }

  displayStats(stats) {
    // 기본 통계 표시
    let html = '';

    if (stats.totalFiles !== undefined) {
      html += `
        <div class="info-item">
          <label>총 파일 수</label>
          <value>${Formatter.formatNumber(stats.totalFiles)}</value>
        </div>
      `;
    }

    if (stats.totalSymbols !== undefined) {
      html += `
        <div class="info-item">
          <label>총 심볼 수</label>
          <value>${Formatter.formatNumber(stats.totalSymbols)}</value>
        </div>
      `;
    }

    if (stats.buildTime !== undefined) {
      html += `
        <div class="info-item">
          <label>빌드 시간</label>
          <value>${Formatter.formatTime(stats.buildTime)}</value>
        </div>
      `;
    }

    if (stats.namespaces) {
      html += `
        <div class="info-item">
          <label>네임스페이스</label>
          <value>${stats.namespaces.length > 0 ? stats.namespaces.join(', ') : 'None'}</value>
        </div>
      `;
    }

    // 색인 재구성 버튼
    html += `
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button id="rebuild-btn" style="
          flex: 1;
          padding: 8px 12px;
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">🔄 색인 재구성</button>
      </div>
    `;

    this.statsElement.innerHTML = html;

    // 재구성 버튼 이벤트
    const rebuildBtn = document.getElementById('rebuild-btn');
    if (rebuildBtn) {
      rebuildBtn.addEventListener('click', () => this.rebuildIndex());
    }
  }

  async rebuildIndex() {
    if (!confirm('색인을 재구성하시겠습니까? (시간이 소요될 수 있습니다)')) {
      return;
    }

    try {
      const rebuildBtn = document.getElementById('rebuild-btn');
      rebuildBtn.disabled = true;
      rebuildBtn.textContent = '⏳ 재구성 중...';

      const response = await api.rebuildIndex(false);

      if (response.success) {
        this.showToast('색인 재구성 완료', 'success');
        // 통계 새로고침
        this.loadStats();
      } else {
        this.showToast('색인 재구성 실패', 'error');
      }
    } catch (error) {
      this.showToast(`오류: ${error.message}`, 'error');
    } finally {
      const rebuildBtn = document.getElementById('rebuild-btn');
      if (rebuildBtn) {
        rebuildBtn.disabled = false;
        rebuildBtn.textContent = '🔄 색인 재구성';
      }
    }
  }

  updateHeaderStats(stats) {
    // 헤더 통계 업데이트
    if (stats.totalFiles) {
      document.getElementById('stat-files').textContent = Formatter.formatNumber(stats.totalFiles);
    }

    if (stats.totalSymbols) {
      document.getElementById('stat-symbols').textContent = Formatter.formatNumber(stats.totalSymbols);
    }

    if (stats.buildTime) {
      document.getElementById('stat-time').textContent = stats.buildTime;
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

// 초기화
const statsPanel = window.statsPanel = new StatsPanel();
