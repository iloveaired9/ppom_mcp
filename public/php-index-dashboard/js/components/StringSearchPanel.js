/**
 * String Search Panel Component
 * PHP 코드에서 문자열을 검색하는 패널
 */

class StringSearchPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.api = api;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const html = `
      <div class="string-search-panel">
        <div class="panel-header">
          <h2>🔍 문자열 검색</h2>
          <p class="subtitle">PHP 코드에서 특정 문자열을 검색하세요</p>
          <div class="index-info">
            <small>📂 색인 위치: <code>work/mobile</code></small>
            <small>💾 저장소: <code>./plugins/php-string-finder/output/string-index.json</code></small>
          </div>
        </div>

        <div class="search-form">
          <div class="form-group">
            <label for="string-search-input">검색어:</label>
            <div class="input-wrapper">
              <input
                type="text"
                id="string-search-input"
                placeholder="예: 옥션 책 정보"
                class="search-input"
              />
              <button id="string-search-btn" class="btn btn-primary">검색</button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="string-search-type">검색 타입:</label>
              <select id="string-search-type" class="form-select">
                <option value="search">모든 라인 (기본값)</option>
                <option value="function-content">함수 내용</option>
                <option value="comment">주석만</option>
              </select>
            </div>

            <div class="form-group">
              <label for="string-search-limit">결과 제한:</label>
              <input
                type="number"
                id="string-search-limit"
                value="20"
                min="1"
                max="100"
                class="form-input-number"
              />
            </div>

            <div class="form-group checkbox">
              <input
                type="checkbox"
                id="string-search-case-sensitive"
              />
              <label for="string-search-case-sensitive">대소문자 구분</label>
            </div>
          </div>

          <div class="button-group">
            <button id="string-index-btn" class="btn btn-secondary">색인 생성</button>
            <button id="string-analyze-btn" class="btn btn-secondary">분석</button>
          </div>
        </div>

        <!-- 로딩 인디케이터 -->
        <div id="string-search-loading" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>검색 중...</p>
        </div>

        <!-- 결과 표시 -->
        <div id="string-search-results" class="results-container"></div>

        <!-- 통계 표시 -->
        <div id="string-search-stats" class="stats-container"></div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  attachEventListeners() {
    // 검색 버튼
    document.getElementById('string-search-btn').addEventListener('click', () => {
      this.search();
    });

    // Enter 키로 검색
    document.getElementById('string-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.search();
      }
    });

    // 색인 생성 버튼
    document.getElementById('string-index-btn').addEventListener('click', () => {
      this.buildIndex();
    });

    // 분석 버튼
    document.getElementById('string-analyze-btn').addEventListener('click', () => {
      this.analyze();
    });
  }

  async search() {
    const searchTerm = document.getElementById('string-search-input').value.trim();
    const type = document.getElementById('string-search-type').value;
    const limit = document.getElementById('string-search-limit').value;
    const caseSensitive = document.getElementById('string-search-case-sensitive').checked;

    if (!searchTerm) {
      alert('검색어를 입력해주세요');
      return;
    }

    this.showLoading(true);

    try {
      const params = new URLSearchParams({
        q: searchTerm,
        type,
        limit,
        caseSensitive
      });

      const response = await fetch(`/api/search/string?${params}`);
      const data = await response.json();

      if (data.success) {
        this.displayResults(data);
      } else {
        this.showError(data.error || '검색 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayResults(data) {
    const resultsContainer = document.getElementById('string-search-results');
    const { searchTerm, resultCount, results } = data;

    if (resultCount === 0) {
      resultsContainer.innerHTML = '<p class="no-results">검색 결과가 없습니다</p>';
      return;
    }

    let html = `
      <div class="results-header">
        <h3>📄 검색 결과: "${searchTerm}" (${resultCount}개)</h3>
      </div>
      <table class="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>파일</th>
            <th>라인</th>
            <th>함수명</th>
            <th>타입</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
    `;

    results.forEach((result, idx) => {
      const content = (result.content || '').substring(0, 60).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `
        <tr class="result-row" data-file="${result.file}" data-line="${result.line}">
          <td>${idx + 1}</td>
          <td><code>${result.file}</code></td>
          <td>${result.line}</td>
          <td><code>${result.functionName || '-'}</code></td>
          <td><span class="badge badge-${result.type}">${result.type}</span></td>
          <td><code class="content-preview">${content}</code></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    resultsContainer.innerHTML = html;

    // 행 클릭 이벤트
    document.querySelectorAll('.result-row').forEach(row => {
      row.addEventListener('click', () => {
        const file = row.dataset.file;
        const line = row.dataset.line;
        this.openFile(file, line);
      });
    });
  }

  async buildIndex() {
    if (!confirm('색인을 생성하시겠습니까? (시간이 걸릴 수 있습니다)')) {
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch('/api/string/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ 색인 생성 완료!\n처리: ${data.result.processed}개 파일\n총 문자열: ${data.result.totalStrings}개`);
      } else {
        this.showError(data.error || '색인 생성 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async analyze() {
    this.showLoading(true);

    try {
      const response = await fetch('/api/string/analyze');
      const data = await response.json();

      if (data.success) {
        this.displayAnalysis(data.analysis);
      } else {
        this.showError(data.error || '분석 실패');
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.showLoading(false);
    }
  }

  displayAnalysis(analysis) {
    const statsContainer = document.getElementById('string-search-stats');

    let html = `
      <div class="analysis-section">
        <h3>📊 색인 분석 결과</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${analysis.totalStrings}</div>
            <div class="stat-label">총 문자열</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analysis.totalOccurrences}</div>
            <div class="stat-label">총 출현 횟수</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analysis.totalFiles}</div>
            <div class="stat-label">처리된 파일</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(analysis.totalOccurrences / analysis.totalStrings).toFixed(1)}</div>
            <div class="stat-label">평균 출현</div>
          </div>
        </div>
    `;

    if (analysis.topStrings && analysis.topStrings.length > 0) {
      html += `
        <div class="top-strings-section">
          <h4>🔝 상위 10개 문자열</h4>
          <table class="top-strings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>문자열</th>
                <th>개수</th>
                <th>파일 수</th>
              </tr>
            </thead>
            <tbody>
      `;

      analysis.topStrings.forEach((item, idx) => {
        html += `
          <tr>
            <td>${idx + 1}</td>
            <td><code>${item.string}</code></td>
            <td>${item.count}</td>
            <td>${item.files.length}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    html += '</div>';
    statsContainer.innerHTML = html;
  }

  openFile(file, line) {
    // 이벤트 발생 (다른 패널에서 처리할 수 있도록)
    const event = new CustomEvent('file-selected', {
      detail: { file, line }
    });
    document.dispatchEvent(event);
  }

  showLoading(show) {
    const loading = document.getElementById('string-search-loading');
    if (show) {
      loading.style.display = 'flex';
    } else {
      loading.style.display = 'none';
    }
  }

  showError(message) {
    const resultsContainer = document.getElementById('string-search-results');
    resultsContainer.innerHTML = `<div class="error-message">❌ ${message}</div>`;
  }
}

// Initialize component
const stringSearchPanel = window.stringSearchPanel = new StringSearchPanel('string-search-container');

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StringSearchPanel;
}
