#!/usr/bin/env node

/**
 * DependencyAnalyzer.js
 * PHP 코드의 의존성 관계를 분석하고 그래프 구조로 변환
 */

const fs = require('fs');
const path = require('path');

class DependencyAnalyzer {
  constructor(indexPath) {
    this.indexPath = indexPath;
    this.index = null;
    this.graph = {
      nodes: new Map(),
      edges: new Set(),
      metadata: {}
    };
  }

  /**
   * 색인 파일 로드
   */
  async loadIndex() {
    try {
      if (!fs.existsSync(this.indexPath)) {
        console.error(`❌ Index file not found: ${this.indexPath}`);
        return false;
      }

      const content = fs.readFileSync(this.indexPath, 'utf8');
      this.index = JSON.parse(content);
      console.log(`✓ Loaded index with ${Object.keys(this.index.symbols || {}).length} symbols`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load index: ${error.message}`);
      return false;
    }
  }

  /**
   * 의존성 그래프 구축
   */
  buildDependencyGraph(filter = null, depth = 3) {
    if (!this.index || !this.index.symbols) {
      console.error('❌ Index not loaded');
      return null;
    }

    const symbols = this.index.symbols;

    // 필터링: filter 패턴과 매칭하는 심볼들 찾기
    let targetSymbols = Object.entries(symbols);
    if (filter) {
      const regex = new RegExp(filter, 'i');
      targetSymbols = targetSymbols.filter(([name]) => regex.test(name));
    }

    if (targetSymbols.length === 0) {
      console.warn(`⚠ No symbols matching filter: ${filter}`);
      return null;
    }

    console.log(`📊 Analyzing ${targetSymbols.length} symbol(s)...`);

    // 노드 추가 (심볼)
    for (const [fqcn, symbol] of targetSymbols) {
      this.addNode(fqcn, symbol);
    }

    // 엣지 추가 (의존성 관계)
    for (const [fqcn, symbol] of targetSymbols) {
      this.extractDependencies(fqcn, symbol, symbols, depth);
    }

    return this.graph;
  }

  /**
   * 노드 추가
   */
  addNode(name, symbol) {
    if (!this.graph.nodes.has(name)) {
      this.graph.nodes.set(name, {
        id: name,
        name: this.extractName(name),
        type: symbol.type, // class, function, interface, trait
        file: symbol.file,
        line: symbol.line,
        fullName: name
      });
    }
  }

  /**
   * 단순 이름 추출 (FQCN에서 마지막 부분)
   */
  extractName(fqcn) {
    const parts = fqcn.split('\\');
    return parts[parts.length - 1];
  }

  /**
   * 의존성 추출
   */
  extractDependencies(fqcn, symbol, allSymbols, depth) {
    if (depth <= 0) return;

    // 참조 (호출한 함수/메서드)
    if (symbol.references && Array.isArray(symbol.references)) {
      for (const ref of symbol.references) {
        const refName = typeof ref === 'string' ? ref : ref.name;
        if (allSymbols[refName] && refName !== fqcn) {
          this.addNode(refName, allSymbols[refName]);
          this.addEdge(fqcn, refName, 'calls');

          // 재귀적으로 깊이만큼 탐색
          if (depth > 1) {
            this.extractDependencies(refName, allSymbols[refName], allSymbols, depth - 1);
          }
        }
      }
    }

    // 상속
    if (symbol.extends && symbol.extends !== 'stdClass') {
      const parentFqcn = symbol.extends;
      if (allSymbols[parentFqcn]) {
        this.addNode(parentFqcn, allSymbols[parentFqcn]);
        this.addEdge(fqcn, parentFqcn, 'extends');
      }
    }

    // 인터페이스 구현
    if (symbol.implements && Array.isArray(symbol.implements)) {
      for (const iface of symbol.implements) {
        if (allSymbols[iface]) {
          this.addNode(iface, allSymbols[iface]);
          this.addEdge(fqcn, iface, 'implements');
        }
      }
    }
  }

  /**
   * 엣지 추가
   */
  addEdge(from, to, type = 'calls') {
    const edgeKey = `${from}->${to}(${type})`;
    this.graph.edges.add({
      from,
      to,
      type,
      key: edgeKey
    });
  }

  /**
   * 그래프 통계
   */
  getStats() {
    const edges = Array.from(this.graph.edges);
    const callEdges = edges.filter(e => e.type === 'calls').length;
    const inheritanceEdges = edges.filter(e => e.type === 'extends' || e.type === 'implements').length;

    // 인도차수 (많이 호출되는)와 출차수 (많이 호출하는) 계산
    const inDegree = new Map();
    const outDegree = new Map();

    for (const edge of edges) {
      outDegree.set(edge.from, (outDegree.get(edge.from) || 0) + 1);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: edges.length,
      callEdges,
      inheritanceEdges,
      topCalled: Array.from(inDegree.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topCallers: Array.from(outDegree.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    };
  }

  /**
   * 순환 의존성 감지
   */
  detectCycles() {
    const edges = Array.from(this.graph.edges).filter(e => e.type === 'calls');
    const graph = new Map();

    for (const edge of edges) {
      if (!graph.has(edge.from)) graph.set(edge.from, []);
      graph.get(edge.from).push(edge.to);
    }

    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node, path) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, path.slice());
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          cycles.push(cycle);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of this.graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles.slice(0, 10); // 처음 10개 순환만 반환
  }

  /**
   * JSON 형식으로 export
   */
  toJSON() {
    return {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges),
      stats: this.getStats(),
      cycles: this.detectCycles()
    };
  }
}

module.exports = DependencyAnalyzer;
