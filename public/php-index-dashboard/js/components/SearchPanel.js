/**
 * 검색 패널 컴포넌트
 */

class SearchPanel {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchType = document.getElementById('search-type');
    this.resultsList = document.getElementById('results-list');
    this.selectedSymbol = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // 검색 입력
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 0) {
        this.search(query);
      } else {
        this.clearResults();
      }
    });

    // 타입 변경
    this.searchType.addEventListener('change', (e) => {
      const query = this.searchInput.value.trim();
      if (query.length > 0) {
        this.search(query);
      }
    });
  }

  async search(query) {
    try {
      loadingManager.show(`'${query}' 검색 중...`, 20);

      const type = this.searchType.value;
      const response = await api.search(query, type);

      if (response.success) {
        loadingManager.updateProgress(80);
        let results = response.data.results || [];

        // results가 문자열이면 파싱 (API 호환성)
        if (typeof results === 'string') {
          results = this.parseSearchOutput(results);
        }

        this.displayResults(Array.isArray(results) ? results : []);

        // 캐시 출처 표시
        if (response.data.cached) {
          loadingManager.updateText(`'${query}' (${response.data.cached}에서 로드)`);
          setTimeout(() => loadingManager.hide(), 500);
        } else {
          loadingManager.complete(`${response.data.count}개 결과 찾음`, 600);
        }
      } else {
        this.showError(response.error || '검색 실패');
        loadingManager.error('검색 실패', 1000);
      }
    } catch (error) {
      this.showError(error.message);
      loadingManager.error(`검색 실패: ${error.message}`, 1000);
    }
  }

  displayResults(results) {
    this.resultsList.innerHTML = '';

    if (results.length === 0) {
      this.resultsList.innerHTML = '<div class="empty-state"><p>결과 없음</p></div>';
      return;
    }

    results.forEach((result) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = `
        <div>
          <strong>${Formatter.getSymbolIcon(result.type)} ${Formatter.extractSymbolName(result.name)}</strong>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
            ${result.file || ''}
            ${result.line ? `:${result.line}` : ''}
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectResult(result, item);
      });

      this.resultsList.appendChild(item);
    });
  }

  selectResult(result, element) {
    // 이전 선택 해제
    document.querySelectorAll('.result-item').forEach(item => {
      item.classList.remove('active');
    });

    // 새 선택
    element.classList.add('active');
    this.selectedSymbol = result.name;

    // 상세 정보 및 그래프 로드
    this.loadSymbolDetails(result);
  }

  async loadSymbolDetails(result) {
    try {
      loadingManager.show('그래프 로드 중...', 30);

      // 호출자 그래프 로드
      const callersResponse = await api.getCallers(result.name);
      if (callersResponse.success) {
        if (window.graphRenderer) {
          loadingManager.updateProgress(60);
          window.graphRenderer.render(callersResponse.data);
        }
      }

      // 순환 의존성 로드 (비동기, 병렬)
      const circularResponse = await api.getCircular();
      if (circularResponse.success) {
        if (window.graphRenderer) {
          loadingManager.updateProgress(80);
          window.graphRenderer.displayCircular(circularResponse.data);
        }
      }

      // 상세 정보 표시
      this.displaySymbolInfo(result);

      // 코드 뷰어에서 코드 로드
      if (window.codeViewer) {
        window.codeViewer.render(result.name, result);
      }

      loadingManager.complete('그래프 로드 완료', 500);
    } catch (error) {
      console.error('Failed to load symbol details:', error);
      loadingManager.error(`그래프 로드 실패: ${error.message}`, 1000);
    }
  }

  displaySymbolInfo(result) {
    const infoElement = document.getElementById('symbol-info');
    infoElement.innerHTML = `
      <div class="info-item">
        <label>이름</label>
        <value>${result.name}</value>
      </div>
      <div class="info-item">
        <label>타입</label>
        <value>${result.type}</value>
      </div>
      <div class="info-item">
        <label>파일</label>
        <value style="word-break: break-all;">${result.file}</value>
      </div>
      ${result.line ? `
        <div class="info-item">
          <label>라인</label>
          <value>${result.line}</value>
        </div>
      ` : ''}
    `;
  }

  clearResults() {
    this.resultsList.innerHTML = '<div class="empty-state"><p>검색 결과가 여기에 표시됩니다</p><small>심볼 이름을 입력해서 검색하세요</small></div>';
    this.selectedSymbol = null;
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = `⚠️ ${message}`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = `✅ ${message}`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }

  parseSearchOutput(output) {
    const results = [];
    if (!output || typeof output !== 'string') return results;

    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 결과 항목 찾기: "1. SymbolName (type)"
      const itemMatch = line.match(/^\d+\.\s+([^\s]+)\s+\(([^)]+)\)/);
      if (itemMatch) {
        const [, name, type] = itemMatch;

        // 파일과 라인 번호 찾기
        let file = '';
        let lineNum = '';

        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (nextLine.includes('📄')) {
            // 📄 다음의 모든 내용 추출
            const startIdx = nextLine.indexOf('📄') + 2;
            let content = nextLine.substring(startIdx).trim();

            // 점수 정보 제거
            content = content.split('📏')[0].trim();

            // 마지막의 :숫자 패턴 찾기
            const lastColonIdx = content.lastIndexOf(':');
            if (lastColonIdx > 0) {
              const afterColon = content.substring(lastColonIdx + 1).trim();
              if (/^\d+$/.test(afterColon)) {
                file = content.substring(0, lastColonIdx).trim();
                lineNum = afterColon;
              } else {
                file = content;
              }
            } else {
              file = content;
            }
            break;
          }
        }

        if (file) {
          results.push({
            name,
            type,
            file: file,
            line: lineNum ? parseInt(lineNum) : undefined
          });
        }
      }
    }

    return results;
  }
}

// 초기화
const searchPanel = window.searchPanel = new SearchPanel();
