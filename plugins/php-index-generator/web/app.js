// PHP Index Generator - 웹 검색 엔진
class PHPIndexSearcher {
    constructor() {
        this.index = null;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.init();
    }

    async init() {
        try {
            // index.json 로드 - 여러 경로 시도
            let response = null;
            const pathsToTry = [
                '../output/index.json',           // 상대 경로 (웹 서버)
                '../../output/index.json',        // 한 단계 위 (직접 파일 열기)
                '/plugins/php-index-generator/output/index.json' // 절대 경로
            ];

            for (const path of pathsToTry) {
                try {
                    response = await fetch(path);
                    if (response.ok) {
                        console.log('색인 파일 로드됨:', path);
                        break;
                    }
                } catch (e) {
                    console.log('경로 실패:', path);
                }
            }

            if (!response || !response.ok) {
                throw new Error('index.json을 찾을 수 없습니다. 색인을 먼저 생성하세요.');
            }

            this.index = await response.json();
            this.renderStats();
            this.setupEventListeners();
            this.showAllSymbols();
        } catch (error) {
            console.error('색인 로드 실패:', error);
            this.showError(`
                <div style="text-align: left;">
                    <strong>⚠️ 색인 파일을 로드할 수 없습니다</strong><br><br>
                    <strong>해결 방법:</strong><br>
                    <code style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px; display: block; margin: 10px 0;">
                        npm run php:index:build -- --source work/mobile --force
                    </code>
                    <br>
                    <strong>그 후 페이지 새로고침 (Ctrl+F5)</strong>
                </div>
            `);
        }
    }

    setupEventListeners() {
        // 검색 입력
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentSearch = e.target.value.trim();
            this.performSearch();
        });

        // 필터 버튼
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 활성 버튼 업데이트
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.currentFilter = e.target.dataset.type;
                this.performSearch();
            });
        });
    }

    renderStats() {
        const meta = this.index.metadata;
        document.getElementById('totalFiles').textContent = meta.totalFiles.toLocaleString();
        document.getElementById('totalSymbols').textContent = meta.totalSymbols.toLocaleString();
        document.getElementById('buildTime').textContent = meta.buildTime + 'ms';
        document.getElementById('phpVersion').textContent = meta.php_version;
    }

    showAllSymbols() {
        const symbols = Object.values(this.index.symbols);
        this.renderResults(symbols);
    }

    performSearch() {
        if (!this.currentSearch) {
            this.showAllSymbols();
            return;
        }

        const query = this.currentSearch.toLowerCase();
        const results = [];

        // 모든 심볼 검색
        for (const [fullName, symbol] of Object.entries(this.index.symbols)) {
            // 필터 적용
            if (this.currentFilter !== 'all' && symbol.type !== this.currentFilter) {
                continue;
            }

            // 검색 로직
            const name = symbol.name.toLowerCase();
            const file = symbol.file.toLowerCase();

            // 정확 일치 (100점)
            if (name === query) {
                results.push({ symbol, fullName, score: 100 });
                continue;
            }

            // 부분 일치 - 시작 (80점)
            if (name.startsWith(query)) {
                results.push({ symbol, fullName, score: 80 });
                continue;
            }

            // 부분 일치 - 포함 (60점)
            if (name.includes(query)) {
                results.push({ symbol, fullName, score: 60 });
                continue;
            }

            // 파일명에서 검색 (40점)
            if (file.includes(query)) {
                results.push({ symbol, fullName, score: 40 });
                continue;
            }

            // 퍼지 매칭 (Levenshtein 거리) (20점)
            if (this.fuzzyMatch(query, name)) {
                results.push({ symbol, fullName, score: 20 });
            }
        }

        // 점수 기준으로 정렬
        results.sort((a, b) => b.score - a.score);

        // 최대 100개 결과
        const limitedResults = results.slice(0, 100).map(r => r.symbol);
        this.renderResults(limitedResults);
    }

    // 간단한 퍼지 매칭 (오타 자동 수정)
    fuzzyMatch(query, target) {
        const distance = this.levenshteinDistance(query, target);
        const maxDistance = Math.max(query.length, target.length) / 2;
        return distance <= maxDistance;
    }

    // Levenshtein 거리 계산
    levenshteinDistance(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    renderResults(symbols) {
        const resultsDiv = document.getElementById('results');
        const countSpan = document.getElementById('resultCount');

        if (!symbols || symbols.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <div>검색 결과가 없습니다</div>
                </div>
            `;
            countSpan.textContent = '0';
            return;
        }

        countSpan.textContent = symbols.length.toLocaleString();

        resultsDiv.innerHTML = symbols.map(symbol => this.renderResultItem(symbol)).join('');
    }

    renderResultItem(symbol) {
        const typeClass = symbol.type.toLowerCase();
        const fileName = this.normalizeFilePath(symbol.file);
        const paramsStr = symbol.params && symbol.params.length > 0
            ? `(${symbol.params.join(', ')})`
            : '()';

        return `
            <div class="result-item" onclick="searcher.copyToClipboard('${symbol.name}')">
                <div class="result-header">
                    <div>
                        <span class="result-symbol">${this.escapeHtml(symbol.name)}</span>
                        <span class="result-type ${typeClass}">${symbol.type}</span>
                    </div>
                </div>
                <div class="result-location">
                    📄 <span class="result-file">${fileName}</span> <span class="score">라인 ${symbol.line}</span>
                </div>
                ${symbol.params && symbol.params.length > 0 ? `
                    <div class="result-params">
                        ${this.escapeHtml(paramsStr)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    normalizeFilePath(filePath) {
        // Windows 경로를 Unix 경로로 변환
        return filePath.replace(/\\/g, '/').replace('work/mobile/', '');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // 피드백 (선택사항)
            console.log('복사됨:', text);
        });
    }

    showError(message) {
        document.getElementById('results').innerHTML = `
            <div style="
                background: #ffebee;
                border: 1px solid #ef5350;
                color: #c62828;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            ">
                ⚠️ ${message}
            </div>
        `;
    }
}

// 전역 인스턴스
let searcher;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    searcher = new PHPIndexSearcher();
});
