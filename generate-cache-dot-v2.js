#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate DOT format dependency graph for cache-related functions
 */

const indexPath = path.resolve(__dirname, 'plugins/php-index-generator/output/index.json');

console.log('Reading index.json...');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// Regex to match cache-related functions
const cachePattern = /cache/i;

// Step 1: Find all cache functions
const cacheFunctions = {};
const cacheFileSet = new Set();

console.log('\nSearching for cache-related functions...');
Object.entries(indexData.symbols || {}).forEach(([key, symbol]) => {
  if (cachePattern.test(symbol.name)) {
    cacheFunctions[symbol.name] = symbol;
    cacheFileSet.add(symbol.file);
  }
});

console.log(`Found ${Object.keys(cacheFunctions).length} cache functions`);

// Step 2: Build dependency graph
const dependencyGraph = {};
const dependencies = indexData.dependencies || {};

Object.entries(dependencies).forEach(([filePath, fileData]) => {
  if (cachePattern.test(filePath)) {
    dependencyGraph[filePath] = fileData.functionCalls || [];
  }
});

// Step 3: Generate DOT format
let dotContent = 'digraph CacheFunctionDependencies {\n';
dotContent += '  rankdir=TB;\n';
dotContent += '  bgcolor=white;\n';
dotContent += '  node [shape=box, style="rounded,filled", fillcolor="#E3F2FD", fontname="Arial"];\n';
dotContent += '  edge [color="#666666", fontsize=9];\n\n';

// Add comment with metadata
dotContent += `  // Generated cache dependency graph\n`;
dotContent += `  // Total cache functions: ${Object.keys(cacheFunctions).length}\n`;
dotContent += `  // Cache files: ${cacheFileSet.size}\n\n`;

// Create node map
const nodeMap = {};
let nodeCounter = 0;

// Add nodes for cache functions
Object.entries(cacheFunctions).forEach(([funcName, funcInfo]) => {
  const nodeId = `cache_${nodeCounter++}`;
  nodeMap[funcName] = nodeId;

  const displayName = funcName.replace(/_/g, '\n');
  const fileName = path.basename(funcInfo.file || 'unknown');
  const label = `${displayName}\\n(${fileName}:${funcInfo.line})`;

  dotContent += `  ${nodeId} [label="${label}", href="${funcInfo.file}"];\n`;
});

dotContent += '\n  // Dependency relationships\n\n';

// Add edges - connect cache functions that depend on each other
const processedEdges = new Set();

Object.entries(dependencyGraph).forEach(([filePath, calls]) => {
  // Find which cache function is in this file
  const sourceFunc = Object.entries(cacheFunctions).find(([name, func]) =>
    func.file.toLowerCase() === filePath.toLowerCase()
  );

  if (!sourceFunc) return;

  const sourceNode = nodeMap[sourceFunc[0]];
  if (!sourceNode) return;

  // Find dependencies
  (calls || []).forEach(call => {
    const targetFunc = cacheFunctions[call.name];

    if (targetFunc && !call.builtin) {
      const targetNode = nodeMap[call.name];

      if (targetNode && sourceNode !== targetNode) {
        const edgeKey = `${sourceNode}->${targetNode}`;

        if (!processedEdges.has(edgeKey)) {
          dotContent += `  ${sourceNode} -> ${targetNode} [label="${call.type}"];\n`;
          processedEdges.add(edgeKey);
        }
      }
    }
  });
});

dotContent += '\n}\n';

// Create output directory
const outputDir = path.resolve(
  '/c/Users/aired/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/03887657-ce9f-4a37-a469-3b10e0effb35/2e999d38-475d-40e8-8a21-5bfea2929df8/php-dependency-mapper-workspace/iteration-1/eval-dot-export/without_skill/outputs/'
);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write DOT file
const dotFilePath = path.join(outputDir, 'cache_dependencies.dot');
fs.writeFileSync(dotFilePath, dotContent, 'utf8');
console.log(`\n✓ DOT file generated: ${dotFilePath}`);

// Generate summary report
const summary = {
  generated_at: new Date().toISOString(),
  pattern: 'cache',
  statistics: {
    total_cache_functions: Object.keys(cacheFunctions).length,
    total_cache_files: cacheFileSet.size,
    total_dependencies: Object.keys(dependencyGraph).length
  },
  cache_functions: Object.entries(cacheFunctions).map(([name, func]) => ({
    name: name,
    file: func.file,
    line: func.line,
    type: func.type,
    params: func.params || []
  })),
  cache_files: Array.from(cacheFileSet).sort()
};

const summaryPath = path.join(outputDir, 'cache_analysis_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`✓ Summary file generated: ${summaryPath}`);

// Write cache functions list
const listPath = path.join(outputDir, 'cache_functions_list.txt');
let listContent = 'CACHE-RELATED FUNCTIONS\n';
listContent += '=======================\n\n';

Object.entries(cacheFunctions)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([name, func]) => {
    listContent += `${name}\n`;
    listContent += `  File: ${func.file}\n`;
    listContent += `  Line: ${func.line}\n`;
    listContent += `  Type: ${func.type}\n\n`;
  });

fs.writeFileSync(listPath, listContent, 'utf8');
console.log(`✓ Functions list generated: ${listPath}`);

console.log('\n✅ DOT export completed successfully!');
console.log(`   Files created in: ${outputDir}`);
