/**
 * 코드 뷰어 컴포넌트
 * PHP 코드 표시, 구문 강조, 라인번호, 에디터 연동
 */

class CodeViewer {
  constructor() {
    this.container = null;
    this.currentCode = null;
    this.highlighter = null;
    this.initHighlighter();
  }

  initHighlighter() {
    // highlight.js 라이브러리 확인
    if (typeof hljs !== 'undefined') {
      this.highlighter = hljs;
      console.log('[CodeViewer] highlight.js 초기화됨');
    } else {
      console.warn('[CodeViewer] highlight.js가 로드되지 않았습니다');
    }
  }

  /**
   * 코드 뷰어 렌더링
   */
  async render(symbol, result) {
    try {
      loadingManager.show('코드 로드 중...', 20);

      // FQCN 생성: 파일경로::심볼명
      // symbol이 이미 FQCN 형식(경로::심볼)인지 확인
      let fqcn = symbol;

      // "::"가 없으면 FQCN을 구성해야 함
      if (!symbol.includes('::') && result && result.file) {
        let filePath = result.file;

        // 경로 정규화: forward slash를 backslash로 변환
        filePath = filePath.replace(/\//g, '\\');

        // work\mobile 뒤의 부분만 추출
        const mobileIndex = filePath.indexOf('work\\mobile\\');
        let relativePath = filePath;
        if (mobileIndex !== -1) {
          // "work\mobile\" 이후의 경로만 추출
          relativePath = filePath.substring(mobileIndex + 12); // "work\mobile\" = 12 chars
        }

        fqcn = `${relativePath}::${symbol}`;
        console.log(`[CodeViewer] 파일: ${result.file}`);
        console.log(`[CodeViewer] 상대경로: ${relativePath}`);
        console.log(`[CodeViewer] FQCN 생성: ${fqcn}`);
      } else if (symbol.includes('::')) {
        console.log(`[CodeViewer] 이미 FQCN 형식: ${fqcn}`);
      }

      // API에서 코드 조회
      const response = await api.getCode(fqcn);

      if (!response.success) {
        throw new Error(response.data?.error || '코드를 불러올 수 없습니다');
      }

      loadingManager.updateProgress(70);

      const codeData = response.data;
      this.currentCode = codeData;

      // 우측 패널 업데이트
      const panel = document.getElementById('code-tab');
      if (!panel) {
        // 새 탭 추가
        this.createCodeTab();
      }

      // 코드 표시
      this.displayCode(codeData);

      loadingManager.complete('코드 로드 완료', 300);
    } catch (error) {
      console.error('[CodeViewer] 에러:', error);
      loadingManager.error(`코드 로드 실패: ${error.message}`, 1000);
    }
  }

  /**
   * 코드 탭 생성
   */
  createCodeTab() {
    console.log('[CodeViewer] 코드 탭 생성 중...');

    const tabsContainer = document.querySelector('.tabs');
    if (!tabsContainer) {
      console.warn('[CodeViewer] 탭 컨테이너를 찾을 수 없습니다');
      return;
    }

    // 기존 코드 탭이 있는지 확인
    if (tabsContainer.querySelector('[data-tab="code"]')) {
      console.log('[CodeViewer] 코드 탭이 이미 존재합니다');
    } else {
      // 새 탭 버튼 추가
      const newButton = document.createElement('button');
      newButton.className = 'tab-button';
      newButton.setAttribute('data-tab', 'code');
      newButton.textContent = '💻 코드';
      tabsContainer.appendChild(newButton);

      newButton.addEventListener('click', () => {
        // 기존 탭 버튼 비활성화
        document.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
        });
        // 기존 탭 내용 숨기기
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        // 새 탭 활성화
        newButton.classList.add('active');
        const codePane = document.getElementById('code-tab');
        if (codePane) {
          codePane.classList.add('active');
        }
      });

      console.log('[CodeViewer] 탭 버튼 추가됨');
    }

    // 탭 내용 추가
    const tabContent = document.querySelector('.tab-content');
    if (!tabContent) {
      console.warn('[CodeViewer] 탭 내용 컨테이너를 찾을 수 없습니다');
      return;
    }

    // 기존 코드 탭이 있는지 확인
    if (document.getElementById('code-tab')) {
      console.log('[CodeViewer] 코드 탭 내용이 이미 존재합니다');
    } else {
      const codePane = document.createElement('div');
      codePane.id = 'code-tab';
      codePane.className = 'tab-pane';
      codePane.innerHTML = `
        <div class="code-viewer">
          <div class="code-header">
            <div class="code-info">
              <div class="file-path"></div>
              <div class="line-info"></div>
            </div>
            <div class="code-actions">
              <button class="btn-open-file" title="파일에서 열기">📂 열기</button>
              <button class="btn-copy-code" title="코드 복사">📋 복사</button>
              <button class="btn-popup-code" title="팝업으로 열기">🔍 팝업</button>
            </div>
          </div>
          <div class="code-content">
            <pre><code class="language-php"></code></pre>
          </div>
        </div>
      `;
      tabContent.appendChild(codePane);
      console.log('[CodeViewer] 탭 내용 추가됨');
    }
  }

  /**
   * 코드 표시
   */
  displayCode(codeData) {
    try {
      const codeElement = document.querySelector('#code-tab code');
      if (!codeElement) {
        console.warn('[CodeViewer] 코드 엘리먼트를 찾을 수 없습니다');
        return;
      }

      // 코드 설정
      codeElement.textContent = codeData.code;
      codeElement.className = `language-${codeData.language || 'php'}`;

      // 구문 강조
      if (this.highlighter) {
        this.highlighter.highlightElement(codeElement);
        console.log('[CodeViewer] 구문 강조 적용됨');
      }

      // 라인번호 설정
      const pre = codeElement.parentElement;
      if (pre) {
        pre.setAttribute('data-start', codeData.startLine);
        pre.className = 'line-numbers';
      }

      // 헤더 정보 업데이트
      const filePathEl = document.querySelector('#code-tab .file-path');
      const lineInfoEl = document.querySelector('#code-tab .line-info');

      if (filePathEl) {
        filePathEl.textContent = codeData.file;
        filePathEl.title = codeData.file; // 전체 경로를 툴팁으로 표시
      }

      if (lineInfoEl) {
        lineInfoEl.textContent = `라인 ${codeData.startLine}-${codeData.endLine}`;
      }

      // 버튼 이벤트 설정
      this.setupButtonEvents(codeData);

      console.log('[CodeViewer] 코드 표시 완료');
    } catch (error) {
      console.error('[CodeViewer] 코드 표시 에러:', error);
    }
  }

  /**
   * 버튼 이벤트 설정
   */
  setupButtonEvents(codeData) {
    const openBtn = document.querySelector('#code-tab .btn-open-file');
    const copyBtn = document.querySelector('#code-tab .btn-copy-code');
    const popupBtn = document.querySelector('#code-tab .btn-popup-code');

    if (openBtn) {
      openBtn.onclick = () => this.openInEditor(codeData);
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(codeData.code).then(() => {
          app.showToast('코드가 복사되었습니다', 'success');
        }).catch(err => {
          console.error('복사 실패:', err);
          app.showToast('코드 복사 실패', 'error');
        });
      };
    }

    if (popupBtn) {
      popupBtn.onclick = () => this.showPopup(codeData);
    }
  }

  /**
   * 팝업 창에서 코드 표시
   */
  showPopup(codeData) {
    try {
      // 팝업 윈도우 생성
      const popupWindow = window.open('', 'codePopup', 'width=1000,height=700,resizable=yes,scrollbars=yes');

      if (!popupWindow) {
        app.showToast('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.', 'error');
        return;
      }

      // 팝업 내용 작성
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${codeData.file} - 코드 뷰어</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/php.min.js"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 1200px; margin: 0 auto; }
            .header { padding: 20px; border-bottom: 1px solid #e0e0e0; background: #fafafa; }
            .title { font-weight: 600; color: #333; margin-bottom: 8px; word-break: break-all; }
            .info { font-size: 12px; color: #999; }
            .buttons { margin-top: 12px; display: flex; gap: 8px; }
            button { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px; }
            button:hover { background: #f0f0f0; border-color: #999; }
            .code-container { padding: 20px; overflow: auto; max-height: 600px; }
            pre { margin: 0; }
            code { font-family: 'Monaco', 'Menlo', 'Courier New', monospace; font-size: 12px; line-height: 1.5; }
            .hljs { background: transparent; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">📄 ${codeData.file}</div>
              <div class="info">라인: ${codeData.startLine} - ${codeData.endLine} | 타입: ${codeData.type}</div>
              <div class="buttons">
                <button onclick="copyCode()">📋 복사</button>
                <button onclick="window.close()">❌ 닫기</button>
              </div>
            </div>
            <div class="code-container">
              <pre><code id="codeBlock" class="language-php"></code></pre>
            </div>
          </div>

          <script>
            const code = ${JSON.stringify(codeData.code)};
            const codeBlock = document.getElementById('codeBlock');
            codeBlock.textContent = code;
            hljs.highlightElement(codeBlock);

            function copyCode() {
              navigator.clipboard.writeText(code).then(() => {
                alert('코드가 복사되었습니다!');
              }).catch(err => {
                alert('복사 실패: ' + err);
              });
            }
          </script>
        </body>
        </html>
      `;

      popupWindow.document.write(htmlContent);
      popupWindow.document.close();
      console.log('[CodeViewer] 팝업 창 열기 성공');
    } catch (error) {
      console.error('[CodeViewer] 팝업 에러:', error);
      app.showToast('팝업 열기 실패', 'error');
    }
  }

  /**
   * 에디터에서 파일 열기
   */
  openInEditor(codeData) {
    try {
      // VS Code 프로토콜로 시도
      const vscodeUri = `vscode://file/${codeData.file}:${codeData.startLine}`;

      console.log('[CodeViewer] VS Code 열기 시도:', vscodeUri);

      // 링크를 통해 VS Code 실행 (직접 window.location.href 사용 안함)
      const link = document.createElement('a');
      link.href = vscodeUri;
      link.click();

      app.showToast('파일을 VS Code에서 열고 있습니다...', 'info');

      // 2초 후 여전히 실패했을 수 있으므로 경고
      setTimeout(() => {
        console.log('[CodeViewer] VS Code 실행 완료 또는 실패');
      }, 2000);
    } catch (error) {
      console.error('[CodeViewer] 에디터 열기 에러:', error);
      app.showToast('파일을 열 수 없습니다. VS Code를 설치하거나 경로를 확인하세요.', 'warning');
    }
  }
}

// 싱글톤 생성
const codeViewer = window.codeViewer = new CodeViewer();
console.log('[CodeViewer] 컴포넌트 초기화됨');
