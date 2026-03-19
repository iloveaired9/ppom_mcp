const fs = require('fs');
const path = require('path');

// Read the index.json file
const indexPath = '/c/rnd/claude/mcp/ppom_mcp/plugins/php-index-generator/output/index.json';
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// Extract cache-related functions
const cacheRegex = /cache/i;
const cacheFunctions = {};
const cacheFiles = {};

// Find all symbols matching cache pattern
Object.entries(indexData.symbols).forEach(([key, value]) => {
  if (cacheRegex.test(value.name)) {
    cacheFunctions[key] = value;
  }
});

// Find all files matching cache pattern
Object.entries(indexData.files).forEach(([key, value]) => {
  if (cacheRegex.test(key)) {
    cacheFiles[key] = value;
  }
});

// Extract dependencies from functionCalls section
const dependencies = indexData.dependencies || {};
const cacheDepMap = {};

Object.entries(dependencies).forEach(([filePath, fileData]) => {
  if (cacheRegex.test(filePath)) {
    fileData.functionCalls.forEach(call => {
      if (!cacheDepMap[filePath]) {
        cacheDepMap[filePath] = [];
      }
      cacheDepMap[filePath].push({
        name: call.name,
        type: call.type,
        builtin: call.builtin,
        source: call.source
      });
    });
  }
});

// Generate DOT format
let dotContent = 'digraph CacheDependencies {\n';
dotContent += '  rankdir=LR;\n';
dotContent += '  node [shape=box, style=rounded];\n';
dotContent += '  edge [color=gray];\n\n';

// Add nodes for cache functions
const nodeMap = {};
let nodeId = 0;

Object.entries(cacheFunctions).forEach(([key, func]) => {
  const nodeName = `node${nodeId}`;
  nodeMap[func.name] = nodeName;

  const file = path.basename(func.file || '');
  const label = `${func.name}\\n(${file})`;
  dotContent += `  ${nodeName} [label="${label}", fillcolor="#E3F2FD", style="filled,rounded"];\n`;
  nodeId++;
});

dotContent += '\n';

// Add edges for dependencies
Object.entries(cacheDepMap).forEach(([filePath, calls]) => {
  calls.forEach(call => {
    if (nodeMap[call.name] && !call.builtin) {
      // Find which cache function calls this
      Object.entries(cacheFunctions).forEach(([key, func]) => {
        const funcFile = func.file.replace(/\\/g, '/');
        const depFile = filePath.replace(/\\/g, '/');

        if (funcFile.includes(depFile.split('/').pop())) {
          const sourceNode = nodeMap[func.name];
          const targetNode = nodeMap[call.name];

          if (sourceNode && targetNode) {
            dotContent += `  ${sourceNode} -> ${targetNode} [label="${call.type}", color="${call.builtin ? '#CCC' : '#666'}"];\n`;
          }
        }
      });
    }
  });
});

dotContent += '}\n';

// Create output directory
const outputDir = '/c/Users/aired/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/03887657-ce9f-4a37-a469-3b10e0effb35/2e999d38-475d-40e8-8a21-5bfea2929df8/php-dependency-mapper-workspace/iteration-1/eval-dot-export/without_skill/outputs/';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write DOT file
const outputFile = path.join(outputDir, 'cache_dependencies.dot');
fs.writeFileSync(outputFile, dotContent, 'utf8');

console.log(`DOT file generated: ${outputFile}`);
console.log(`Cache functions found: ${Object.keys(cacheFunctions).length}`);
console.log(`Cache files found: ${Object.keys(cacheFiles).length}`);

// Also write a summary
const summary = {
  total_cache_functions: Object.keys(cacheFunctions).length,
  total_cache_files: Object.keys(cacheFiles).length,
  functions: Object.values(cacheFunctions).map(f => ({
    name: f.name,
    file: f.file,
    line: f.line,
    type: f.type
  })),
  files: Object.keys(cacheFiles)
};

const summaryFile = path.join(outputDir, 'cache_analysis_summary.json');
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

console.log(`Summary file generated: ${summaryFile}`);
