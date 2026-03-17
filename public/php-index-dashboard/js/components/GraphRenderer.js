/**
 * 호출 그래프 렌더러
 * Phase 2: Cytoscape.js로 고급 시각화
 */

class GraphRenderer {
  constructor() {
    this.container = document.getElementById('graph');
    this.emptyState = document.querySelector('.graph-empty-state');
    this.cy = null;
    this.currentData = null;
  }

  /**
   * 그래프 데이터 렌더링
   */
  render(data) {
    try {
      console.log('[GraphRenderer] render() called with data:', data ? { nodes: data.nodes?.length, edges: data.edges?.length } : null);

      if (!data || !data.nodes || !data.nodes.length) {
        console.log('[GraphRenderer] No data, showing empty state');
        this.showEmpty();
        return;
      }

      // 그래프 컨테이너 준비
      this.container.innerHTML = '';
      this.emptyState.classList.remove('active');
      this.currentData = data;

      // Cytoscape 초기화
      this.initializeCytoscape();
      console.log('[GraphRenderer] Cytoscape initialized, this.cy:', this.cy !== null);

      // 전역 window.cy에도 할당 (테스트용)
      window.cy = this.cy;

      // 데이터 추가
      console.log('[GraphRenderer] Adding nodes and edges...');
      this.cy.add(data.nodes);
      this.cy.add(data.edges);
      console.log('[GraphRenderer] Data added, nodes:', this.cy.nodes().length, 'edges:', this.cy.edges().length);

      // 레이아웃 실행
      const layout = this.cy.layout({
        name: 'cose',
        directed: true,
        animate: true,
        animationDuration: 500,
        nodeSpacing: 5,
        edgeLengthVal: 45,
        fit: true,
        padding: 50
      });
      layout.run();
      console.log('[GraphRenderer] Layout applied');

      // 정보 표시
      this.displayGraphInfo(data);
      console.log('[GraphRenderer] Graph info displayed, render complete');
    } catch (error) {
      console.error('[GraphRenderer] Error in render():', error);
      throw error;
    }
  }

  /**
   * Cytoscape.js 인스턴스 초기화
   */
  initializeCytoscape() {
    try {
      if (this.cy) {
        this.cy.destroy();
      }

      const styles = this.getNodeEdgeStyles();
      console.log(`[GraphRenderer] Creating Cytoscape with ${styles.length} styles`);

      this.cy = cytoscape({
        container: this.container,
        headless: false,
        styleEnabled: true,
        style: styles,
        wheelSensitivity: 0.1
      });

      console.log('[GraphRenderer] Cytoscape instance created successfully');
      this.setupInteractions();
    } catch (error) {
      console.error('[GraphRenderer] Error initializing Cytoscape:', error);
      throw error;
    }
  }

  /**
   * 노드/엣지 스타일 정의 (타입 + 깊이 혼합)
   */
  getNodeEdgeStyles() {
    // 라이트모드 스타일 (라이트모드만 지원)
    const textStyle = {
      'color': '#000000',  // 검정색 텍스트
      'text-background-color': '#ffffff',  // 흰색 배경
      'text-background-opacity': 0.9
    };

    // 깊이별 색상 생성 (같은 타입, 다른 깊이 → 명도 조절)
    const depthColors = {
      class: {
        0: '#8B5CF6', 1: '#7C5CE5', 2: '#6D4DD5', 3: '#5E3EC5', 4: '#4F2FB5', 5: '#4C2C7D'
      },
      function: {
        0: '#F97316', 1: '#F27406', 2: '#EB74F6', 3: '#DC6610', 4: '#CD5408', 5: '#7A3908'
      },
      method: {
        0: '#10B981', 1: '#0FA878', 2: '#0E9B6F', 3: '#0D8E66', 4: '#0C815D', 5: '#064E3B'
      }
    };

    const styles = [];

    // 클래스 노드 - 깊이별 색상
    Object.entries(depthColors.class).forEach(([depth, color]) => {
      styles.push({
        selector: `node[type="class"][depth="${depth}"]`,
        style: {
          'background-color': color,
          'label': 'data(label)',
          'width': 65,
          'height': 65,
          'font-size': 11,
          'font-weight': 'bold',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 80,
          ...textStyle,  // 다크/라이트 모드별 텍스트 스타일 적용
          'text-background-padding': 3,
          'text-background-shape': 'roundrectangle',
          'border-width': 2,
          'border-color': depth === '0' ? '#6D28D9' : '#483974',
          'border-opacity': 0.9,
          'padding': '10px'
        }
      });
    });

    // 함수 노드 - 깊이별 색상
    Object.entries(depthColors.function).forEach(([depth, color]) => {
      styles.push({
        selector: `node[type="function"][depth="${depth}"]`,
        style: {
          'background-color': color,
          'label': 'data(label)',
          'width': 55,
          'height': 55,
          'font-size': 10,
          'font-weight': '600',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 70,
          ...textStyle,  // 다크/라이트 모드별 텍스트 스타일 적용
          'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
          'border-width': 1.5,
          'border-color': depth === '0' ? '#EA580C' : '#8B4513',
          'padding': '8px'
        }
      });
    });

    // 메서드 노드 - 깊이별 색상
    Object.entries(depthColors.method).forEach(([depth, color]) => {
      styles.push({
        selector: `node[type="method"][depth="${depth}"]`,
        style: {
          'background-color': color,
          'label': 'data(label)',
          'width': 55,
          'height': 55,
          'font-size': 10,
          'font-weight': '600',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 70,
          ...textStyle,  // 다크/라이트 모드별 텍스트 스타일 적용
          'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
          'border-width': 1.5,
          'border-color': depth === '0' ? '#059669' : '#2D5C48',
          'padding': '8px'
        }
      });
    });

    // 타입 불명 (기본값)
    styles.push({
      selector: 'node[type="target"]',
      style: {
        'background-color': '#3B82F6',
        'label': 'data(label)',
        'width': 75,
        'height': 75,
        'font-size': 12,
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 65,
        ...textStyle,  // 다크/라이트 모드별 텍스트 스타일 적용
        'text-background-padding': 4,
        'text-background-shape': 'roundrectangle',
        'border-width': 3,
        'border-color': '#1E40AF'
      }
    });

    // 중심 노드 강조
    styles.push({
      selector: 'node[isCenter]',
      style: {
        'width': 85,
        'height': 85,
        'font-size': 13,
        'font-weight': 'bold',
        'border-width': 4,
        'border-color': '#FFD700',
        'text-valign': 'center',
        'text-background-padding': 5
      }
    });

    // 선택된 노드
    styles.push({
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#3B82F6',
        'background-opacity': 1,
        'box-shadow': '0 0 10px rgba(59, 130, 246, 0.5)'
      }
    });

    // 엣지 (일반)
    styles.push({
      selector: 'edge',
      style: {
        'line-color': '#9CA3AF',
        'target-arrow-color': '#9CA3AF',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'line-opacity': 0.6,
        'width': 2,
        'arrow-scale': 1.2
      }
    });

    // 선택된 엣지
    styles.push({
      selector: 'edge:selected',
      style: {
        'line-color': '#3B82F6',
        'target-arrow-color': '#3B82F6',
        'line-opacity': 1,
        'width': 3
      }
    });

    // depth가 없는 function 노드 (기본값)
    styles.push({
      selector: 'node[type="function"]:not([depth])',
      style: {
        'background-color': '#F97316',
        'label': 'data(label)',
        'width': 55,
        'height': 55,
        'font-size': 10,
        'font-weight': '600',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 70,
        'color': '#333333',
        'text-background-color': '#ffffff',
        'text-background-padding': 2,
        'text-background-opacity': 0.95,
        'text-background-shape': 'roundrectangle',
        'border-width': 1.5,
        'border-color': '#EA580C',
        'padding': '8px'
      }
    });

    // depth가 없는 method 노드 (기본값)
    styles.push({
      selector: 'node[type="method"]:not([depth])',
      style: {
        'background-color': '#10B981',
        'label': 'data(label)',
        'width': 55,
        'height': 55,
        'font-size': 10,
        'font-weight': '600',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 70,
        'color': '#333333',
        'text-background-color': '#ffffff',
        'text-background-padding': 2,
        'text-background-opacity': 0.95,
        'text-background-shape': 'roundrectangle',
        'border-width': 1.5,
        'border-color': '#059669',
        'padding': '8px'
      }
    });

    // depth가 없는 class 노드 (기본값)
    styles.push({
      selector: 'node[type="class"]:not([depth])',
      style: {
        'background-color': '#8B5CF6',
        'label': 'data(label)',
        'width': 65,
        'height': 65,
        'font-size': 11,
        'font-weight': 'bold',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 80,
        'color': '#333333',
        'text-background-color': '#ffffff',
        'text-background-padding': 3,
        'text-background-opacity': 0.95,
        'text-background-shape': 'roundrectangle',
        'border-width': 2,
        'border-color': '#6D28D9',
        'padding': '10px'
      }
    });

    // 기본 노드 스타일 (다크/라이트 모드별 텍스트 가독성 보장)
    styles.push({
      selector: 'node',
      style: {
        ...textStyle,  // 다크/라이트 모드별 텍스트 스타일
        'text-opacity': 1
      }
    });

    return styles;
  }

  /**
   * 그래프 인터랙션 설정
   */
  setupInteractions() {
    // 노드 선택 이벤트
    this.cy.on('select', 'node', (event) => {
      const node = event.target;
      this.displayNodeInfo(node.data());
    });

    // 노드 선택 해제
    this.cy.on('unselect', 'node', (event) => {
      this.displayNodeInfo(null);
    });

    // 노드 더블클릭 - 코드 팝업 표시
    this.cy.on('dbltap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      this.showCodeForNode(nodeData);
    });

    // 줌 제한
    this.cy.minZoom(0.3);
    this.cy.maxZoom(5);

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
      if (!this.cy) return;

      switch (e.key.toLowerCase()) {
        case 'r':
          // 리셋
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.cy.fit();
          }
          break;
        case ' ':
          // 팬 모드 토글
          e.preventDefault();
          this.cy.panningEnabled(!this.cy.panningEnabled());
          break;
      }
    });
  }

  /**
   * 노드 정보 표시
   */
  displayNodeInfo(nodeData) {
    const infoElement = document.getElementById('symbol-info');
    if (!infoElement) return;

    if (!nodeData) {
      infoElement.innerHTML = '<p class="empty">노드를 선택하세요</p>';
      return;
    }

    const icon = Formatter.getSymbolIcon(nodeData.type || 'function');
    const typeLabel = {
      'class': '클래스',
      'function': '함수',
      'method': '메서드',
      'property': '속성'
    }[nodeData.type] || '심볼';

    infoElement.innerHTML = `
      <div class="info-item">
        <label>이름</label>
        <value>${icon} ${nodeData.label}</value>
      </div>
      <div class="info-item">
        <label>타입</label>
        <value>${typeLabel}</value>
      </div>
      <div class="info-item">
        <label>ID</label>
        <value style="font-size: 11px; font-family: monospace; word-break: break-all;">${nodeData.id}</value>
      </div>
      ${nodeData.depth !== undefined ? `
      <div class="info-item">
        <label>깊이</label>
        <value>${nodeData.depth}</value>
      </div>
      ` : ''}
    `;
  }

  /**
   * 그래프 정보 표시
   */
  displayGraphInfo(data) {
    const infoElement = document.getElementById('callers-info');
    if (!infoElement) return;

    if (!data) {
      infoElement.innerHTML = '<p class="empty">그래프 정보가 없습니다</p>';
      return;
    }

    const callersCount = data.nodes.filter(n => !n.data.isCenter).length;

    infoElement.innerHTML = `
      <div class="info-item">
        <label>총 노드 수</label>
        <value>${data.metadata.nodeCount}</value>
      </div>
      <div class="info-item">
        <label>총 엣지 수</label>
        <value>${data.metadata.edgeCount}</value>
      </div>
      <div class="info-item">
        <label>호출자 수</label>
        <value>${callersCount}</value>
      </div>
      <div class="info-item">
        <label>처리 시간</label>
        <value>${Formatter.formatTime(data.metadata.executionTime)}</value>
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
        <h4 style="font-size: 12px; margin-bottom: 8px;">노드 타입별</h4>
        <div style="font-size: 11px; color: var(--color-text-muted);">
          <div>🔷 클래스: ${data.nodes.filter(n => n.data.type === 'class').length}개</div>
          <div>🟠 함수: ${data.nodes.filter(n => n.data.type === 'function').length}개</div>
          <div>🟢 메서드: ${data.nodes.filter(n => n.data.type === 'method').length}개</div>
        </div>
      </div>
    `;
  }

  /**
   * 빈 상태 표시
   */
  showEmpty() {
    this.container.innerHTML = '';
    this.emptyState.classList.add('active');
    this.currentData = null;

    const infoElement = document.getElementById('callers-info');
    if (infoElement) {
      infoElement.innerHTML = '<p class="empty">그래프를 로드하세요</p>';
    }
  }

  /**
   * 순환 의존성 표시
   */
  displayCircular(data) {
    const circularElement = document.getElementById('circular-info');
    if (!circularElement) return;

    if (!data || !data.cycles || data.cycles.length === 0) {
      circularElement.innerHTML = '<p class="empty">순환 의존성이 없습니다</p>';
      return;
    }

    // 순환 경로 파싱 및 정리
    const cycles = data.cycles.filter(cycle => cycle && cycle.trim().length > 0);

    if (cycles.length === 0) {
      circularElement.innerHTML = '<p class="empty">순환 의존성이 없습니다</p>';
      return;
    }

    // HTML 생성
    let html = `
      <div class="info-item">
        <label>총 순환 수</label>
        <value>${cycles.length}</value>
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
        <h4 style="font-size: 12px; margin-bottom: 8px;">순환 경로</h4>
        <div style="font-size: 11px; color: var(--color-text); max-height: 300px; overflow-y: auto;">
    `;

    // 각 순환 경로 표시
    cycles.slice(0, 10).forEach((cycle, index) => {
      const symbols = cycle.split('→').map(s => s.trim()).filter(s => s.length > 0);
      const cycleLength = symbols.length;

      html += `
        <div style="padding: 6px; margin: 4px 0; background: var(--color-surface); border-radius: 4px; border-left: 2px solid var(--color-warning);">
          <div style="font-weight: bold; margin-bottom: 2px;">🔄 사이클 #${index + 1} (${cycleLength})</div>
          <div style="word-break: break-word;">${symbols.slice(0, 3).join(' → ')}</div>
          ${symbols.length > 3 ? `<div style="color: var(--color-text-muted);">... (${cycleLength - 2}개 더)</div>` : ''}
        </div>
      `;
    });

    if (cycles.length > 10) {
      html += `<div style="padding: 6px; color: var(--color-text-muted);">... 외 ${cycles.length - 10}개</div>`;
    }

    html += '</div></div>';

    circularElement.innerHTML = html;
  }

  /**
   * 그래프 다운로드 (JSON)
   */
  exportGraph() {
    if (!this.cy) return;

    const json = this.cy.json();
    const dataStr = JSON.stringify(json, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 노드의 코드를 팝업으로 표시
   */
  async showCodeForNode(nodeData) {
    try {
      if (!nodeData || !nodeData.id) {
        app.showToast('노드 정보가 없습니다', 'error');
        return;
      }

      console.log('[GraphRenderer] 노드 코드 로드:', nodeData.id);

      // API에서 코드 데이터 받기
      const result = await api.getCode(nodeData.id);

      if (!result.success || !result.data) {
        app.showToast('코드를 로드할 수 없습니다', 'error');
        return;
      }

      // CodeViewer를 이용해 팝업 표시
      if (window.codeViewer) {
        window.codeViewer.showPopup(result.data);
      } else {
        app.showToast('코드 뷰어를 초기화할 수 없습니다', 'error');
      }
    } catch (error) {
      console.error('[GraphRenderer] 코드 로드 에러:', error);
      app.showToast('코드 로드 실패: ' + error.message, 'error');
    }
  }
}

// 초기화
const graphRenderer = new GraphRenderer();
window.graphRenderer = graphRenderer;
