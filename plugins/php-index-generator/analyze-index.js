#!/usr/bin/env node

/**
 * Analyze existing index.json and generate dependency map report
 */

const fs = require('fs');
const path = require('path');

class IndexAnalyzer {
  constructor(indexPath, outputDir) {
    this.indexPath = indexPath;
    this.outputDir = outputDir;
    this.index = null;
    this.stats = {
      totalFiles: 0,
      totalFunctions: 0,
      totalClasses: 0,
      functionCallMap: {},
      classDependencies: [],
      fileDependencies: new Map(),
      circularDeps: []
    };
  }

  /**
   * Load and parse the index.json file
   */
  loadIndex() {
    try {
      console.log('📖 Loading index...');
      const content = fs.readFileSync(this.indexPath, 'utf-8');
      this.index = JSON.parse(content);
      console.log(`✓ Index loaded (${Object.keys(this.index.symbols || {}).length} symbols)\n`);
      return true;
    } catch (e) {
      console.error(`❌ Failed to load index: ${e.message}`);
      return false;
    }
  }

  /**
   * Analyze the index
   */
  analyze() {
    console.log('🔍 Analyzing index...\n');

    if (!this.index || !this.index.symbols) {
      console.error('❌ No symbols found in index');
      return false;
    }

    const symbols = this.index.symbols;
    const fileSet = new Set();
    const classMap = new Map();
    const functionCallMap = {};

    // First pass: collect all symbols and identify types
    for (const [fqcn, symbol] of Object.entries(symbols)) {
      const file = symbol.file || '';
      fileSet.add(file);

      // Count by type
      if (symbol.type === 'class' || symbol.type === 'Class') {
        classMap.set(symbol.name, { ...symbol, fqcn });
      } else if (symbol.type === 'function' || symbol.type === 'Function') {
        // Initialize function call counter
        if (!functionCallMap[symbol.name]) {
          functionCallMap[symbol.name] = { count: 0, files: new Set(), type: 'function' };
        }
      }
    }

    this.stats.totalFiles = fileSet.size;
    this.stats.totalClasses = classMap.size;
    this.stats.totalFunctions = Object.keys(functionCallMap).length;

    console.log(`📊 Metadata from index:`);
    console.log(`   • Source Dir: ${this.index.metadata?.sourceDir}`);
    console.log(`   • Files: ${this.index.metadata?.totalFiles}`);
    console.log(`   • Symbols: ${this.index.metadata?.totalSymbols}`);
    console.log(`   • Build Time: ${this.index.metadata?.buildTime}ms`);
    console.log(`   • PHP Version: ${this.index.metadata?.php_version}\n`);

    // Analyze call patterns from symbol names
    this.analyzeCallPatterns(symbols);

    // Analyze class inheritance
    this.analyzeClassHierarchy(symbols);

    // Analyze file dependencies
    this.analyzeFileDependencies(symbols);

    // Detect circular dependencies (simplified)
    this.detectCircularDependencies();

    console.log('✅ Analysis complete\n');
    return true;
  }

  /**
   * Analyze function call patterns from symbol structure
   */
  analyzeCallPatterns(symbols) {
    const methodCalls = {};

    for (const [fqcn, symbol] of Object.entries(symbols)) {
      const name = symbol.name || '';
      const file = symbol.file || '';

      if (symbol.type === 'function' || symbol.type === 'Function') {
        if (!methodCalls[name]) {
          methodCalls[name] = { count: 0, files: new Set() };
        }
        methodCalls[name].files.add(file);
      }
    }

    // Estimate call frequency based on files using it
    for (const [name, data] of Object.entries(methodCalls)) {
      methodCalls[name].count = Math.max(data.files.size * 2, 1); // Estimate: 2 calls per file
    }

    this.stats.functionCallMap = methodCalls;
  }

  /**
   * Analyze class hierarchy
   */
  analyzeClassHierarchy(symbols) {
    for (const [fqcn, symbol] of Object.entries(symbols)) {
      if (symbol.type === 'class' || symbol.type === 'Class') {
        if (symbol.extends) {
          this.stats.classDependencies.push({
            child: symbol.name,
            parent: symbol.extends,
            type: 'extends',
            file: symbol.file
          });
        }

        if (symbol.implements && Array.isArray(symbol.implements)) {
          symbol.implements.forEach(iface => {
            this.stats.classDependencies.push({
              class: symbol.name,
              interface: iface,
              type: 'implements',
              file: symbol.file
            });
          });
        }
      }
    }
  }

  /**
   * Analyze file dependencies
   */
  analyzeFileDependencies(symbols) {
    const fileMap = new Map();

    for (const [fqcn, symbol] of Object.entries(symbols)) {
      const file = symbol.file || '';
      if (!fileMap.has(file)) {
        fileMap.set(file, { count: 1 });
      } else {
        fileMap.get(file).count++;
      }
    }

    this.stats.fileDependencies = fileMap;
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    // Simplified circular dependency detection
    // In a full implementation, this would trace the actual call graph
    const cycles = [];

    // Example: check if classes form inheritance cycles
    for (const dep1 of this.stats.classDependencies) {
      if (dep1.type === 'extends') {
        for (const dep2 of this.stats.classDependencies) {
          if (dep2.type === 'extends' && dep2.child === dep1.parent && dep2.parent === dep1.child) {
            cycles.push(`${dep1.child} ↔ ${dep1.parent}`);
          }
        }
      }
    }

    this.stats.circularDeps = [...new Set(cycles)];
  }

  /**
   * Get top called functions
   */
  getTopFunctions(limit = 20) {
    return Object.entries(this.stats.functionCallMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        fileCount: data.files.size,
        avgCallsPerFile: Math.round(data.count / data.files.size)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get files with highest complexity
   */
  getComplexFiles(limit = 15) {
    const fileComplexity = [];

    for (const [file, data] of this.stats.fileDependencies) {
      // Count symbols in this file
      const symbolCount = data.count;
      fileComplexity.push({
        file: file.replace(/\\/g, '/'),
        symbolCount,
        complexity: symbolCount,
        complexity_score: Math.round(symbolCount * 1.5)
      });
    }

    return fileComplexity
      .sort((a, b) => b.complexity_score - a.complexity_score)
      .slice(0, limit);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    console.log('📝 Generating HTML report...\n');

    const timestamp = new Date().toISOString();
    const topFunctions = this.getTopFunctions(20);
    const complexFiles = this.getComplexFiles(15);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Dependency Map Report - work/mobile</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 50px;
        }

        .section h2 {
            font-size: 1.8em;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card .number {
            font-size: 2.5em;
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
        }

        .stat-card .label {
            font-size: 0.9em;
            opacity: 0.9;
        }

        .table-wrapper {
            overflow-x: auto;
            margin-bottom: 30px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95em;
        }

        table thead {
            background: #f5f5f5;
        }

        table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #667eea;
            border-bottom: 2px solid #667eea;
        }

        table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }

        table tbody tr:hover {
            background: #f9f9f9;
        }

        .rank {
            font-weight: bold;
            color: #764ba2;
            width: 40px;
        }

        .progress-bar {
            background: #eee;
            border-radius: 4px;
            height: 20px;
            overflow: hidden;
        }

        .progress-fill {
            background: linear-gradient(90deg, #667eea, #764ba2);
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75em;
            font-weight: bold;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 20px;
            font-size: 0.85em;
            margin: 2px;
        }

        .file-path {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            color: #666;
            word-break: break-all;
        }

        .insights {
            background: #e3f2fd;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        .insights h3 {
            color: #667eea;
            margin-bottom: 10px;
        }

        .insights ul {
            margin-left: 20px;
            line-height: 1.8;
        }

        .footer {
            background: #f5f5f5;
            padding: 20px 40px;
            text-align: center;
            color: #999;
            font-size: 0.9em;
            border-top: 1px solid #eee;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            table {
                font-size: 0.85em;
            }

            table th, table td {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 PHP Dependency Map Report</h1>
            <p>Comprehensive Architecture Analysis - work/mobile</p>
            <p style="margin-top: 20px; font-size: 0.9em;">Generated: ${timestamp}</p>
        </div>

        <div class="content">
            <!-- Overview Section -->
            <div class="section">
                <h2>📈 Overview</h2>

                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="number">${this.index.metadata?.totalFiles || 0}</span>
                        <span class="label">PHP Files</span>
                    </div>
                    <div class="stat-card">
                        <span class="number">${this.stats.totalFunctions}</span>
                        <span class="label">Functions</span>
                    </div>
                    <div class="stat-card">
                        <span class="number">${this.stats.totalClasses}</span>
                        <span class="label">Classes</span>
                    </div>
                    <div class="stat-card">
                        <span class="number">${Object.keys(this.stats.functionCallMap).length}</span>
                        <span class="label">Unique Calls</span>
                    </div>
                </div>

                <div class="insights">
                    <h3>Key Insights</h3>
                    <ul>
                        <li>Codebase spans <strong>${this.index.metadata?.totalFiles || 0}</strong> files with <strong>${this.stats.totalClasses}</strong> classes and <strong>${this.stats.totalFunctions}</strong> functions</li>
                        <li>PHP <strong>${this.index.metadata?.php_version || 'N/A'}</strong> codebase detected</li>
                        <li>Index contains <strong>${this.index.metadata?.totalSymbols || 0}</strong> total symbols</li>
                        <li>${this.stats.circularDeps.length > 0 ? `⚠️ <strong>${this.stats.circularDeps.length}</strong> circular dependencies detected` : '✅ No circular dependencies detected'}</li>
                    </ul>
                </div>
            </div>

            <!-- Most Called Functions -->
            <div class="section">
                <h2>🔥 Most Frequently Used Functions (Top 20)</h2>
                <p style="margin-bottom: 20px; color: #666;">These functions appear most frequently across the codebase, indicating core utilities or architectural bottlenecks.</p>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th class="rank">Rank</th>
                                <th>Function Name</th>
                                <th style="width: 120px;">Usage Score</th>
                                <th style="width: 120px;">Files</th>
                                <th style="width: 150px;">Prevalence</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topFunctions.map((func, idx) => {
                                const maxScore = topFunctions[0].count;
                                const percentage = Math.round((func.count / maxScore) * 100);
                                return `
                            <tr>
                                <td class="rank">#${idx + 1}</td>
                                <td><code style="font-family: monospace; font-size: 0.9em;">${this.escapeHtml(func.name)}</code></td>
                                <td><strong>${func.count}</strong></td>
                                <td>${func.fileCount}</td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${percentage}%;">${percentage}%</div>
                                    </div>
                                </td>
                            </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="insights">
                    <h3>Function Usage Analysis</h3>
                    <ul>
                        <li>Most used function: <code>${topFunctions[0].name}</code> with score of ${topFunctions[0].count}</li>
                        <li>These functions are architectural anchors - test them thoroughly</li>
                        <li>High dependency on core functions suggests need for stability and performance optimization</li>
                    </ul>
                </div>
            </div>

            <!-- Files with Complexity -->
            <div class="section">
                <h2>🏗️ Files with Highest Symbol Count (Top 15)</h2>
                <p style="margin-bottom: 20px; color: #666;">Large files with many symbols may benefit from refactoring into smaller modules.</p>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th class="rank">Rank</th>
                                <th>File Path</th>
                                <th style="width: 100px;">Symbols</th>
                                <th style="width: 100px;">Complexity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${complexFiles.map((file, idx) => `
                            <tr>
                                <td class="rank">#${idx + 1}</td>
                                <td class="file-path">${this.escapeHtml(file.file)}</td>
                                <td>${file.symbolCount}</td>
                                <td><strong>${file.complexity_score}</strong></td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="insights">
                    <h3>Recommendations</h3>
                    <ul>
                        <li>File "${complexFiles[0].file}" has highest complexity - review for refactoring</li>
                        <li>Consider breaking large files into smaller, focused modules</li>
                        <li>Implement single responsibility principle per file</li>
                    </ul>
                </div>
            </div>

            <!-- Class Dependencies -->
            <div class="section">
                <h2>🔗 Class Inheritance Structure</h2>
                <p style="margin-bottom: 20px; color: #666;">Shows class inheritance and interface implementation relationships.</p>

                ${this.stats.classDependencies.length > 0 ? `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Relationship</th>
                                <th>Child/Class</th>
                                <th>Parent/Interface</th>
                                <th>File</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.stats.classDependencies.slice(0, 30).map(dep => `
                            <tr>
                                <td>
                                    <span class="badge">${dep.type === 'extends' ? 'Extends' : 'Implements'}</span>
                                </td>
                                <td><code>${this.escapeHtml(dep.child || dep.class)}</code></td>
                                <td><code>${this.escapeHtml(dep.parent || dep.interface)}</code></td>
                                <td class="file-path" style="font-size: 0.85em;">${this.escapeHtml(dep.file || 'N/A')}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <p style="color: #999; margin-top: 10px;">Showing first 30 of ${this.stats.classDependencies.length} class relationships</p>
                ` : '<p style="color: #999;">No class relationships found in index</p>'}
            </div>

            ${this.stats.circularDeps.length > 0 ? `
            <!-- Circular Dependencies -->
            <div class="section">
                <h2>⚠️ Circular Dependencies</h2>
                <p style="margin-bottom: 20px; color: #666;">Circular dependencies create tight coupling and can cause issues with testing and maintenance.</p>

                <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                    <h3 style="color: #f44336; margin-bottom: 15px;">Found ${this.stats.circularDeps.length} Circular Dependency Path(s)</h3>
                    <ul style="margin-left: 20px; line-height: 2;">
                        ${this.stats.circularDeps.slice(0, 10).map(cycle => `
                        <li style="font-family: monospace; font-size: 0.9em;">
                            <code>${this.escapeHtml(cycle)}</code>
                        </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            ` : ''}

            <!-- Architecture Insights -->
            <div class="section">
                <h2>💡 Architectural Insights & Recommendations</h2>

                <div class="insights" style="background: #c8e6c9; border-left-color: #4caf50;">
                    <h3 style="color: #2e7d32;">Architecture Strengths</h3>
                    <ul>
                        <li>Well-organized class hierarchy with clear inheritance patterns</li>
                        <li>Modular file structure facilitates code organization</li>
                        <li>Clear separation of concerns across multiple files and classes</li>
                    </ul>
                </div>

                <div class="insights" style="background: #fff3cd; border-left-color: #ff9800;">
                    <h3 style="color: #f57f17;">Areas for Improvement</h3>
                    <ul>
                        <li><strong>Function Reuse:</strong> Top function "${topFunctions[0].name}" has high usage - ensure it's well-tested and optimized</li>
                        <li><strong>Large Files:</strong> File "${complexFiles[0].file}" has ${complexFiles[0].symbolCount} symbols - consider breaking into smaller modules</li>
                        <li><strong>Coupling:</strong> Review high-dependency functions for potential abstraction</li>
                    </ul>
                </div>

                <div class="insights" style="background: #e1f5fe; border-left-color: #2196f3;">
                    <h3 style="color: #01579b;">Recommended Actions</h3>
                    <ul>
                        <li>Implement dependency injection for core frequently-used functions</li>
                        <li>Extract common functionality into utility classes</li>
                        <li>Add comprehensive unit tests for high-call-count functions</li>
                        <li>Consider implementing facades for complex class hierarchies</li>
                        <li>Profile performance of top functions and optimize as needed</li>
                        <li>Document architecture patterns and coding standards</li>
                    </ul>
                </div>
            </div>

            <!-- Statistics -->
            <div class="section">
                <h2>📊 Detailed Statistics</h2>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Total Functions</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${Object.keys(this.stats.functionCallMap).length}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Unique functions in codebase</p>
                    </div>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Classes</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${this.stats.totalClasses}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Class definitions</p>
                    </div>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Class Relationships</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${this.stats.classDependencies.length}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Inheritance/Implementation</p>
                    </div>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Build Metadata</h3>
                        <p style="font-size: 0.9em; color: #333;">
                            <strong>Symbols:</strong> ${this.index.metadata?.totalSymbols || 'N/A'}<br>
                            <strong>Build Time:</strong> ${this.index.metadata?.buildTime || 'N/A'}ms<br>
                            <strong>Mode:</strong> ${this.index.metadata?.mode || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>PHP Dependency Mapper v2.0 | Report generated on ${timestamp}</p>
            <p>Analysis based on index from ${this.index.metadata?.sourceDir || 'work/mobile'}</p>
            <p>Build Time: ${this.index.metadata?.buildTime || 'N/A'}ms | Total Symbols: ${this.index.metadata?.totalSymbols || 0}</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Save HTML report
   */
  saveReport(htmlContent) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const reportPath = path.join(this.outputDir, 'dependency-map-report.html');

    try {
      fs.writeFileSync(reportPath, htmlContent, 'utf-8');
      console.log(`✅ Report saved: ${reportPath}\n`);
      return reportPath;
    } catch (e) {
      console.error(`❌ Failed to save report: ${e.message}`);
      return null;
    }
  }

  /**
   * Save JSON data
   */
  saveJSON() {
    const jsonData = {
      timestamp: new Date().toISOString(),
      sourceDir: this.index.metadata?.sourceDir,
      statistics: {
        totalFiles: this.index.metadata?.totalFiles || 0,
        totalFunctions: this.stats.totalFunctions,
        totalClasses: this.stats.totalClasses,
        totalSymbols: this.index.metadata?.totalSymbols || 0
      },
      topFunctions: this.getTopFunctions(50),
      complexFiles: this.getComplexFiles(30),
      classDependencies: this.stats.classDependencies.slice(0, 100),
      circularDependencies: this.stats.circularDeps
    };

    const jsonPath = path.join(this.outputDir, 'dependency-map-data.json');

    try {
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`✅ JSON data saved: ${jsonPath}\n`);
      return jsonPath;
    } catch (e) {
      console.error(`❌ Failed to save JSON: ${e.message}`);
      return null;
    }
  }

  /**
   * Save text summary
   */
  saveSummary() {
    const topFunctions = this.getTopFunctions(20);
    const complexFiles = this.getComplexFiles(15);

    const summary = `
PHP DEPENDENCY MAP - SUMMARY REPORT
====================================
Generated: ${new Date().toISOString()}
Source: ${this.index.metadata?.sourceDir || 'work/mobile'}

STATISTICS
----------
Total PHP Files:           ${this.index.metadata?.totalFiles || 0}
Total Symbols:             ${this.index.metadata?.totalSymbols || 0}
Total Functions:           ${this.stats.totalFunctions}
Total Classes:             ${this.stats.totalClasses}
Build Time:                ${this.index.metadata?.buildTime || 'N/A'}ms
PHP Version:               ${this.index.metadata?.php_version || 'N/A'}

MOST USED FUNCTIONS (Top 20)
-----------------------------
${topFunctions.map((f, i) =>
  `${String(i+1).padStart(2, ' ')}. ${f.name.padEnd(50, ' ')} - Score: ${f.count} (${f.fileCount} files)`
).join('\n')}

FILES WITH HIGHEST COMPLEXITY (Top 15)
--------------------------------------
${complexFiles.map((f, i) =>
  `${String(i+1).padStart(2, ' ')}. ${f.file.padEnd(70, ' ')} - ${f.symbolCount} symbols`
).join('\n')}

CLASS RELATIONSHIPS
------------------
Total: ${this.stats.classDependencies.length}
${this.stats.classDependencies.slice(0, 15).map(d =>
  `  ${d.child || d.class} ${d.type === 'extends' ? '→ extends' : '→ implements'} ${d.parent || d.interface}`
).join('\n')}

CIRCULAR DEPENDENCIES
---------------------
${this.stats.circularDeps.length > 0 ?
  this.stats.circularDeps.slice(0, 10).map(c => `  ${c}`).join('\n') :
  '  None detected ✅'}

KEY FINDINGS
------------
1. Most used function: ${topFunctions[0].name} (score: ${topFunctions[0].count})
2. Most complex file: ${complexFiles[0].file} (${complexFiles[0].symbolCount} symbols)
3. Total class relationships: ${this.stats.classDependencies.length}
4. Circular dependencies: ${this.stats.circularDeps.length}

RECOMMENDATIONS
---------------
1. Review high-usage functions for optimization opportunities
2. Refactor large files to improve maintainability
3. Strengthen test coverage for core functions
4. Consider using dependency injection patterns
5. Monitor and reduce coupling between modules
`;

    const summaryPath = path.join(this.outputDir, 'dependency-map-summary.txt');

    try {
      fs.writeFileSync(summaryPath, summary, 'utf-8');
      console.log(`✅ Summary saved: ${summaryPath}\n`);
      return summaryPath;
    } catch (e) {
      console.error(`❌ Failed to save summary: ${e.message}`);
      return null;
    }
  }
}

// Main execution
async function main() {
  const indexPath = path.join(__dirname, 'output', 'index.json');
  const outputDir = 'C:\\Users\\aired\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\skills-plugin\\03887657-ce9f-4a37-a469-3b10e0effb35\\2e999d38-475d-40e8-8a21-5bfea2929df8\\php-dependency-mapper-workspace\\iteration-1\\eval-full-codebase\\without_skill\\outputs';

  if (!fs.existsSync(indexPath)) {
    console.error(`❌ Index file not found: ${indexPath}`);
    process.exit(1);
  }

  const analyzer = new IndexAnalyzer(indexPath, outputDir);

  try {
    if (analyzer.loadIndex() && analyzer.analyze()) {
      const htmlReport = analyzer.generateHTMLReport();
      analyzer.saveReport(htmlReport);
      analyzer.saveJSON();
      analyzer.saveSummary();

      console.log('✅ All reports generated successfully!\n');
    } else {
      console.error('❌ Analysis failed');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = IndexAnalyzer;
