/**
 * LoadingManager.js
 * 로딩 상태 표시 및 진행률 관리
 */

class LoadingManager {
  constructor() {
    this.isLoading = false;
    this.indicator = document.getElementById('loading-indicator');
    this.progressBar = document.querySelector('.progress-bar');
    this.loadingText = document.querySelector('.loading-text');
    this.spinnerElement = document.querySelector('.spinner');

    // 기본 상태 확인
    if (!this.indicator) {
      console.warn('로딩 인디케이터 엘리먼트를 찾을 수 없습니다.');
    }
  }

  /**
   * 로딩 표시 시작
   * @param {string} text - 표시할 텍스트 (기본: "처리 중...")
   * @param {number} progress - 초기 진행률 (0-100)
   */
  show(text = '처리 중...', progress = 0) {
    if (!this.indicator) return;

    this.isLoading = true;
    this.indicator.classList.add('active');

    if (this.loadingText) {
      this.loadingText.textContent = text;
    }

    this.updateProgress(progress);
  }

  /**
   * 로딩 표시 중지
   */
  hide() {
    if (!this.indicator) return;

    this.isLoading = false;
    this.indicator.classList.remove('active');

    // 진행률 리셋
    if (this.progressBar) {
      this.progressBar.style.width = '0%';
    }
  }

  /**
   * 진행률 업데이트
   * @param {number} percent - 진행률 (0-100)
   */
  updateProgress(percent) {
    if (!this.progressBar) return;

    const safPercent = Math.max(0, Math.min(percent, 100));
    this.progressBar.style.width = `${safPercent}%`;

    // 진행률이 표시되도록 작은 애니메이션 추가
    if (safPercent > 0 && safPercent < 100) {
      // 프로그레스 바에 움직임 추가
      this.progressBar.style.transition = 'width 0.3s ease';
    }
  }

  /**
   * 텍스트 업데이트
   * @param {string} text - 새로운 텍스트
   */
  updateText(text) {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
  }

  /**
   * 스피너 활성화/비활성화
   * @param {boolean} show - 표시 여부
   */
  showSpinner(show = true) {
    if (this.spinnerElement) {
      this.spinnerElement.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * 완료 상태 표시 (체크마크와 함께)
   * @param {string} message - 완료 메시지
   * @param {number} duration - 표시 지속 시간 (ms)
   */
  complete(message = '완료!', duration = 1500) {
    if (!this.indicator) return;

    this.updateText(`✅ ${message}`);
    this.updateProgress(100);

    setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * 에러 상태 표시
   * @param {string} message - 에러 메시지
   * @param {number} duration - 표시 지속 시간 (ms)
   */
  error(message = '오류 발생', duration = 2000) {
    if (!this.indicator) return;

    this.updateText(`❌ ${message}`);
    this.updateProgress(100);

    // 프로그레스 바를 빨간색으로 표시
    if (this.progressBar) {
      this.progressBar.style.background = 'linear-gradient(90deg, #ef5350, #c62828)';
    }

    setTimeout(() => {
      this.hide();
      // 원래 색상으로 복원
      if (this.progressBar) {
        this.progressBar.style.background = 'linear-gradient(90deg, #7e57c2, #9575cd)';
      }
    }, duration);
  }

  /**
   * 비동기 작업 처리 (자동으로 로딩 표시)
   * @param {Promise} promise - 실행할 Promise
   * @param {string} loadingMessage - 로딩 중 메시지
   * @param {string} completeMessage - 완료 메시지
   * @returns {Promise} 원본 Promise
   */
  async withLoading(promise, loadingMessage = '처리 중...', completeMessage = '완료!') {
    this.show(loadingMessage);

    try {
      const result = await promise;
      this.complete(completeMessage, 800);
      return result;
    } catch (error) {
      this.error(`실패: ${error.message || '알 수 없는 오류'}`);
      throw error;
    }
  }

  /**
   * 진행률 기반 로딩 (시뮬레이션)
   * @param {Promise} promise - 실행할 Promise
   * @param {string} message - 로딩 메시지
   * @returns {Promise}
   */
  async withProgressSimulation(promise, message = '처리 중...') {
    this.show(message, 0);

    // 시뮬레이션된 진행률 증가
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.random() * 30;
        this.updateProgress(Math.min(progress, 90));
      }
    }, 300);

    try {
      const result = await promise;
      clearInterval(progressInterval);
      this.updateProgress(100);
      this.hide();
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      this.error(`실패: ${error.message || '알 수 없는 오류'}`);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
const loadingManager = new LoadingManager();
