/**
 * 쿼리 추출 패널 컴포넌트
 */

class QueryPanel {
  constructor() {
    this.filenameInput = document.getElementById('query-filename-input');
    this.searchBtn = document.getElementById('query-search-btn');
    this.queriesInfo = document.getElementById('queries-info');
    this.autocompleteContainer = document.getElementById('query-autocomplete');
    this.allPhpFiles = [];
    this.selectedIndex = -1;
    this.initEventListeners();
    this.loadPhpFiles();
  }

  initEventListeners() {
    // 입력 필드
    this.filenameInput.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
    });

    this.filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNextOption();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevOption();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          const options = this.autocompleteContainer.querySelectorAll('.autocomplete-item');
          if (options[this.selectedIndex]) {
            this.selectOption(options[this.selectedIndex]);
          }
        } else {
          this.extractQueries();
        }
      } else if (e.key === 'Escape') {
        this.hideAutocomplete();
      }
    });

    this.filenameInput.addEventListener('blur', () => {
      setTimeout(() => this.hideAutocomplete(), 200);
    });

    // 검색 버튼 클릭
    this.searchBtn.addEventListener('click', () => {
      this.extractQueries();
    });
  }

  /**
   * PHP 파일 목록 로드
   */
  async loadPhpFiles() {
    try {
      const response = await api.getPhpFiles();
      if (response.success) {
        this.allPhpFiles = response.files || [];
      }
    } catch (error) {
      console.error('Failed to load PHP files:', error);
    }
  }

  /**
   * 입력 변경 처리
   */
  handleInputChange(value) {
    const query = value.trim().toLowerCase();
    this.selectedIndex = -1;

    if (query.length === 0) {
      this.hideAutocomplete();
      return;
    }

    // 매칭되는 파일 찾기
    const matches = this.allPhpFiles.filter(file =>
      file.name.toLowerCase().includes(query)
    ).slice(0, 10);

    if (matches.length === 0) {
      this.hideAutocomplete();
      return;
    }

    this.displayAutocomplete(matches, query);
  }

  /**
   * 자동완성 표시
   */
  displayAutocomplete(matches, query) {
    let html = '<div class="autocomplete-list">';

    matches.forEach((file, idx) => {
      const highlight = file.name.replace(
        new RegExp(query, 'gi'),
        match => `<strong>${match}</strong>`
      );
      html += `
        <div class="autocomplete-item" data-index="${idx}" data-name="${file.name}">
          <div class="autocomplete-name">${highlight}</div>
          <div class="autocomplete-path">${file.path}</div>
        </div>
      `;
    });

    html += '</div>';
    this.autocompleteContainer.innerHTML = html;
    this.autocompleteContainer.style.display = 'block';

    // 클릭 이벤트
    this.autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectOption(item);
      });
      item.addEventListener('mouseenter', () => {
        this.autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(i => {
          i.classList.remove('active');
        });
        item.classList.add('active');
        this.selectedIndex = parseInt(item.getAttribute('data-index'));
      });
    });
  }

  /**
   * 자동완성 옵션 선택
   */
  selectOption(element) {
    const filename = element.getAttribute('data-name');
    this.filenameInput.value = filename;
    this.hideAutocomplete();
    this.extractQueries();
  }

  /**
   * 다음 옵션 선택
   */
  selectNextOption() {
    const items = this.autocompleteContainer.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (this.selectedIndex < items.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }

    this.updateActiveOption(items);
  }

  /**
   * 이전 옵션 선택
   */
  selectPrevOption() {
    const items = this.autocompleteContainer.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = items.length - 1;
    }

    this.updateActiveOption(items);
  }

  /**
   * 활성 옵션 업데이트
   */
  updateActiveOption(items) {
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * 자동완성 숨기기
   */
  hideAutocomplete() {
    this.autocompleteContainer.style.display = 'none';
    this.selectedIndex = -1;
  }

  /**
   * 쿼리 추출
   */
  async extractQueries() {
    const filename = this.filenameInput.value.trim();

    if (!filename) {
      this.showError('파일명을 입력하세요');
      return;
    }

    try {
      loadingManager.show(`'${filename}' 쿼리 추출 중...`, 30);

      const response = await api.extractQueries(filename);

      if (response.success) {
        loadingManager.updateProgress(80);
        this.displayQueries(response);
        loadingManager.complete(`${response.queryCount}개 쿼리 발견`, 500);
      } else {
        this.showError(response.error || '쿼리 추출 실패');
        loadingManager.error('쿼리 추출 실패', 1000);
      }
    } catch (error) {
      this.showError(error.message);
      loadingManager.error(`쿼리 추출 실패: ${error.message}`, 1000);
    }
  }

  /**
   * 쿼리 결과 표시
   */
  displayQueries(data) {
    if (!data.queries || data.queries.length === 0) {
      this.queriesInfo.innerHTML = '<div class="empty-state"><p>⚠️ 쿼리를 찾을 수 없습니다</p></div>';
      return;
    }

    let html = `
      <div class="query-results">
        <div class="query-header">
          <div>
            <p><strong>파일:</strong> ${data.file}</p>
            <p><strong>쿼리 수:</strong> ${data.queryCount}개</p>
          </div>
        </div>
        <table class="query-table">
          <thead>
            <tr>
              <th>#</th>
              <th>라인 범위</th>
              <th>SQL 쿼리</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.queries.forEach((query) => {
      // 마크다운 백틱 제거
      const cleanQuery = query.query.replace(/^`|`$/g, '');
      const queryPreview = cleanQuery.length > 120
        ? cleanQuery.substring(0, 120) + '...'
        : cleanQuery;
      const queryId = `query-${query.index}`;

      html += `
        <tr class="query-row" data-query-id="${queryId}">
          <td>${query.index}</td>
          <td>${query.startLine}-${query.endLine}</td>
          <td>
            <div class="query-cell">
              <code class="query-preview">${this.escapeHtml(queryPreview)}</code>
              <button class="query-expand-btn" data-expanded="false" title="전체 쿼리 보기">📖</button>
            </div>
          </td>
        </tr>
        <tr class="query-detail-row" id="${queryId}" style="display: none;">
          <td colspan="3">
            <div class="query-detail">
              <div class="query-detail-header">
                <strong>전체 SQL 쿼리</strong>
                <button class="query-close-btn">✕</button>
              </div>
              <pre class="query-full-text"><code>${this.escapeHtml(cleanQuery)}</code></pre>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    this.queriesInfo.innerHTML = html;

    // 펼치기/접기 버튼 이벤트
    this.queriesInfo.querySelectorAll('.query-expand-btn').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const queryId = `query-${data.queries[idx].index}`;
        const detailRow = document.getElementById(queryId);
        const isExpanded = btn.getAttribute('data-expanded') === 'true';

        if (isExpanded) {
          detailRow.style.display = 'none';
          btn.setAttribute('data-expanded', 'false');
          btn.textContent = '📖';
        } else {
          detailRow.style.display = 'table-row';
          btn.setAttribute('data-expanded', 'true');
          btn.textContent = '📕';
        }
      });
    });

    // 닫기 버튼 이벤트
    this.queriesInfo.querySelectorAll('.query-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const detailRow = btn.closest('.query-detail-row');
        const queryId = detailRow.id;
        const expandBtn = this.queriesInfo.querySelector(`[data-query-id="${queryId}"] .query-expand-btn`);

        detailRow.style.display = 'none';
        expandBtn.setAttribute('data-expanded', 'false');
        expandBtn.textContent = '📖';
      });
    });
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = `⚠️ ${message}`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 초기화
const queryPanel = window.queryPanel = new QueryPanel();
