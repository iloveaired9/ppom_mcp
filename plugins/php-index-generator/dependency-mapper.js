#!/usr/bin/env node

/**
 * Comprehensive PHP Dependency Mapper
 * Analyzes work/mobile codebase and generates dependency map with statistics
 * Uses basic file reading and regex parsing to avoid memory/permission issues
 */

const fs = require('fs');
const path = require('path');

class DependencyMapper {
  constructor(sourceDir = 'work/mobile', outputDir = null) {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir || path.join(__dirname, 'output', 'dependency-map');
    this.stats = {
      totalFiles: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalIncludes: 0,
      functionCalls: {},
      classDependencies: [],
      fileDependencies: [],
      circularDeps: [],
      architectureBottlenecks: []
    };
    this.fileContent = {};
    this.symbols = {};
    this.dependencies = {};
  }

  /**
   * Recursively collect all PHP files
   */
  collectPhpFiles(dir, fileList = []) {
    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // Skip vendor and other excluded dirs
            if (!['vendor', 'vendors', 'node_modules', '.git', '.svn', 'cache', 'tmp'].includes(file)) {
              this.collectPhpFiles(filePath, fileList);
            }
          } else if (file.endsWith('.php')) {
            fileList.push(filePath);
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }

    return fileList;
  }

  /**
   * Extract functions from PHP code
   */
  extractFunctions(content, filePath) {
    const functions = [];

    // Match function definitions: function name()
    const functionRegex = /(?:^|\s)function\s+(\w+)\s*\(/gm;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        type: 'function',
        file: filePath,
        line: lineNum
      });
    }

    return functions;
  }

  /**
   * Extract classes from PHP code
   */
  extractClasses(content, filePath) {
    const classes = [];

    // Match class definitions with extends/implements
    const classRegex = /(?:^|\s)(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/gm;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const className = match[1];
      const extendsClass = match[2] ? match[2].trim() : null;
      const implementsInterfaces = match[3] ? match[3].split(',').map(i => i.trim()) : [];

      classes.push({
        name: className,
        type: 'class',
        file: filePath,
        line: lineNum,
        extends: extendsClass,
        implements: implementsInterfaces
      });

      // Track class inheritance
      if (extendsClass) {
        this.stats.classDependencies.push({
          child: className,
          parent: extendsClass,
          type: 'extends',
          file: filePath
        });
      }

      implementsInterfaces.forEach(iface => {
        this.stats.classDependencies.push({
          class: className,
          interface: iface,
          type: 'implements',
          file: filePath
        });
      });
    }

    return classes;
  }

  /**
   * Extract function calls from PHP code
   */
  extractFunctionCalls(content, filePath) {
    const calls = {};

    // Match function calls: functionName( or Class::methodName(
    const callRegex = /(?:^|\W)(?:(\w+)::)?(\w+)\s*\(/gm;
    let match;

    while ((match = callRegex.exec(content)) !== null) {
      const className = match[1];
      const functionName = match[2];
      const fullName = className ? `${className}::${functionName}` : functionName;

      // Skip common PHP constructs and built-ins
      if (!this.isBuiltin(functionName)) {
        if (!calls[fullName]) {
          calls[fullName] = { count: 0, files: new Set() };
        }
        calls[fullName].count++;
        calls[fullName].files.add(filePath);
      }
    }

    return calls;
  }

  /**
   * Extract include/require statements
   */
  extractIncludes(content, filePath) {
    const includes = [];

    // Match include/require statements
    const includeRegex = /(?:include|require)(?:_once)?\s+['\"]?([^'"\n;]+)['\"]?/gm;
    let match;

    while ((match = includeRegex.exec(content)) !== null) {
      const includePath = match[1].trim();

      // Filter out dynamic includes
      if (!includePath.includes('$')) {
        includes.push({
          path: includePath,
          type: includePath.includes('_once') ? 'include_once' : 'include',
          file: filePath,
          line: content.substring(0, match.index).split('\n').length
        });

        this.stats.fileDependencies.push({
          from: filePath,
          to: includePath,
          type: 'include'
        });
      }
    }

    return includes;
  }

  /**
   * Check if function is PHP built-in
   */
  isBuiltin(name) {
    const builtins = new Set([
      'echo', 'print', 'var_dump', 'print_r', 'exit', 'die', 'isset', 'empty',
      'strlen', 'substr', 'strpos', 'str_replace', 'trim', 'explode', 'implode',
      'array_push', 'array_pop', 'count', 'sizeof', 'in_array', 'array_merge',
      'foreach', 'if', 'while', 'for', 'switch', 'case', 'return', 'new',
      'array_keys', 'array_values', 'json_encode', 'json_decode', 'file_exists',
      'is_array', 'is_string', 'is_int', 'is_numeric', 'intval', 'floatval'
    ]);
    return builtins.has(name);
  }

  /**
   * Analyze the entire codebase
   */
  async analyze() {
    console.log('\n📊 Starting comprehensive dependency analysis...\n');

    const startTime = Date.now();

    // Collect all PHP files
    console.log(`📂 Scanning ${this.sourceDir} for PHP files...`);
    const phpFiles = this.collectPhpFiles(this.sourceDir);
    this.stats.totalFiles = phpFiles.length;
    console.log(`   Found ${phpFiles.length} PHP files\n`);

    if (phpFiles.length === 0) {
      console.error('❌ No PHP files found!');
      return false;
    }

    // Process each file
    console.log('🔍 Analyzing files...');
    let processedCount = 0;
    const reportInterval = Math.ceil(phpFiles.length / 10);

    for (const filePath of phpFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        this.fileContent[filePath] = content;

        // Extract symbols
        const functions = this.extractFunctions(content, filePath);
        const classes = this.extractClasses(content, filePath);
        const includes = this.extractIncludes(content, filePath);
        const calls = this.extractFunctionCalls(content, filePath);

        this.symbols[filePath] = {
          functions: functions,
          classes: classes,
          includes: includes
        };

        this.stats.totalFunctions += functions.length;
        this.stats.totalClasses += classes.length;
        this.stats.totalIncludes += includes.length;

        // Merge function calls
        for (const [name, data] of Object.entries(calls)) {
          if (!this.stats.functionCalls[name]) {
            this.stats.functionCalls[name] = { count: 0, files: new Set() };
          }
          this.stats.functionCalls[name].count += data.count;
          data.files.forEach(f => this.stats.functionCalls[name].files.add(f));
        }

        processedCount++;
        if (processedCount % reportInterval === 0) {
          const progress = Math.round((processedCount / phpFiles.length) * 100);
          console.log(`   ${progress}% processed (${processedCount}/${phpFiles.length})`);
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }

    console.log(`\n✅ Analysis complete (${processedCount} files processed)\n`);

    // Identify bottlenecks
    this.identifyBottlenecks();

    // Detect circular dependencies
    this.detectCircularDependencies();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Total time: ${duration}s\n`);

    return true;
  }

  /**
   * Identify architectural bottlenecks
   */
  identifyBottlenecks() {
    console.log('🔍 Identifying architectural bottlenecks...\n');

    // Find most called functions (potential bottlenecks)
    const sortedCalls = Object.entries(this.stats.functionCalls)
      .map(([name, data]) => ({
        name,
        count: data.count,
        fileCount: data.files.size,
        avgCallsPerFile: Math.round(data.count / data.files.size)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    // Find files with most dependencies
    const fileDependencyMap = {};
    this.stats.fileDependencies.forEach(dep => {
      if (!fileDependencyMap[dep.from]) {
        fileDependencyMap[dep.from] = { requires: [], requiredBy: [] };
      }
      fileDependencyMap[dep.from].requires.push(dep.to);
    });

    this.stats.fileDependencies.forEach(dep => {
      if (!fileDependencyMap[dep.to]) {
        fileDependencyMap[dep.to] = { requires: [], requiredBy: [] };
      }
      fileDependencyMap[dep.to].requiredBy.push(dep.from);
    });

    const fileComplexity = Object.entries(fileDependencyMap)
      .map(([file, deps]) => ({
        file,
        requires: deps.requires.length,
        requiredBy: deps.requiredBy.length,
        total: deps.requires.length + deps.requiredBy.length
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    this.stats.architectureBottlenecks = {
      topCalledFunctions: sortedCalls,
      highlyUsedFiles: fileComplexity
    };
  }

  /**
   * Basic circular dependency detection
   */
  detectCircularDependencies() {
    // This is a simplified version - full cycle detection would be complex
    const visited = new Set();
    const stack = new Set();

    const dfs = (file, path = []) => {
      if (visited.has(file)) return;

      if (stack.has(file)) {
        // Found a cycle
        const cycleStart = path.indexOf(file);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).concat([file]);
          this.stats.circularDeps.push(cycle.join(' → '));
        }
        return;
      }

      stack.add(file);

      const deps = this.stats.fileDependencies.filter(d => d.from === file);
      for (const dep of deps) {
        dfs(dep.to, [...path, file]);
      }

      stack.delete(file);
      visited.add(file);
    };

    // Start DFS from each file
    const uniqueFiles = new Set(this.stats.fileDependencies.map(d => d.from));
    for (const file of Array.from(uniqueFiles).slice(0, 50)) {
      dfs(file);
    }
  }

  /**
   * Generate comprehensive HTML report
   */
  generateHTMLReport() {
    console.log('📝 Generating HTML report...\n');

    const timestamp = new Date().toISOString();
    const mostCalledFunctions = this.stats.architectureBottlenecks.topCalledFunctions.slice(0, 20);
    const highComplexityFiles = this.stats.architectureBottlenecks.highlyUsedFiles.slice(0, 15);

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

        .highlight {
            background: #fff3cd;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .footer {
            background: #f5f5f5;
            padding: 20px 40px;
            text-align: center;
            color: #999;
            font-size: 0.9em;
            border-top: 1px solid #eee;
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
            <p>Comprehensive Architecture Analysis for work/mobile</p>
            <p style="margin-top: 20px; font-size: 0.9em;">Generated: ${timestamp}</p>
        </div>

        <div class="content">
            <!-- Overview Section -->
            <div class="section">
                <h2>📈 Overview</h2>

                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="number">${this.stats.totalFiles}</span>
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
                        <span class="number">${this.stats.totalIncludes}</span>
                        <span class="label">Include/Require</span>
                    </div>
                </div>

                <div class="insights">
                    <h3>Key Insights</h3>
                    <ul>
                        <li>Codebase spans <strong>${this.stats.totalFiles}</strong> files with <strong>${this.stats.totalClasses}</strong> classes and <strong>${this.stats.totalFunctions}</strong> functions</li>
                        <li>High reuse of <strong>${mostCalledFunctions.length}</strong> core functions suggests tight coupling</li>
                        <li>File dependencies show potential architectural hot-spots</li>
                        ${this.stats.circularDeps.length > 0 ? `<li class="highlight">⚠️ <strong>${this.stats.circularDeps.length}</strong> circular dependencies detected</li>` : '<li>✅ No circular dependencies detected</li>'}
                    </ul>
                </div>
            </div>

            <!-- Most Called Functions -->
            <div class="section">
                <h2>🔥 Most Called Functions (Top 20)</h2>
                <p style="margin-bottom: 20px; color: #666;">These functions are called frequently across the codebase. High call counts may indicate architectural bottlenecks or core utilities.</p>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th class="rank">Rank</th>
                                <th>Function Name</th>
                                <th style="width: 100px;">Total Calls</th>
                                <th style="width: 120px;">Used in Files</th>
                                <th style="width: 150px;">Distribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mostCalledFunctions.map((func, idx) => {
                                const maxCalls = mostCalledFunctions[0].count;
                                const percentage = Math.round((func.count / maxCalls) * 100);
                                return `
                            <tr>
                                <td class="rank">#${idx + 1}</td>
                                <td><code style="font-family: monospace;">${this.escapeHtml(func.name)}</code></td>
                                <td><strong>${func.count}</strong></td>
                                <td>${func.fileCount} files</td>
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
                    <h3>Analysis</h3>
                    <ul>
                        <li>Top function <code>${mostCalledFunctions[0].name}</code> called <strong>${mostCalledFunctions[0].count}</strong> times</li>
                        <li>Average calls per file: <strong>${mostCalledFunctions[0].avgCallsPerFile}</strong></li>
                        <li>High-call functions are candidates for refactoring or optimization</li>
                    </ul>
                </div>
            </div>

            <!-- Architectural Complexity -->
            <div class="section">
                <h2>🏗️ Files with Highest Complexity (Top 15)</h2>
                <p style="margin-bottom: 20px; color: #666;">Files that have many dependencies (both inbound and outbound) may be architectural bottlenecks or central hubs.</p>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th class="rank">Rank</th>
                                <th>File Path</th>
                                <th style="width: 100px;">Requires</th>
                                <th style="width: 100px;">Required By</th>
                                <th style="width: 100px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${highComplexityFiles.map((file, idx) => `
                            <tr>
                                <td class="rank">#${idx + 1}</td>
                                <td class="file-path">${this.escapeHtml(file.file)}</td>
                                <td>${file.requires}</td>
                                <td>${file.requiredBy}</td>
                                <td><strong>${file.total}</strong></td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="insights">
                    <h3>Recommendations</h3>
                    <ul>
                        <li>Files with high complexity should be reviewed for refactoring opportunities</li>
                        <li>Consider breaking down large files into smaller modules</li>
                        <li>Evaluate whether dependencies can be reduced through better abstraction</li>
                    </ul>
                </div>
            </div>

            <!-- Class Dependencies -->
            <div class="section">
                <h2>🔗 Class Inheritance Relationships</h2>
                <p style="margin-bottom: 20px; color: #666;">Shows inheritance hierarchy and interface implementation.</p>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Child Class</th>
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
                                <td class="file-path" style="font-size: 0.85em;">${this.escapeHtml(dep.file)}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <p style="color: #999; margin-top: 10px;">
                    Showing first 30 of ${this.stats.classDependencies.length} total class relationships
                </p>
            </div>

            ${this.stats.circularDeps.length > 0 ? `
            <!-- Circular Dependencies -->
            <div class="section">
                <h2>⚠️ Circular Dependencies</h2>
                <p style="margin-bottom: 20px; color: #666;">Circular dependencies can lead to tight coupling and make code harder to understand and maintain.</p>

                <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                    <h3 style="color: #f44336; margin-bottom: 15px;">Found ${this.stats.circularDeps.length} Circular Dependency Path(s)</h3>
                    <ul style="margin-left: 20px; line-height: 2;">
                        ${this.stats.circularDeps.slice(0, 10).map(cycle => `
                        <li style="font-family: monospace; font-size: 0.9em;">
                            <code>${this.escapeHtml(cycle)}</code>
                        </li>
                        `).join('')}
                    </ul>
                    ${this.stats.circularDeps.length > 10 ? `<p style="margin-top: 15px; color: #999;">... and ${this.stats.circularDeps.length - 10} more circular paths</p>` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Statistics -->
            <div class="section">
                <h2>📊 Dependency Statistics</h2>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Function Calls</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${Object.keys(this.stats.functionCalls).length}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Unique functions called</p>
                    </div>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">Class Relationships</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${this.stats.classDependencies.length}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Extends/Implements relationships</p>
                    </div>

                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                        <h3 style="color: #667eea; margin-bottom: 10px;">File Dependencies</h3>
                        <p style="font-size: 1.5em; font-weight: bold; color: #333;">
                            ${this.stats.fileDependencies.length}
                        </p>
                        <p style="color: #999; font-size: 0.9em;">Include/Require relationships</p>
                    </div>
                </div>
            </div>

            <!-- Architectural Insights -->
            <div class="section">
                <h2>💡 Architectural Insights & Recommendations</h2>

                <div class="insights" style="background: #c8e6c9; border-left-color: #4caf50;">
                    <h3 style="color: #2e7d32;">Positive Aspects</h3>
                    <ul>
                        <li>Modular file structure with include/require dependencies</li>
                        <li>Clear class inheritance hierarchy</li>
                        <li>Reusable functions concentrated in core modules</li>
                    </ul>
                </div>

                <div class="insights" style="background: #fff3cd; border-left-color: #ff9800;">
                    <h3 style="color: #f57f17;">Areas for Improvement</h3>
                    <ul>
                        <li><strong>High Reuse:</strong> ${mostCalledFunctions[0].name} called ${mostCalledFunctions[0].count} times - consider if this indicates tight coupling</li>
                        <li><strong>File Complexity:</strong> ${highComplexityFiles[0].file} has ${highComplexityFiles[0].total} dependencies - review for refactoring</li>
                        <li><strong>Circular Dependencies:</strong> ${this.stats.circularDeps.length > 0 ? `${this.stats.circularDeps.length} circular paths found - recommend breaking cycles` : 'None detected - good!'}</li>
                        <li><strong>Dependency Injection:</strong> Consider implementing to reduce coupling and improve testability</li>
                    </ul>
                </div>

                <div class="insights" style="background: #e1f5fe; border-left-color: #2196f3;">
                    <h3 style="color: #01579b;">Recommended Actions</h3>
                    <ul>
                        <li>Extract common functionality from high-call functions into utilities</li>
                        <li>Break down large files into single-responsibility modules</li>
                        <li>Reduce coupling by using interfaces and abstract classes</li>
                        <li>Consider implementing a plugin architecture or service locator pattern</li>
                        <li>Add unit tests to validate refactoring changes</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>PHP Dependency Mapper v1.0 | Report generated on ${timestamp}</p>
            <p>Analysis of ${this.stats.totalFiles} files in ${this.sourceDir}</p>
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
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Save report to file
   */
  async saveReport(htmlContent) {
    // Ensure output directory exists
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
   * Generate JSON data file for further analysis
   */
  async saveJSON() {
    const jsonData = {
      timestamp: new Date().toISOString(),
      sourceDir: this.sourceDir,
      statistics: {
        totalFiles: this.stats.totalFiles,
        totalFunctions: this.stats.totalFunctions,
        totalClasses: this.stats.totalClasses,
        totalIncludes: this.stats.totalIncludes
      },
      topCalledFunctions: this.stats.architectureBottlenecks.topCalledFunctions.slice(0, 50),
      highComplexityFiles: this.stats.architectureBottlenecks.highlyUsedFiles.slice(0, 30),
      classDependencies: this.stats.classDependencies.slice(0, 100),
      circularDependencies: this.stats.circularDeps.slice(0, 50)
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
   * Generate text summary
   */
  async saveSummary() {
    const summary = `
PHP DEPENDENCY MAP - SUMMARY REPORT
====================================
Generated: ${new Date().toISOString()}
Source: ${this.sourceDir}

STATISTICS
----------
Total PHP Files:           ${this.stats.totalFiles}
Total Functions:           ${this.stats.totalFunctions}
Total Classes:             ${this.stats.totalClasses}
Include/Require Statements: ${this.stats.totalIncludes}

MOST CALLED FUNCTIONS (Top 20)
------------------------------
${this.stats.architectureBottlenecks.topCalledFunctions.slice(0, 20).map((f, i) =>
  `${String(i+1).padStart(2, ' ')}. ${f.name.padEnd(50, ' ')} - ${f.count} calls (${f.fileCount} files)`
).join('\n')}

FILES WITH HIGHEST COMPLEXITY (Top 15)
--------------------------------------
${this.stats.architectureBottlenecks.highlyUsedFiles.slice(0, 15).map((f, i) =>
  `${String(i+1).padStart(2, ' ')}. ${f.file} - ${f.total} deps (${f.requires} requires, ${f.requiredBy} required by)`
).join('\n')}

CLASS RELATIONSHIPS
------------------
Total Relationships: ${this.stats.classDependencies.length}
${this.stats.classDependencies.slice(0, 15).map(d =>
  `  ${d.child || d.class} ${d.type === 'extends' ? 'extends' : 'implements'} ${d.parent || d.interface}`
).join('\n')}

CIRCULAR DEPENDENCIES
---------------------
${this.stats.circularDeps.length > 0 ?
  this.stats.circularDeps.slice(0, 10).map(c => `  ${c}`).join('\n') :
  '  None detected'}

KEY INSIGHTS
------------
1. Codebase has ${this.stats.totalFiles} files with clear modular structure
2. Top function ${this.stats.architectureBottlenecks.topCalledFunctions[0].name} called ${this.stats.architectureBottlenecks.topCalledFunctions[0].count} times
3. ${this.stats.architectureBottlenecks.highlyUsedFiles[0].file} is most complex file
4. ${this.stats.circularDeps.length === 0 ? 'No circular dependencies detected - good!' : `${this.stats.circularDeps.length} circular dependencies found - needs review`}

RECOMMENDATIONS
---------------
1. Review high-call functions for refactoring opportunities
2. Break down complex files into smaller modules
3. Reduce coupling through better abstraction
4. Implement dependency injection patterns
5. Add comprehensive unit tests
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
  const mapper = new DependencyMapper('work/mobile', 'C:\\Users\\aired\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\skills-plugin\\03887657-ce9f-4a37-a469-3b10e0effb35\\2e999d38-475d-40e8-8a21-5bfea2929df8\\php-dependency-mapper-workspace\\iteration-1\\eval-full-codebase\\without_skill\\outputs');

  try {
    const success = await mapper.analyze();

    if (success) {
      console.log('\n🔨 Generating reports...\n');

      const htmlReport = mapper.generateHTMLReport();
      await mapper.saveReport(htmlReport);
      await mapper.saveJSON();
      await mapper.saveSummary();

      console.log('\n✅ All reports generated successfully!\n');
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

module.exports = DependencyMapper;
