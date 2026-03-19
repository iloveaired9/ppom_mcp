<?php
/**
 * PHP Dependency Mapper - Helper Module Analysis
 * Analyzes the helper.php file and its dependencies with 1 level of recursion
 */

class HelperDependencyAnalyzer {
    private $target_file;
    private $dependencies = [];
    private $external_deps = [];
    private $internal_calls = [];

    public function __construct($filepath) {
        $this->target_file = $filepath;
        $this->analyze();
    }

    private function analyze() {
        if (!file_exists($this->target_file)) {
            throw new Exception("File not found: {$this->target_file}");
        }

        $content = file_get_contents($this->target_file);

        // Extract includes/requires
        preg_match_all('/(?:require|include)(?:_once)?\s*\(?[\'"]([^\'"]+)[\'"]\)?/i', $content, $includes);
        foreach ($includes[1] as $inc) {
            $this->dependencies[$inc] = [
                'type' => 'include',
                'line' => $this->findLineNumber($content, $inc)
            ];
        }

        // Extract function calls (excluding defines and built-in)
        preg_match_all('/(\w+)\s*\(/', $content, $calls);
        $builtins = [
            'echo', 'print', 'var_dump', 'die', 'exit', 'isset', 'empty', 'unset',
            'date', 'time', 'array_push', 'preg_replace', 'str_replace', 'in_array',
            'count', 'is_array', 'header', 'define', 'json_encode', 'json_decode',
            'implode', 'explode', 'trim', 'strip_tags', 'htmlspecialchars', 'simplexml_load_string',
            'curl_init', 'curl_setopt_array', 'curl_exec', 'curl_close', 'urlencode',
            'fsockopen', 'fputs', 'fclose', 'explode', 'strtoutime', 'strtotime',
            'strpos', 'substr', 'strlen', 'file_exists', 'is_file', 'is_dir',
            'array_keys', 'array_values', 'foreach', 'if', 'while', 'for',
            'function_exists', 'class_exists', 'interface_exists'
        ];

        $unique_calls = array_unique($calls[1]);
        foreach ($unique_calls as $call) {
            if (!in_array(strtolower($call), $builtins) && !preg_match('/^[A-Z]/', $call)) {
                $this->internal_calls[$call] = [
                    'type' => 'function_call',
                    'defined_in_file' => $this->isDefinedInFile($content, $call),
                    'line' => $this->findLineNumber($content, $call . '(')
                ];
            }
        }

        // Extract function definitions in this file
        preg_match_all('/function\s+(\w+)\s*\(/', $content, $funcs);
        $this->external_deps['defined_functions'] = array_unique($funcs[1]);
    }

    private function isDefinedInFile($content, $functionName) {
        return (bool)preg_match('/function\s+' . preg_quote($functionName) . '\s*\(/i', $content);
    }

    private function findLineNumber($content, $search) {
        $lines = explode("\n", $content);
        foreach ($lines as $num => $line) {
            if (stripos($line, $search) !== false) {
                return $num + 1;
            }
        }
        return 'unknown';
    }

    public function getDependencies() {
        return $this->dependencies;
    }

    public function getInternalCalls() {
        return $this->internal_calls;
    }

    public function getDefinedFunctions() {
        return $this->external_deps['defined_functions'] ?? [];
    }

    public function getAnalysisSummary() {
        return [
            'file' => $this->target_file,
            'file_size' => filesize($this->target_file),
            'line_count' => count(file($this->target_file)),
            'includes' => count($this->dependencies),
            'internal_calls' => count($this->internal_calls),
            'defined_functions' => count($this->getDefinedFunctions()),
        ];
    }
}

function generateDependencyHTML($analyzer) {
    $summary = $analyzer->getAnalysisSummary();
    $dependencies = $analyzer->getDependencies();
    $internal_calls = $analyzer->getInternalCalls();
    $defined_funcs = $analyzer->getDefinedFunctions();

    // Calculate statistics
    $total_deps = count($dependencies) + count($internal_calls);
    $internal_defined = array_sum(array_map(function($d) { return $d['defined_in_file'] ? 1 : 0; }, $internal_calls));
    $internal_external = count($internal_calls) - $internal_defined;

    $html = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Dependency Map - Helper Module</title>
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
            max-width: 1600px;
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
        }

        .header h1 {
            font-size: 2.8em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
            margin-bottom: 5px;
        }

        .file-path {
            opacity: 0.8;
            font-family: 'Courier New', monospace;
            font-size: 0.95em;
            word-break: break-all;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            padding: 25px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .stat-value {
            font-size: 2.2em;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            color: #666;
            font-size: 0.85em;
            margin-top: 8px;
        }

        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 30px;
        }

        .section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
        }

        .section h2 {
            color: #667eea;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 2px solid #667eea;
            font-size: 1.3em;
        }

        .dependency-item {
            padding: 12px;
            margin: 8px 0;
            background: white;
            border-left: 4px solid #667eea;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dep-name {
            font-weight: 500;
            color: #333;
            flex: 1;
            font-family: 'Courier New', monospace;
        }

        .dep-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 600;
            margin-left: 10px;
            background: #e3f2fd;
            color: #1976d2;
        }

        .badge-include {
            background: #e8f5e9;
            color: #388e3c;
        }

        .badge-internal {
            background: #f3e5f5;
            color: #7b1fa2;
        }

        .badge-external {
            background: #fff3e0;
            color: #e65100;
        }

        .line-number {
            color: #999;
            font-size: 0.8em;
            margin-left: 10px;
        }

        .dependency-list {
            list-style: none;
        }

        .dependency-list li {
            padding: 12px;
            margin: 8px 0;
            background: white;
            border-left: 4px solid #667eea;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .function-name {
            font-weight: 500;
            color: #333;
            font-family: 'Courier New', monospace;
        }

        .diagram-section {
            grid-column: 1 / -1;
            background: white;
            padding: 40px;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
            text-align: center;
            min-height: 350px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .central-module {
            width: 200px;
            height: 200px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.8em;
            font-weight: bold;
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
            text-align: center;
            padding: 20px;
            line-height: 1.2;
        }

        .diagram-label {
            margin-top: 30px;
            color: #666;
            font-size: 1.1em;
        }

        .file-info {
            padding: 15px;
            background: white;
            border-radius: 4px;
            margin: 15px 0;
            border-left: 4px solid #2196F3;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            font-size: 0.9em;
        }

        .info-label {
            font-weight: 500;
            color: #666;
            margin-bottom: 5px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 15px 0;
        }

        .summary-item {
            padding: 12px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #667eea;
        }

        .summary-label {
            font-size: 0.85em;
            color: #666;
        }

        .summary-value {
            font-weight: bold;
            color: #333;
            font-size: 1.1em;
            margin-top: 4px;
        }

        .footer {
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }

        .empty-state {
            padding: 30px;
            text-align: center;
            color: #999;
        }

        @media (max-width: 1024px) {
            .content {
                grid-template-columns: 1fr;
            }

            .diagram-section {
                grid-column: 1;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PHP Dependency Map</h1>
            <p>Helper Module Analysis - Direct Dependencies (1-Level Recursion)</p>
            <div class="file-path">File: {file_path}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{total_functions}</div>
                <div class="stat-label">Functions Defined</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{total_includes}</div>
                <div class="stat-label">File Includes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{internal_calls_count}</div>
                <div class="stat-label">Internal Function Calls</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{internal_defined_count}</div>
                <div class="stat-label">Calls to Local Functions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{internal_external_count}</div>
                <div class="stat-label">External Calls</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{total_deps}</div>
                <div class="stat-label">Total Dependencies</div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>File Information</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">File Size</div>
                        <div class="summary-value">{file_size} bytes</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Lines of Code</div>
                        <div class="summary-value">{line_count}</div>
                    </div>
                </div>
                <div class="file-info">
                    <div class="info-label">Path:</div>
                    <div>{file_path}</div>
                </div>
            </div>

            <div class="section">
                <h2>Defined Functions ({total_functions})</h2>
                {defined_functions_html}
            </div>

            <div class="diagram-section">
                <div class="central-module">helper.php<br>Module</div>
                <div class="diagram-label">Direct Dependencies Mapped Below</div>
            </div>

            <div class="section" style="grid-column: 1 / -1;">
                <h2>File Includes/Requires ({total_includes})</h2>
                {includes_html}
            </div>

            <div class="section" style="grid-column: 1 / -1;">
                <h2>Internal Function Calls ({internal_calls_count})</h2>
                {internal_calls_html}
            </div>
        </div>

        <div class="footer">
            <p>Generated: {timestamp} | Analysis Type: Helper Module Dependency Map | Recursion Depth: 1</p>
        </div>
    </div>
</body>
</html>
HTML;

    // Build defined functions HTML
    $defined_functions_html = '<ul class="dependency-list">';
    if (empty($defined_funcs)) {
        $defined_functions_html .= '<li class="empty-state">No functions defined (procedural helper file)</li>';
    } else {
        foreach ($defined_funcs as $func) {
            $defined_functions_html .= '<li><span class="function-name">' . htmlspecialchars($func) . '()</span></li>';
        }
    }
    $defined_functions_html .= '</ul>';

    // Build includes HTML
    $includes_html = '<ul class="dependency-list">';
    if (empty($dependencies)) {
        $includes_html .= '<li class="empty-state">No includes/requires found</li>';
    } else {
        foreach ($dependencies as $file => $info) {
            $includes_html .= '<li><span class="dep-name">' . htmlspecialchars($file) . '</span> <span class="line-number">Line ' . $info['line'] . '</span></li>';
        }
    }
    $includes_html .= '</ul>';

    // Build internal calls HTML
    $internal_calls_html = '<ul class="dependency-list">';
    if (empty($internal_calls)) {
        $internal_calls_html .= '<li class="empty-state">No external function calls found</li>';
    } else {
        foreach ($internal_calls as $call => $info) {
            $status = $info['defined_in_file'] ?
                '<span class="dep-badge badge-internal">Internal</span>' :
                '<span class="dep-badge badge-external">External</span>';
            $internal_calls_html .= '<li>' .
                '<span class="dep-name">' . htmlspecialchars($call) . '()</span>' .
                $status .
                '<span class="line-number">Line ' . $info['line'] . '</span>' .
                '</li>';
        }
    }
    $internal_calls_html .= '</ul>';

    // Replace placeholders
    $replacements = [
        '{file_path}' => htmlspecialchars($summary['file']),
        '{file_size}' => number_format($summary['file_size']),
        '{line_count}' => $summary['line_count'],
        '{total_functions}' => count($defined_funcs),
        '{total_includes}' => count($dependencies),
        '{internal_calls_count}' => count($internal_calls),
        '{internal_defined_count}' => $internal_defined,
        '{internal_external_count}' => $internal_external,
        '{total_deps}' => $total_deps,
        '{defined_functions_html}' => $defined_functions_html,
        '{includes_html}' => $includes_html,
        '{internal_calls_html}' => $internal_calls_html,
        '{timestamp}' => date('Y-m-d H:i:s')
    ];

    foreach ($replacements as $key => $value) {
        $html = str_replace($key, $value, $html);
    }

    return $html;
}

// Main execution
try {
    $helperFile = __DIR__ . '/work/mobile/ppomppu/syndi/helper.php';

    if (!file_exists($helperFile)) {
        die("Helper file not found: $helperFile\n");
    }

    $analyzer = new HelperDependencyAnalyzer($helperFile);
    $html = generateDependencyHTML($analyzer);

    // Create output directory
    $outputDir = __DIR__ . '/php-dependency-mapper-workspace/iteration-1/eval-filtered-class/with_skill/outputs';
    @mkdir($outputDir, 0755, true);

    // Save report
    $reportFile = $outputDir . '/helper-dependency-map.html';
    file_put_contents($reportFile, $html);

    echo "Dependency map generated successfully!\n";
    echo "Output file: $reportFile\n";
    echo "File size: " . filesize($reportFile) . " bytes\n";

} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
?>
