#!/usr/bin/env node

/**
 * php-deps.js - CLI Entry Point
 * PHP Dependency Map Generator
 */

const path = require('path');
const DependencyAnalyzer = require('./DependencyAnalyzer');
const GraphRenderer = require('./GraphRenderer');

// 커맨드라인 인수 파싱
function parseArgs(argv) {
  const args = {
    source: 'work/mobile',
    filter: null,
    depth: 3,
    format: 'html',
    output: null
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1]) {
      args.source = argv[++i];
    } else if (argv[i] === '--filter' && argv[i + 1]) {
      args.filter = argv[++i];
    } else if (argv[i] === '--depth' && argv[i + 1]) {
      args.depth = parseInt(argv[++i], 10);
    } else if (argv[i] === '--format' && argv[i + 1]) {
      args.format = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return args;
}

function showHelp() {
  console.log(`
🔗 PHP Dependency Mapper

Usage:
  node php-deps.js [options]

Options:
  --source <path>       PHP source directory (default: work/mobile)
  --filter <pattern>    Filter by class/function name (regex)
  --depth <number>      Max recursion depth (default: 3)
  --format <type>       Output format: html|svg|dot (default: html)
  --output <path>       Output file path (auto-generated if not specified)
  --help, -h            Show this help message

Examples:
  # Generate full dependency map
  node php-deps.js

  # Analyze only Helper class, depth 1
  node php-deps.js --filter "Helper" --depth 1

  # Generate as DOT format
  node php-deps.js --format dot

  # Custom output path
  node php-deps.js --output /tmp/deps-graph.html
`);
}

async function main() {
  const args = parseArgs(process.argv);

  // 색인 경로 결정
  const indexPath = path.join(
    process.cwd(),
    'plugins/php-index-generator/output/index.json'
  );

  console.log('\n🔍 PHP Dependency Mapper\n');

  // 분석 실행
  const analyzer = new DependencyAnalyzer(indexPath);
  if (!await analyzer.loadIndex()) {
    console.error('❌ Cannot proceed without index');
    process.exit(1);
  }

  console.log(`📍 Analyzing: ${args.source}`);
  if (args.filter) console.log(`🔎 Filter: ${args.filter}`);
  console.log(`📏 Depth: ${args.depth}\n`);

  // 그래프 구축
  const graph = analyzer.buildDependencyGraph(args.filter, args.depth);
  if (!graph) {
    process.exit(1);
  }

  const stats = analyzer.getStats();
  const cycles = analyzer.detectCycles();

  console.log(`\n📊 Graph built: ${stats.nodeCount} nodes, ${stats.edgeCount} edges`);
  if (cycles.length > 0) {
    console.log(`⚠️  Found ${cycles.length} circular dependencies`);
  }

  // 렌더링
  const renderer = new GraphRenderer(graph);
  let content;
  let extension;

  console.log(`\n🎨 Rendering as ${args.format.toUpperCase()}...`);

  switch (args.format) {
    case 'dot':
      content = renderer.toDot();
      extension = 'dot';
      break;
    case 'svg':
      content = renderer.toMermaid();
      extension = 'svg';
      // Note: 실제 SVG 렌더링은 Mermaid CLI가 필요함
      console.warn('⚠️  SVG format requires mermaid-cli. Saving Mermaid diagram instead.');
      extension = 'md';
      break;
    case 'html':
    default:
      content = renderer.toHTML(
        `PHP Dependency Map - ${args.filter || 'Full'}`,
        stats,
        cycles
      );
      extension = 'html';
  }

  // 출력 파일 경로 결정
  let outputPath = args.output;
  if (!outputPath) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filterSuffix = args.filter ? `-${args.filter}` : '';
    outputPath = path.join(
      process.cwd(),
      `.claude/php-deps-report/deps-map${filterSuffix}-${timestamp}.${extension}`
    );
  }

  // 파일 저장
  renderer.saveToFile(content, outputPath);

  // 결과 요약
  console.log(`\n✅ Dependency map generated successfully!\n`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   • Total nodes: ${stats.nodeCount}`);
  console.log(`   • Total edges: ${stats.edgeCount}`);
  console.log(`   • Call relations: ${stats.callEdges}`);
  console.log(`   • Inheritance links: ${stats.inheritanceEdges}`);

  if (stats.topCalled.length > 0) {
    console.log(`\n🔥 Most called (bottlenecks):`);
    stats.topCalled.forEach(item => {
      console.log(`   • ${item.name}: ${item.count} times`);
    });
  }

  if (cycles.length > 0) {
    console.log(`\n⚠️  Circular dependencies (first 3):`);
    cycles.slice(0, 3).forEach(cycle => {
      console.log(`   • ${cycle.join(' → ')}`);
    });
  }

  console.log();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
