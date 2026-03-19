#!/usr/bin/env python3
"""
PHP Cache Dependency Graph Generator
Generates DOT format dependency graph for cache-related functions
"""

import re
import os
from pathlib import Path
from collections import defaultdict

class PHPDependencyAnalyzer:
    def __init__(self, source_dir):
        self.source_dir = source_dir
        self.functions = {}
        self.calls = defaultdict(set)
        self.cache_functions = set()

    def find_php_files(self, pattern='cache'):
        """Find PHP files containing cache-related code"""
        php_files = []
        for root, dirs, files in os.walk(self.source_dir):
            for file in files:
                if file.endswith('.php'):
                    filepath = os.path.join(root, file)
                    if pattern.lower() in file.lower():
                        php_files.append(filepath)
        return php_files

    def extract_functions(self, content):
        """Extract function definitions from PHP content"""
        functions = {}

        # Pattern for function declarations
        func_pattern = r'^\s*(?:public\s+|private\s+|protected\s+)?function\s+(\w*cache\w*)\s*\('

        for i, line in enumerate(content.split('\n'), 1):
            match = re.match(func_pattern, line, re.IGNORECASE)
            if match:
                func_name = match.group(1)
                functions[func_name] = i
                self.cache_functions.add(func_name)

        return functions

    def extract_calls(self, content, source_function):
        """Extract function calls from PHP content"""
        calls = set()

        # Patterns for function calls
        patterns = [
            r'\$this->(\w*cache\w*)\s*\(',  # Object method calls
            r'(\w*cache\w*)\s*\(',           # Direct function calls
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                called_func = match.group(1)
                if called_func.lower() != source_function.lower():
                    calls.add(called_func)

        return calls

    def analyze_files(self):
        """Analyze all cache-related PHP files"""
        php_files = self.find_php_files('cache')

        for filepath in php_files:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # Extract class name for context
                class_match = re.search(r'class\s+(\w*[Cc]ache\w*)', content)
                class_name = class_match.group(1) if class_match else None

                # Extract functions
                functions = self.extract_functions(content)

                for func_name, line_num in functions.items():
                    full_name = f"{class_name}::{func_name}" if class_name else func_name
                    self.functions[full_name] = {
                        'file': filepath,
                        'line': line_num,
                        'class': class_name
                    }

                    # Extract calls from the function
                    calls = self.extract_calls(content, func_name)
                    for called_func in calls:
                        self.calls[full_name].add(called_func)

            except Exception as e:
                print(f"Error processing {filepath}: {e}")

    def generate_dot(self):
        """Generate DOT format graph"""
        lines = [
            'digraph "PHP Cache Dependencies" {',
            '  rankdir=LR;',
            '  node [shape=box, style=rounded];',
            '  edge [color=darkblue];',
            '',
            '  // Cache Functions',
        ]

        # Add all cache functions as nodes
        for func_name in sorted(self.cache_functions):
            safe_name = self._sanitize_name(func_name)
            lines.append(f'  "{safe_name}" [label="{func_name}", color=lightblue, style="rounded,filled"];')

        lines.append('')
        lines.append('  // Function Calls')

        # Add all function calls as edges
        added_edges = set()
        for caller, callees in sorted(self.calls.items()):
            caller_safe = self._sanitize_name(caller)
            for callee in sorted(callees):
                callee_safe = self._sanitize_name(callee)
                edge = f'  "{caller_safe}" -> "{callee_safe}";'
                if edge not in added_edges:
                    lines.append(edge)
                    added_edges.add(edge)

        lines.append('')
        lines.append('  // Legend')
        lines.append('  subgraph cluster_legend {')
        lines.append('    label = "Legend";')
        lines.append('    style = "rounded,dashed";')
        lines.append('    "function_node" [label="Function", color=lightblue, style="rounded,filled"];')
        lines.append('  }')
        lines.append('}')

        return '\n'.join(lines)

    def _sanitize_name(self, name):
        """Sanitize names for DOT format"""
        # Replace special characters
        return re.sub(r'[^a-zA-Z0-9_:]', '_', name)


def main():
    source_dir = r'C:\rnd\claude\mcp\ppom_mcp\work'
    output_dir = r'C:\Users\aired\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\03887657-ce9f-4a37-a469-3b10e0effb35\2e999d38-475d-40e8-8a21-5bfea2929df8\php-dependency-mapper-workspace\iteration-1\eval-dot-export\with_skill\outputs'

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Analyze dependencies
    analyzer = PHPDependencyAnalyzer(source_dir)
    analyzer.analyze_files()

    # Generate DOT output
    dot_content = analyzer.generate_dot()

    # Save to file
    output_file = os.path.join(output_dir, 'cache_dependencies.dot')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(dot_content)

    print(f"DOT file generated: {output_file}")
    print(f"Total cache functions found: {len(analyzer.cache_functions)}")
    print(f"Total function calls: {sum(len(callees) for callees in analyzer.calls.values())}")

    # Display summary
    print("\n=== Cache Functions ===")
    for func in sorted(analyzer.cache_functions):
        info = analyzer.functions.get(func, {})
        print(f"  {func}")
        if 'file' in info:
            print(f"    File: {info['file']}")
            print(f"    Line: {info['line']}")


if __name__ == '__main__':
    main()
