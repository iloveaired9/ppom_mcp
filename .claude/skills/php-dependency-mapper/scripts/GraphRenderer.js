#!/usr/bin/env node

/**
 * GraphRenderer.js
 * 의존성 그래프를 HTML, SVG, DOT 형식으로 렌더링
 */

const fs = require('fs');
const path = require('path');

class GraphRenderer {
  constructor(graph) {
    this.graph = graph;
    this.colorMap = {
      class: '#3498db',
      function: '#2ecc71',
      interface: '#e74c3c',
      trait: '#f39c12'
    };
  }

  /**
   * Mermaid 다이어그램 (HTML에 삽입)
   */
  toMermaid() {
    const nodes = this.graph.nodes || [];
    const edges = this.graph.edges || [];

    let mermaid = 'graph LR\n';

    // 노드 정의
    const nodeMap = new Map();
    let nodeId = 0;
    for (const node of nodes) {
      const id = `N${nodeId++}`;
      nodeMap.set(node.fullName, id);
      const color = this.colorMap[node.type] || '#95a5a6';
      const icon = this.getTypeIcon(node.type);
      mermaid += `  ${id}["${icon} ${node.name}<br/><small>${node.type}</small>"]:::${node.type}\n`;
    }

    // 엣지 정의
    for (const edge of edges) {
      const fromId = nodeMap.get(edge.from);
      const toId = nodeMap.get(edge.to);
      if (fromId && toId) {
        const label = edge.type === 'calls' ? '' : edge.type;
        const style = edge.type === 'calls' ? '' : '|' + edge.type + '|';
        mermaid += `  ${fromId} --${style}--> ${toId}\n`;
      }
    }

    // 스타일 정의
    mermaid += '\n  classDef class fill:' + this.colorMap.class + ',stroke:#2980b9,color:#fff\n';
    mermaid += '  classDef function fill:' + this.colorMap.function + ',stroke:#27ae60,color:#fff\n';
    mermaid += '  classDef interface fill:' + this.colorMap.interface + ',stroke:#c0392b,color:#fff\n';
    mermaid += '  classDef trait fill:' + this.colorMap.trait + ',stroke:#d68910,color:#fff\n';

    return mermaid;
  }

  /**
   * DOT 형식 (Graphviz)
   */
  toDot() {
    const nodes = this.graph.nodes || [];
    const edges = this.graph.edges || [];

    let dot = 'digraph DependencyMap {\n';
    dot += '  rankdir=LR;\n';
    dot += '  graph [bgcolor=white];\n';
    dot += '  node [shape=box, style=filled, fontname=Arial];\n\n';

    // 노드
    for (const node of nodes) {
      const color = this.colorMap[node.type] || '#95a5a6';
      const label = `${node.name}\\n(${node.type})`;
      dot += `  "${node.fullName}" [label="${label}", fillcolor="${color}", fontcolor=white];\n`;
    }

    dot += '\n';

    // 엣지
    const edgeGroups = new Map();
    for (const edge of edges) {
      const key = `${edge.from}__${edge.to}`;
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      edgeGroups.get(key).push(edge.type);
    }

    for (const [key, types] of edgeGroups) {
      const [from, to] = key.split('__');
      const style = types.includes('calls') ? 'solid' : 'dashed';
      const label = types.includes('calls') ? '' : types.join(',');
      const color = types.includes('calls') ? '#2c3e50' : '#95a5a6';
      dot += `  "${from}" -> "${to}" [style=${style}, label="${label}", color="${color}"];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * HTML 인터랙티브 시각화
   */
  toHTML(title = 'PHP Dependency Map', stats = null, cycles = null) {
    const mermaidDiagram = this.toMermaid();
    const nodeCount = this.graph.nodes?.length || 0;
    const edgeCount = this.graph.edges?.length || 0;

    let statsHtml = '';
    if (stats) {
      const topCalled = stats.topCalled || [];
      const topCallers = stats.topCallers || [];

      statsHtml = `
        <div id="stats" style="background:#ecf0f1; padding:15px; border-radius:5px; margin-bottom:20px;">
          <h3>📊 Statistics</h3>
          <p><strong>Nodes:</strong> ${stats.nodeCount} | <strong>Edges:</strong> ${stats.edgeCount} | <strong>Call Relations:</strong> ${stats.callEdges} | <strong>Inheritance:</strong> ${stats.inheritanceEdges}</p>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
              <h4>🔥 Most Called (Bottlenecks)</h4>
              <ul style="margin:0; padding-left:20px;">
                ${topCalled.map(item => `<li>${item.name} (${item.count} times)</li>`).join('')}
              </ul>
            </div>
            <div>
              <h4>📤 Top Callers (Heavy Users)</h4>
              <ul style="margin:0; padding-left:20px;">
                ${topCallers.map(item => `<li>${item.name} (${item.count} calls)</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    let cyclesHtml = '';
    if (cycles && cycles.length > 0) {
      cyclesHtml = `
        <div id="cycles" style="background:#ffe5e5; padding:15px; border-radius:5px; margin-bottom:20px; border-left:4px solid #e74c3c;">
          <h3>⚠️ Circular Dependencies Detected</h3>
          <ul style="margin:0; padding-left:20px;">
            ${cycles.slice(0, 5).map(cycle => `<li><code>${cycle.join(' → ')}</code></li>`).join('')}
          </ul>
        </div>
      `;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-top: 0;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      margin: 30px 0;
      background: #fafafa;
      padding: 20px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "Courier New", monospace;
    }
    .legend {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 3px;
    }
    ul { line-height: 1.8; }
    #stats, #cycles { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 ${title}</h1>

    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background:#3498db;"></div>
        <span>Class</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:#2ecc71;"></div>
        <span>Function</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:#e74c3c;"></div>
        <span>Interface</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:#f39c12;"></div>
        <span>Trait</span>
      </div>
    </div>

    ${statsHtml}
    ${cyclesHtml}

    <h2>Dependency Graph</h2>
    <p><em>Nodes: ${nodeCount} | Edges: ${edgeCount}</em></p>
    <div class="mermaid">
${mermaidDiagram}
    </div>

    <p style="color:#666; font-size:12px; margin-top:30px;">
      Generated: ${new Date().toLocaleString()}<br>
      <a href="#" onclick="location.reload()">🔄 Refresh</a>
    </p>
  </div>

  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    mermaid.contentLoaded();
  </script>
</body>
</html>`;

    return html;
  }

  /**
   * 타입별 아이콘
   */
  getTypeIcon(type) {
    const icons = {
      class: '📦',
      function: '⚙️',
      interface: '🔌',
      trait: '🎭'
    };
    return icons[type] || '⚪';
  }

  /**
   * 파일로 저장
   */
  saveToFile(content, filepath) {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✓ Saved: ${filepath}`);
    return filepath;
  }
}

module.exports = GraphRenderer;
