<?php
/**
 * PHP Dependency Mapper - Helper Class
 * Analyzes dependencies for the Helper class with 1 level of recursion
 */

class PHPDependencyMapper {
    private $codebase_path;
    private $target_class = 'Helper';
    private $dependencies = [];
    private $classes = [];
    private $functions = [];
    private $max_depth = 1;

    public function __construct($codebase_path) {
        $this->codebase_path = rtrim($codebase_path, '/\\');
        $this->scanCodebase();
    }

    private function scanCodebase() {
        $iterator = new RecursiveDirectoryIterator($this->codebase_path);
        $filter = new RecursiveCallbackFilterIterator($iterator, function($fileinfo) {
            return $fileinfo->getBasename()[0] !== '.' && $fileinfo->getExtension() === 'php';
        });
        $files = new RecursiveIteratorIterator($filter);

        foreach ($files as $file) {
            $this->parseFile($file->getRealPath());
        }
    }

    private function parseFile($filepath) {
        $content = file_get_contents($filepath);

        // Find class definitions
        if (preg_match_all('/class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?/i', $content, $matches)) {
            for ($i = 0; $i < count($matches[1]); $i++) {
                $classname = $matches[1][$i];
                $parent = $matches[2][$i] ?? null;
                $interfaces = $matches[3][$i] ?? null;

                $this->classes[$classname] = [
                    'file' => $filepath,
                    'parent' => $parent,
                    'interfaces' => $interfaces,
                    'functions' => [],
                    'dependencies' => []
                ];
            }
        }

        // Find function definitions
        if (preg_match_all('/function\s+(\w+)\s*\(/i', $content, $matches)) {
            foreach ($matches[1] as $func) {
                $this->functions[$func] = $filepath;
            }
        }
    }

    public function analyzeDependencies() {
        if (!isset($this->classes[$this->target_class])) {
            return [
                'status' => 'not_found',
                'message' => "Helper class not found in codebase"
            ];
        }

        $file = $this->classes[$this->target_class]['file'];
        $content = file_get_contents($file);

        // Extract the class body
        if (preg_match('/class\s+' . preg_quote($this->target_class) . '[^{]*\{(.*?)\n\}/s', $content, $match)) {
            $classbody = $match[1];

            // Find function calls
            preg_match_all('/(?:->|\:\:|)(\w+)\s*\(/', $classbody, $calls);
            foreach ($calls[1] as $call) {
                $this->dependencies[$call] = [
                    'type' => 'method_call',
                    'found' => isset($this->functions[$call])
                ];
            }

            // Find class instantiations
            preg_match_all('/new\s+(\w+)\s*\(/', $classbody, $insts);
            foreach ($insts[1] as $inst) {
                if ($inst !== $this->target_class) {
                    $this->dependencies[$inst] = [
                        'type' => 'instantiation',
                        'found' => isset($this->classes[$inst])
                    ];
                }
            }

            // Find includes
            preg_match_all('/(?:require|include)(?:_once)?\s*[\'"]([^\'"]+)[\'"]/', $classbody, $includes);
            foreach ($includes[1] as $inc) {
                $this->dependencies[$inc] = [
                    'type' => 'include',
                    'found' => file_exists(dirname($file) . '/' . $inc)
                ];
            }
        }

        return [
            'status' => 'success',
            'class' => $this->target_class,
            'file' => $file,
            'dependencies' => $this->dependencies,
            'parent_class' => $this->classes[$this->target_class]['parent'],
            'total_dependencies' => count($this->dependencies)
        ];
    }

    public function getClasses() {
        return $this->classes;
    }

    public function getDependencies() {
        return $this->dependencies;
    }
}

// Generate HTML Report
function generateHTMLReport($analysis) {
    $html = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Dependency Map - Helper Class</title>
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
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-bottom: 5px solid #ff6b6b;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }

        .content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 20px;
            padding: 30px;
        }

        .section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
        }

        .section h2 {
            color: #667eea;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
            font-size: 1.4em;
        }

        .diagram {
            background: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            position: relative;
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            grid-column: 1 / -1;
            border: 2px solid #e0e0e0;
        }

        .central-class {
            width: 150px;
            height: 150px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.4em;
            font-weight: bold;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            text-align: center;
            padding: 15px;
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
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dependency-list li.found {
            border-left-color: #51cf66;
        }

        .dependency-list li.not-found {
            border-left-color: #ff6b6b;
            opacity: 0.7;
        }

        .dep-name {
            font-weight: 500;
            color: #333;
        }

        .dep-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
            margin-left: 10px;
        }

        .type-method {
            background: #e3f2fd;
            color: #1976d2;
        }

        .type-instantiation {
            background: #f3e5f5;
            color: #7b1fa2;
        }

        .type-include {
            background: #e8f5e9;
            color: #388e3c;
        }

        .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 500;
        }

        .status-found {
            background: #d4edda;
            color: #155724;
        }

        .status-not-found {
            background: #f8d7da;
            color: #721c24;
        }

        .parent-info {
            padding: 15px;
            background: white;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #ffc107;
        }

        .info-label {
            font-weight: 500;
            color: #666;
            margin-bottom: 5px;
        }

        .info-value {
            color: #333;
            word-break: break-all;
        }

        .footer {
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }

        .file-info {
            padding: 15px;
            background: white;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #2196F3;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }

        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 1.8em;
            }

            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PHP Dependency Map</h1>
            <p>Helper Class Analysis with 1-Level Recursion</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{total_deps}</div>
                <div class="stat-label">Total Dependencies</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{method_calls}</div>
                <div class="stat-label">Method Calls</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{instantiations}</div>
                <div class="stat-label">Class Instantiations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{includes}</div>
                <div class="stat-label">File Includes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{found_count}</div>
                <div class="stat-label">Dependencies Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{not_found_count}</div>
                <div class="stat-label">Dependencies Not Found</div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2>Class Information</h2>

                <div class="file-info">
                    <div class="info-label">File Location:</div>
                    <div class="info-value">{file_path}</div>
                </div>

                {parent_class_html}
            </div>

            <div class="diagram">
                <div class="central-class">Helper</div>
            </div>

            <div class="section" style="grid-column: 1 / -1;">
                <h2>Direct Dependencies (1-Level Recursion)</h2>
                {dependencies_html}
            </div>
        </div>

        <div class="footer">
            <p>Generated: {timestamp} | Recursion Depth: 1 | Analysis Type: Filtered Class View</p>
        </div>
    </div>
</body>
</html>
HTML;

    // Count dependencies by type
    $method_calls = 0;
    $instantiations = 0;
    $includes = 0;
    $found_count = 0;
    $not_found_count = 0;

    foreach ($analysis['dependencies'] as $dep => $info) {
        if ($info['type'] === 'method_call') $method_calls++;
        elseif ($info['type'] === 'instantiation') $instantiations++;
        elseif ($info['type'] === 'include') $includes++;

        if ($info['found']) $found_count++;
        else $not_found_count++;
    }

    // Build dependencies HTML
    $dependencies_html = '<ul class="dependency-list">';
    foreach ($analysis['dependencies'] as $dep => $info) {
        $foundClass = $info['found'] ? 'found' : 'not-found';
        $statusBadge = $info['found'] ?
            '<span class="status-badge status-found">Found</span>' :
            '<span class="status-badge status-not-found">Not Found</span>';
        $typeClass = 'type-' . str_replace('_', '-', $info['type']);

        $dependencies_html .= <<<HTML
        <li class="{$foundClass}">
            <div>
                <span class="dep-name">{$dep}</span>
                <span class="dep-type {$typeClass}">{$info['type']}</span>
            </div>
            {$statusBadge}
        </li>
HTML;
    }
    $dependencies_html .= '</ul>';

    // Build parent class HTML
    $parent_class_html = '';
    if ($analysis['parent_class']) {
        $parent_class_html = <<<HTML
        <div class="parent-info">
            <div class="info-label">Parent Class (Inheritance):</div>
            <div class="info-value">{$analysis['parent_class']}</div>
        </div>
HTML;
    } else {
        $parent_class_html = <<<HTML
        <div class="parent-info">
            <div class="info-label">Parent Class (Inheritance):</div>
            <div class="info-value">None (Base Class)</div>
        </div>
HTML;
    }

    // Replace placeholders
    $html = str_replace('{total_deps}', $analysis['total_dependencies'], $html);
    $html = str_replace('{method_calls}', $method_calls, $html);
    $html = str_replace('{instantiations}', $instantiations, $html);
    $html = str_replace('{includes}', $includes, $html);
    $html = str_replace('{found_count}', $found_count, $html);
    $html = str_replace('{not_found_count}', $not_found_count, $html);
    $html = str_replace('{file_path}', htmlspecialchars($analysis['file']), $html);
    $html = str_replace('{parent_class_html}', $parent_class_html, $html);
    $html = str_replace('{dependencies_html}', $dependencies_html, $html);
    $html = str_replace('{timestamp}', date('Y-m-d H:i:s'), $html);

    return $html;
}

// Main execution
if (php_sapi_name() === 'cli') {
    $codebase = __DIR__ . '/work/mobile/ppomppu';
    $mapper = new PHPDependencyMapper($codebase);
    $analysis = $mapper->analyzeDependencies();

    if ($analysis['status'] === 'success') {
        $html = generateHTMLReport($analysis);
        $output_dir = 'php-dependency-mapper-workspace/iteration-1/eval-filtered-class/with_skill/outputs';
        @mkdir($output_dir, 0755, true);
        file_put_contents($output_dir . '/helper-dependency-map.html', $html);
        echo "Report generated: $output_dir/helper-dependency-map.html\n";
    } else {
        echo "Error: " . $analysis['message'] . "\n";
    }
}
?>
