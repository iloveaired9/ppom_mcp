<?php
/**
 * PHP Dependency Mapper - Analyzes PHP codebase for dependencies, function calls, and circular dependencies
 */

class PHPDependencyMapper {
    private $basePath;
    private $phpFiles = [];
    private $dependencies = [];
    private $functionCalls = [];
    private $classDefinitions = [];
    private $circularDependencies = [];
    private $functionStats = [];
    private $includes = [];

    public function __construct($basePath) {
        $this->basePath = rtrim($basePath, '/\\');
    }

    public function analyze() {
        echo "Starting analysis of: {$this->basePath}\n";
        $this->findPhpFiles();
        echo "Found " . count($this->phpFiles) . " PHP files\n";

        foreach ($this->phpFiles as $file) {
            echo "Analyzing: " . str_replace($this->basePath, '', $file) . "\n";
            $this->analyzeFile($file);
        }

        $this->detectCircularDependencies();
        $this->calculateStatistics();

        return $this->generateReport();
    }

    private function findPhpFiles() {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->basePath),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($iterator as $file) {
            if ($file->getExtension() === 'php') {
                $this->phpFiles[] = $file->getPathname();
            }
        }
        sort($this->phpFiles);
    }

    private function analyzeFile($filePath) {
        $content = file_get_contents($filePath);
        $relativePath = str_replace($this->basePath, '', $filePath);

        // Find includes/requires
        $this->findIncludes($filePath, $content, $relativePath);

        // Find class definitions
        $this->findClasses($filePath, $content, $relativePath);

        // Find function calls
        $this->findFunctionCalls($filePath, $content, $relativePath);

        // Find dependencies
        $this->findDependencies($filePath, $content, $relativePath);
    }

    private function findIncludes(&$filePath, &$content, &$relativePath) {
        $pattern = '/(?:require|include|require_once|include_once)\s*[\'"]?([^\'")\n;]+)[\'"]?/i';
        if (preg_match_all($pattern, $content, $matches)) {
            if (!isset($this->includes[$relativePath])) {
                $this->includes[$relativePath] = [];
            }
            foreach ($matches[1] as $include) {
                $include = trim($include);
                if (!empty($include)) {
                    $this->includes[$relativePath][] = $include;
                    if (!isset($this->dependencies[$relativePath])) {
                        $this->dependencies[$relativePath] = [];
                    }
                    $this->dependencies[$relativePath][] = $include;
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
                    'extends' => $matches[2][$i] ?? null,
                    'implements' => $matches[3][$i] ?? null
                ];
            }
        }
    }

    private function findFunctionCalls(&$filePath, &$content, &$relativePath) {
        $pattern = '/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/';
        if (preg_match_all($pattern, $content, $matches)) {
            if (!isset($this->functionCalls[$relativePath])) {
                $this->functionCalls[$relativePath] = [];
            }
            foreach ($matches[1] as $funcName) {
                if (!in_array($funcName, ['if', 'while', 'for', 'foreach', 'switch', 'catch', 'function', 'class'])) {
                    $this->functionCalls[$relativePath][] = $funcName;
                    if (!isset($this->functionStats[$funcName])) {
                        $this->functionStats[$funcName] = 0;
                    }
                    $this->functionStats[$funcName]++;
                }
            }
        }
    }

    private function findDependencies(&$filePath, &$content, &$relativePath) {
        // Find new instantiations
        $pattern = '/new\s+([a-zA-Z_][a-zA-Z0-9_\\\\]*)/';
        if (preg_match_all($pattern, $content, $matches)) {
            if (!isset($this->dependencies[$relativePath])) {
                $this->dependencies[$relativePath] = [];
            }
            foreach ($matches[1] as $className) {
                $this->dependencies[$relativePath][] = 'class:' . $className;
            }
        }

        // Find static calls
        $pattern = '/([a-zA-Z_][a-zA-Z0-9_\\\\]*)::(\w+)/';
        if (preg_match_all($pattern, $content, $matches)) {
            if (!isset($this->dependencies[$relativePath])) {
                $this->dependencies[$relativePath] = [];
            }
            foreach ($matches[0] as $call) {
                $this->dependencies[$relativePath][] = 'static:' . $call;
            }
        }
    }

    private function detectCircularDependencies() {
        foreach ($this->dependencies as $file => $deps) {
            foreach ($deps as $dep) {
                // Simplified circular dependency detection
                if (isset($this->dependencies[$dep])) {
                    foreach ($this->dependencies[$dep] as $subDep) {
                        if ($subDep === $file || str_contains($subDep, basename($file, '.php'))) {
                            if (!in_array([$file, $dep], $this->circularDependencies)) {
                                $this->circularDependencies[] = [$file, $dep];
                            }
                        }
                    }
                }
            }
        }
    }

    private function calculateStatistics() {
        // Sort function stats by call count
        arsort($this->functionStats);
    }

    private function generateReport() {
        $topFunctions = array_slice($this->functionStats, 0, 20, true);

        $html = <<<HTML
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

        .chart-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-top: 20px;
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

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }

        .tab-button {
            padding: 12px 20px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            color: #666;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .tab-button.active {
            color: #667eea;
            border-bottom-color: #667eea;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
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
                    <div class="value">
HTML;

        $html .= count($this->phpFiles);

        $html .= <<<HTML
</div>
                </div>

                <div class="stat-card">
                    <h3>Classes Defined</h3>
                    <div class="value">
HTML;

        $totalClasses = 0;
        foreach ($this->classDefinitions as $classes) {
            $totalClasses += count($classes);
        }
        $html .= $totalClasses;

        $html .= <<<HTML
</div>
                </div>

                <div class="stat-card">
                    <h3>Function Calls Tracked</h3>
                    <div class="value">
HTML;

        $html .= count($this->functionStats);

        $html .= <<<HTML
</div>
                </div>

                <div class="stat-card">
                    <h3>Potential Circular Dependencies</h3>
                    <div class="value">
HTML;

        $html .= count($this->circularDependencies);

        $html .= <<<HTML
</div>
                </div>
            </div>

            <!-- Warnings Section -->
            <div class="section">
                <h2>⚠️ Architecture Warnings</h2>
HTML;

        if (count($this->circularDependencies) > 0) {
            $html .= <<<HTML
                <div class="warning-box">
                    <h3>Circular Dependencies Detected</h3>
                    <p>The following files have potential circular dependencies:</p>
                    <ul>
HTML;
            foreach (array_slice($this->circularDependencies, 0, 10) as $circular) {
                $html .= '<li><code>' . htmlspecialchars($circular[0]) . '</code> ↔ <code>' . htmlspecialchars($circular[1]) . '</code></li>';
            }
            if (count($this->circularDependencies) > 10) {
                $html .= '<li>... and ' . (count($this->circularDependencies) - 10) . ' more circular dependencies</li>';
            }
            $html .= <<<HTML
                    </ul>
                </div>
HTML;
        } else {
            $html .= <<<HTML
                <div class="success-box">
                    <h3>✓ No Circular Dependencies Detected</h3>
                    <p>Your codebase appears to have a clean dependency structure.</p>
                </div>
HTML;
        }

        // Check for architectural bottlenecks
        $maxCalls = max(array_values($this->functionStats) ?: [0]);
        $bottlenecks = array_filter($this->functionStats, function($count) use ($maxCalls) {
            return $count > ($maxCalls * 0.5); // Functions called more than 50% of max
        });

        if (count($bottlenecks) > 0) {
            $html .= <<<HTML
                <div class="warning-box">
                    <h3>Potential Bottleneck Functions</h3>
                    <p>These functions are called frequently and might be architectural bottlenecks:</p>
                    <ul>
HTML;
            foreach (array_slice($bottlenecks, 0, 10, true) as $func => $count) {
                $html .= '<li><code>' . htmlspecialchars($func) . '</code> - called ' . $count . ' times</li>';
            }
            $html .= <<<HTML
                    </ul>
                </div>
HTML;
        }

        $html .= <<<HTML
            </div>

            <!-- Most Called Functions -->
            <div class="section">
                <h2>📊 Top 20 Most Called Functions</h2>
                <div class="function-list">
HTML;

        $maxCount = max($topFunctions) ?: 1;
        foreach ($topFunctions as $funcName => $count) {
            $percentage = ($count / $maxCount) * 100;
            $html .= <<<HTML
                    <div class="function-item">
                        <div>
                            <div class="name">$funcName</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: {$percentage}%"></div>
                            </div>
                        </div>
                        <div class="count">$count calls</div>
                    </div>
HTML;
        }

        $html .= <<<HTML
                </div>
            </div>

            <!-- File Structure -->
            <div class="section">
                <h2>📁 File Structure Overview</h2>
                <div class="file-tree">
HTML;

        $directoryGroups = [];
        foreach ($this->phpFiles as $file) {
            $rel = str_replace($this->basePath, '', $file);
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
            $html .= '<div class="file-item' . $isHighlighted . '"><strong>' . htmlspecialchars($dir) . '</strong> (' . $fileCount . ' files)</div>';
        }

        $html .= <<<HTML
                </div>
            </div>

            <!-- Dependency Matrix -->
            <div class="section">
                <h2>🔗 Class Dependencies</h2>
HTML;

        if (count($this->classDefinitions) > 0) {
            $html .= '<div class="function-list">';
            $classCount = 0;
            foreach ($this->classDefinitions as $file => $classes) {
                foreach ($classes as $class) {
                    if ($classCount >= 30) {
                        $remaining = count($this->classDefinitions) - $classCount;
                        $html .= '<div class="function-item"><div>... and ' . $remaining . ' more classes</div></div>';
                        break 2;
                    }
                    $inherits = $class['extends'] ? ' extends ' . htmlspecialchars($class['extends']) : '';
                    $implements = $class['implements'] ? ' implements ' . htmlspecialchars($class['implements']) : '';
                    $html .= '<div class="function-item"><div class="name">' . htmlspecialchars($class['name']) . '</div><div style="color: #999; font-size: 0.9em;">' . htmlspecialchars($file) . $inherits . $implements . '</div></div>';
                    $classCount++;
                }
            }
            $html .= '</div>';
        } else {
            $html .= '<p style="color: #999;">No class definitions found in the analyzed codebase.</p>';
        }

        $html .= <<<HTML
            </div>

            <!-- Dependencies Summary -->
            <div class="section">
                <h2>📦 Include/Require Dependencies</h2>
HTML;

        if (count($this->includes) > 0) {
            $html .= '<div class="function-list">';
            $includeCount = 0;
            foreach ($this->includes as $file => $deps) {
                foreach ($deps as $dep) {
                    if ($includeCount >= 30) {
                        $remaining = count($this->includes) - $includeCount;
                        $html .= '<div class="function-item"><div>... and more dependencies</div></div>';
                        break 2;
                    }
                    $html .= '<div class="function-item"><div><strong>' . htmlspecialchars($file) . '</strong><br><span style="color: #667eea;">→ ' . htmlspecialchars($dep) . '</span></div></div>';
                    $includeCount++;
                }
            }
            $html .= '</div>';
        } else {
            $html .= '<p style="color: #999;">No includes/requires found in the analyzed codebase.</p>';
        }

        $html .= <<<HTML
            </div>

            <!-- Analysis Summary -->
            <div class="section">
                <h2>📈 Analysis Summary</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; line-height: 1.8;">
                    <p><strong>Analysis Date:</strong> HTML;

        $html .= date('Y-m-d H:i:s');

        $html .= <<<HTML
</p>
                    <p><strong>Base Path:</strong> HTML;

        $html .= htmlspecialchars($this->basePath);

        $html .= <<<HTML
</p>
                    <p><strong>Total PHP Files Analyzed:</strong> HTML;

        $html .= count($this->phpFiles);

        $html .= <<<HTML
</p>
                    <p><strong>Total Function Calls Detected:</strong> HTML;

        $html .= array_sum($this->functionStats);

        $html .= <<<HTML
</p>
                    <p><strong>Unique Functions Called:</strong> HTML;

        $html .= count($this->functionStats);

        $html .= <<<HTML
</p>
                    <p><strong>Total Class Definitions:</strong> HTML;

        $html .= $totalClasses;

        $html .= <<<HTML
</p>
                    <p><strong>Files with Includes/Requires:</strong> HTML;

        $html .= count($this->includes);

        $html .= <<<HTML
</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>PHP Dependency Mapper v1.0 | Generated on HTML;

        $html .= date('Y-m-d H:i:s');

        $html .= <<<HTML
</p>
        </div>
    </div>
</body>
</html>
HTML;

        return $html;
    }
}

// Main execution
if (php_sapi_name() !== 'cli') {
    die('This script must be run from the command line.');
}

$basePath = $argc > 1 ? $argv[1] : realpath(__DIR__ . '/work/mobile');

if (!is_dir($basePath)) {
    die("Error: Path does not exist: $basePath\n");
}

echo "PHP Dependency Mapper\n";
echo "====================\n\n";

$mapper = new PHPDependencyMapper($basePath);
$report = $mapper->analyze();

echo "\nGenerating HTML report...\n";

// Save the report
$outputDir = $argv[2] ?? __DIR__ . '/dependency_report';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

$reportFile = $outputDir . '/dependency_map.html';
file_put_contents($reportFile, $report);

echo "Report saved to: $reportFile\n";
echo "Analysis complete!\n";
?>
