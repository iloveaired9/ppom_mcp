<?php
/**
 * PHP Dependency Mapper - Complete Analysis Tool
 * Generates interactive HTML report with dependency analysis
 */

class PHPDependencyAnalyzer {
    private $basePath;
    private $phpFiles = [];
    private $dependencies = [];
    private $functionCalls = [];
    private $classDefinitions = [];
    private $circularDependencies = [];
    private $functionStats = [];
    private $includes = [];
    private $callGraphData = [];

    public function __construct($basePath) {
        $this->basePath = rtrim($basePath, '/\\');
    }

    public function analyze() {
        echo "[INFO] Starting analysis of: {$this->basePath}\n";
        $this->findPhpFiles();
        echo "[INFO] Found " . count($this->phpFiles) . " PHP files\n";

        $count = 0;
        foreach ($this->phpFiles as $file) {
            $count++;
            if ($count % 50 === 0) {
                echo "[PROGRESS] Analyzed $count files...\n";
            }
            $this->analyzeFile($file);
        }

        echo "[INFO] Detecting circular dependencies...\n";
        $this->detectCircularDependencies();

        echo "[INFO] Calculating statistics...\n";
        $this->calculateStatistics();

        echo "[INFO] Generating report...\n";
        return $this->generateReport();
    }

    private function findPhpFiles() {
        try {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($this->basePath, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($iterator as $file) {
                if ($file->getExtension() === 'php') {
                    $this->phpFiles[] = $file->getPathname();
                }
            }
            sort($this->phpFiles);
        } catch (Exception $e) {
            echo "[ERROR] " . $e->getMessage() . "\n";
        }
    }

    private function analyzeFile($filePath) {
        try {
            $content = file_get_contents($filePath);
            $relativePath = str_replace($this->basePath . DIRECTORY_SEPARATOR, '', $filePath);
            $relativePath = str_replace('\\', '/', $relativePath);

            $this->findIncludes($filePath, $content, $relativePath);
            $this->findClasses($filePath, $content, $relativePath);
            $this->findFunctionCalls($filePath, $content, $relativePath);
            $this->findDependencies($filePath, $content, $relativePath);
        } catch (Exception $e) {
            // Silently skip files that can't be read
        }
    }

    private function findIncludes(&$filePath, &$content, &$relativePath) {
        $patterns = [
            '/(?:require|include|require_once|include_once)\s*\(\s*[\'"]?([^\'")\n;]+)[\'"]?\s*\)/i',
            '/(?:require|include|require_once|include_once)\s*[\'"]([^\'"]+)[\'"]/i'
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $content, $matches)) {
                if (!isset($this->includes[$relativePath])) {
                    $this->includes[$relativePath] = [];
                }
                foreach ($matches[1] as $include) {
                    $include = trim($include);
                    if (!empty($include) && !in_array($include, $this->includes[$relativePath])) {
                        $this->includes[$relativePath][] = $include;
                        if (!isset($this->dependencies[$relativePath])) {
                            $this->dependencies[$relativePath] = [];
                        }
                        $this->dependencies[$relativePath][] = $include;
                    }
                }
            }
        }
    }

    private function findClasses(&$filePath, &$content, &$relativePath) {
        $pattern = '/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/';
        if (preg_match_all($pattern, $content, $matches)) {
            if (!isset($this->classDefinitions[$relativePath])) {
                $this->classDefinitions[$relativePath] = [];
            }
            foreach ($matches[1] as $i => $className) {
                $this->classDefinitions[$relativePath][] = [
                    'name' => $className,
                    'extends' => !empty($matches[2][$i]) ? trim($matches[2][$i]) : null,
                    'implements' => !empty($matches[3][$i]) ? trim($matches[3][$i]) : null
                ];
            }
        }
    }

    private function findFunctionCalls(&$filePath, &$content, &$relativePath) {
        // Remove strings and comments first to avoid false positives
        $cleaned = $this->removeStringsAndComments($content);

        $pattern = '/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/';
        if (preg_match_all($pattern, $cleaned, $matches)) {
            if (!isset($this->functionCalls[$relativePath])) {
                $this->functionCalls[$relativePath] = [];
            }

            $keywords = ['if', 'while', 'for', 'foreach', 'switch', 'catch', 'function', 'class', 'else',
                        'elseif', 'return', 'echo', 'print', 'array', 'list', 'isset', 'empty', 'die', 'exit'];

            foreach ($matches[1] as $funcName) {
                if (!in_array(strtolower($funcName), $keywords)) {
                    $this->functionCalls[$relativePath][] = $funcName;
                    if (!isset($this->functionStats[$funcName])) {
                        $this->functionStats[$funcName] = 0;
                    }
                    $this->functionStats[$funcName]++;
                }
            }
        }
    }

    private function removeStringsAndComments($content) {
        // Remove single-line comments
        $content = preg_replace('/#.*$/m', '', $content);
        $content = preg_replace('|//.*$|m', '', $content);

        // Remove multi-line comments
        $content = preg_replace('|/\*.*?\*/|s', '', $content);

        // Remove strings
        $content = preg_replace('/"(?:\\.|[^"\\])*"/', '""', $content);
        $content = preg_replace("/'(?:\\.|[^'\\])*'/", "''", $content);

        return $content;
    }

    private function findDependencies(&$filePath, &$content, &$relativePath) {
        $cleaned = $this->removeStringsAndComments($content);

        // Find new instantiations
        $pattern = '/new\s+([a-zA-Z_][a-zA-Z0-9_\\\\]*)/';
        if (preg_match_all($pattern, $cleaned, $matches)) {
            if (!isset($this->dependencies[$relativePath])) {
                $this->dependencies[$relativePath] = [];
            }
            foreach ($matches[1] as $className) {
                $className = str_replace('\\', '/', trim($className));
                if (!in_array('class:' . $className, $this->dependencies[$relativePath])) {
                    $this->dependencies[$relativePath][] = 'class:' . $className;
                }
            }
        }

        // Find static calls
        $pattern = '/([a-zA-Z_][a-zA-Z0-9_\\\\]*)\s*::\s*(\w+)/';
        if (preg_match_all($pattern, $cleaned, $matches)) {
            if (!isset($this->dependencies[$relativePath])) {
                $this->dependencies[$relativePath] = [];
            }
            foreach ($matches[0] as $call) {
                $call = str_replace('\\', '/', trim($call));
                if (!in_array('static:' . $call, $this->dependencies[$relativePath])) {
                    $this->dependencies[$relativePath][] = 'static:' . $call;
                }
            }
        }
    }

    private function detectCircularDependencies() {
        $checked = [];
        foreach ($this->dependencies as $file => $deps) {
            foreach ($deps as $dep) {
                $key = $file . '|' . $dep;
                if (!isset($checked[$key])) {
                    $checked[$key] = true;
                    if ($this->hasCircularPath($file, $dep, [])) {
                        $this->circularDependencies[] = [$file, $dep];
                    }
                }
            }
        }
    }

    private function hasCircularPath($source, $target, $visited) {
        if ($source === $target && !empty($visited)) {
            return true;
        }
        if (in_array($target, $visited)) {
            return false;
        }

        $visited[] = $target;

        if (isset($this->dependencies[$target])) {
            foreach ($this->dependencies[$target] as $dep) {
                if ($this->hasCircularPath($source, $dep, $visited)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function calculateStatistics() {
        arsort($this->functionStats);
    }

    private function generateReport() {
        $topFunctions = array_slice($this->functionStats, 0, 30, true);
        $totalClasses = 0;
        foreach ($this->classDefinitions as $classes) {
            $totalClasses += count($classes);
        }

        $html = $this->getHtmlTemplate();

        $html = str_replace('[TOTAL_FILES]', count($this->phpFiles), $html);
        $html = str_replace('[TOTAL_CLASSES]', $totalClasses, $html);
        $html = str_replace('[TOTAL_FUNCTIONS]', count($this->functionStats), $html);
        $html = str_replace('[CIRCULAR_COUNT]', count($this->circularDependencies), $html);
        $html = str_replace('[ANALYSIS_DATE]', date('Y-m-d H:i:s'), $html);
        $html = str_replace('[BASE_PATH]', htmlspecialchars($this->basePath), $html);
        $html = str_replace('[TOTAL_CALLS]', array_sum($this->functionStats), $html);

        // Generate functions list
        $functionsHtml = '';
        $maxCount = max($topFunctions) ?: 1;
        foreach ($topFunctions as $funcName => $count) {
            $percentage = ($count / $maxCount) * 100;
            $functionsHtml .= sprintf(
                '                    <div class="function-item"><div><div class="name">%s</div><div class="progress-bar"><div class="progress-fill" style="width: %.1f%%"></div></div></div><div class="count">%d calls</div></div>' . "\n",
                htmlspecialchars($funcName),
                $percentage,
                $count
            );
        }
        $html = str_replace('[FUNCTIONS_LIST]', $functionsHtml, $html);

        // Generate circular dependencies warning
        $circularHtml = '';
        if (count($this->circularDependencies) > 0) {
            $circularHtml = '<div class="warning-box"><h3>⚠️ Circular Dependencies Detected</h3><p>The following files have potential circular dependencies:</p><ul>' . "\n";
            foreach (array_slice($this->circularDependencies, 0, 15) as $circular) {
                $circularHtml .= sprintf('                    <li><code>%s</code> ↔ <code>%s</code></li>' . "\n",
                    htmlspecialchars($circular[0]), htmlspecialchars($circular[1]));
            }
            if (count($this->circularDependencies) > 15) {
                $circularHtml .= '<li>... and ' . (count($this->circularDependencies) - 15) . ' more circular dependencies</li>' . "\n";
            }
            $circularHtml .= '                </ul></div>' . "\n";
        } else {
            $circularHtml = '<div class="success-box"><h3>✓ No Circular Dependencies Detected</h3><p>Your codebase appears to have a clean dependency structure.</p></div>' . "\n";
        }
        $html = str_replace('[CIRCULAR_SECTION]', $circularHtml, $html);

        // Generate bottleneck section
        $bottleneckHtml = '';
        $maxCalls = max(array_values($this->functionStats) ?: [0]);
        $bottlenecks = array_filter($this->functionStats, function($count) use ($maxCalls) {
            return $count > ($maxCalls * 0.5);
        });

        if (count($bottlenecks) > 0) {
            $bottleneckHtml = '<div class="warning-box"><h3>⚠️ Potential Bottleneck Functions</h3><p>These functions are called frequently and might be architectural bottlenecks:</p><ul>' . "\n";
            foreach (array_slice($bottlenecks, 0, 10, true) as $func => $count) {
                $bottleneckHtml .= sprintf('                    <li><code>%s</code> - called %d times</li>' . "\n",
                    htmlspecialchars($func), $count);
            }
            $bottleneckHtml .= '                </ul></div>' . "\n";
        }
        $html = str_replace('[BOTTLENECK_SECTION]', $bottleneckHtml, $html);

        // Generate class definitions
        $classesHtml = '';
        if (count($this->classDefinitions) > 0) {
            $classCount = 0;
            foreach ($this->classDefinitions as $file => $classes) {
                foreach ($classes as $class) {
                    if ($classCount >= 50) {
                        $remaining = $totalClasses - $classCount;
                        $classesHtml .= '<div class="function-item"><div>... and ' . $remaining . ' more classes</div></div>' . "\n";
                        break 2;
                    }
                    $inherits = $class['extends'] ? ' extends ' . htmlspecialchars($class['extends']) : '';
                    $implements = $class['implements'] ? ' implements ' . htmlspecialchars(substr($class['implements'], 0, 50)) : '';
                    $classesHtml .= sprintf(
                        '                    <div class="function-item"><div class="name">%s</div><div style="color: #999; font-size: 0.9em;">%s%s%s</div></div>' . "\n",
                        htmlspecialchars($class['name']),
                        htmlspecialchars($file),
                        $inherits,
                        $implements
                    );
                    $classCount++;
                }
            }
        } else {
            $classesHtml = '<p style="color: #999;">No class definitions found in the analyzed codebase.</p>' . "\n";
        }
        $html = str_replace('[CLASSES_LIST]', $classesHtml, $html);

        // Generate includes/requires dependencies
        $includesHtml = '';
        if (count($this->includes) > 0) {
            $includeCount = 0;
            foreach ($this->includes as $file => $deps) {
                foreach ($deps as $dep) {
                    if ($includeCount >= 50) {
                        $includesHtml .= '<div class="function-item"><div>... and more dependencies</div></div>' . "\n";
                        break 2;
                    }
                    $includesHtml .= sprintf(
                        '                    <div class="function-item"><div><strong>%s</strong><br><span style="color: #667eea;">→ %s</span></div></div>' . "\n",
                        htmlspecialchars($file),
                        htmlspecialchars(substr($dep, 0, 100))
                    );
                    $includeCount++;
                }
            }
        } else {
            $includesHtml = '<p style="color: #999;">No includes/requires found in the analyzed codebase.</p>' . "\n";
        }
        $html = str_replace('[INCLUDES_LIST]', $includesHtml, $html);

        // Generate file tree
        $fileTreeHtml = '';
        $directoryGroups = [];
        foreach ($this->phpFiles as $file) {
            $rel = str_replace($this->basePath . DIRECTORY_SEPARATOR, '', $file);
            $rel = str_replace('\\', '/', $rel);
            $dir = dirname($rel);
            if (!isset($directoryGroups[$dir])) {
                $directoryGroups[$dir] = [];
            }
            $directoryGroups[$dir][] = basename($file);
        }

        ksort($directoryGroups);
        foreach ($directoryGroups as $dir => $files) {
            $fileCount = count($files);
            $isHighlighted = $fileCount > 20 ? ' highlight' : '';
            $fileTreeHtml .= sprintf('<div class="file-item%s"><strong>%s</strong> (%d files)</div>' . "\n",
                $isHighlighted, htmlspecialchars($dir), $fileCount);
        }
        $html = str_replace('[FILE_TREE]', $fileTreeHtml, $html);

        return $html;
    }

    private function getHtmlTemplate() {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Dependency Map Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
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
            font-size: 1.1em;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .stat-card h3 {
            font-size: 0.9em;
            opacity: 0.9;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .stat-card .value {
            font-size: 2.5em;
            font-weight: bold;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            font-size: 1.8em;
        }

        .function-list {
            display: grid;
            gap: 10px;
        }

        .function-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .function-item .name {
            font-weight: 600;
            color: #333;
        }

        .function-item .count {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }

        .progress-bar {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
        }

        .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .warning-box h3 {
            color: #856404;
            margin-bottom: 10px;
        }

        .warning-box ul {
            margin-left: 20px;
            color: #856404;
        }

        .warning-box li {
            margin-bottom: 8px;
        }

        .success-box {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .success-box h3 {
            color: #155724;
        }

        .success-box p {
            color: #155724;
        }

        .file-tree {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            max-height: 400px;
            overflow-y: auto;
            border-left: 4px solid #667eea;
        }

        .file-item {
            padding: 8px;
            margin: 4px 0;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #e0e0e0;
            padding-left: 12px;
            font-size: 0.9em;
            color: #555;
        }

        .file-item.highlight {
            border-left-color: #ffc107;
            background: #fffbf0;
        }

        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #e0e0e0;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }

            .section h2 {
                font-size: 1.4em;
            }
        }

        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏗️ PHP Dependency Map Report</h1>
            <p>Complete architectural analysis of your PHP codebase</p>
        </div>

        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total PHP Files</h3>
                    <div class="value">[TOTAL_FILES]</div>
                </div>

                <div class="stat-card">
                    <h3>Classes Defined</h3>
                    <div class="value">[TOTAL_CLASSES]</div>
                </div>

                <div class="stat-card">
                    <h3>Function Calls Tracked</h3>
                    <div class="value">[TOTAL_FUNCTIONS]</div>
                </div>

                <div class="stat-card">
                    <h3>Potential Circular Dependencies</h3>
                    <div class="value">[CIRCULAR_COUNT]</div>
                </div>
            </div>

            <!-- Warnings Section -->
            <div class="section">
                <h2>⚠️ Architecture Warnings</h2>
                [CIRCULAR_SECTION]
                [BOTTLENECK_SECTION]
            </div>

            <!-- Most Called Functions -->
            <div class="section">
                <h2>📊 Top 30 Most Called Functions/Methods</h2>
                <div class="function-list">
                    [FUNCTIONS_LIST]
                </div>
            </div>

            <!-- File Structure -->
            <div class="section">
                <h2>📁 File Structure Overview</h2>
                <div class="file-tree">
                    [FILE_TREE]
                </div>
            </div>

            <!-- Dependency Matrix -->
            <div class="section">
                <h2>🔗 Class Definitions</h2>
                <div class="function-list">
                    [CLASSES_LIST]
                </div>
            </div>

            <!-- Dependencies Summary -->
            <div class="section">
                <h2>📦 Include/Require Dependencies</h2>
                <div class="function-list">
                    [INCLUDES_LIST]
                </div>
            </div>

            <!-- Analysis Summary -->
            <div class="section">
                <h2>📈 Analysis Summary</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; line-height: 1.8;">
                    <p><strong>Analysis Date:</strong> [ANALYSIS_DATE]</p>
                    <p><strong>Base Path:</strong> [BASE_PATH]</p>
                    <p><strong>Total PHP Files Analyzed:</strong> [TOTAL_FILES]</p>
                    <p><strong>Total Function Calls Detected:</strong> [TOTAL_CALLS]</p>
                    <p><strong>Unique Functions Called:</strong> [TOTAL_FUNCTIONS]</p>
                    <p><strong>Total Class Definitions:</strong> [TOTAL_CLASSES]</p>
                    <p><strong>Files with Includes/Requires:</strong> [CIRCULAR_COUNT]</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>PHP Dependency Mapper v2.0 | Generated on [ANALYSIS_DATE]</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}

// Main execution
$basePath = isset($argv[1]) ? $argv[1] : dirname(__FILE__) . '/work/mobile';
$outputDir = isset($argv[2]) ? $argv[2] : dirname(__FILE__) . '/dependency_report';

// Normalize paths
$basePath = str_replace('\\', '/', $basePath);
$outputDir = str_replace('\\', '/', $outputDir);

echo "\n===================================\n";
echo "PHP Dependency Mapper v2.0\n";
echo "===================================\n\n";

if (!is_dir($basePath)) {
    echo "[ERROR] Path does not exist: $basePath\n";
    exit(1);
}

$analyzer = new PHPDependencyAnalyzer($basePath);
$report = $analyzer->analyze();

// Create output directory if needed
if (!is_dir($outputDir)) {
    @mkdir($outputDir, 0755, true);
}

$reportFile = $outputDir . '/dependency_map.html';
if (file_put_contents($reportFile, $report) === false) {
    echo "[ERROR] Failed to write report to: $reportFile\n";
    exit(1);
}

echo "[SUCCESS] Report saved to: $reportFile\n";
echo "[INFO] Analysis complete!\n\n";
?>
HTML;
    }
}
