---
name: php-dependency-mapper
description: Generate visual dependency maps of PHP codebases showing function/class relationships. Use this whenever you need to understand PHP code architecture, find dependency paths, analyze code coupling, visualize call hierarchies, or identify circular dependencies. This is especially useful when refactoring, migrating legacy code, or documenting system dependencies.
compatibility: Requires php-index-generator plugin
---

# PHP Dependency Mapper

Analyze PHP codebases and generate interactive visual maps showing how functions and classes depend on each other. This helps understand code structure, find problem areas, and plan refactoring work.

## What This Does

The skill:
1. Scans your PHP codebase using the existing php-index-generator
2. Extracts all function and class relationships (calls, inheritance, implementations)
3. Generates visual dependency maps in multiple formats (HTML, SVG, DOT)
4. Optionally filters results by class/function name and controls recursion depth

## How to Use

### Basic usage - Generate full dependency map
```bash
/php-deps --source work/mobile
```

### With filters and options
```bash
# Show only Helper class and its dependencies (1 level deep)
/php-deps --source work/mobile --filter "Helper" --depth 1

# Show all dependencies, limit visualization to 2 levels
/php-deps --source work/mobile --depth 2

# Generate as SVG instead of HTML
/php-deps --source work/mobile --format svg

# Export as DOT format for Graphviz
/php-deps --source work/mobile --format dot
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--source` | path | `work/mobile` | PHP source directory to analyze |
| `--filter` | string | (none) | Filter to specific class/function name (regex supported) |
| `--depth` | number | 3 | Max recursion depth in dependency chain |
| `--format` | string | `html` | Output format: `html`, `svg`, `dot` |
| `--output` | path | auto | Custom output file path |
| `--show-static` | boolean | true | Include static method calls |
| `--show-inheritance` | boolean | true | Include class inheritance relationships |
| `--exclude-external` | boolean | false | Exclude dependencies on external libraries |

## Output Formats

### HTML (default)
Interactive visualization with:
- Clickable nodes to expand/collapse dependencies
- Color-coded by type (class, function, interface)
- Hover to highlight paths
- Statistics panel showing metrics

### SVG
Static image suitable for:
- Embedding in documentation
- Sharing with team
- Presentations

### DOT
Graph description language for:
- Graphviz processing (`dot -Tpng graph.dot > graph.png`)
- Further processing with graph tools
- Version control (text-based)

## Examples

### Example 1: Analyze a single class

User requests: "Show me all the dependencies for the Helper class"

Claude runs: `/php-deps --filter "Helper" --depth 2`

Output: An HTML file showing Helper class connected to all its direct dependencies and one level deeper, with statistics about how many other classes depend on Helper.

### Example 2: Find architectural issues

User requests: "I need to understand why the database migrations are so complex"

Claude runs: `/php-deps --source work/mobile --filter "Migration" --depth 3`

Output: Visual map showing Migration class relationships, making it clear which components need refactoring.

### Example 3: Prepare for legacy code migration

User requests: "Help me plan the PHP modernization work"

Claude runs: `/php-deps --source work/mobile --depth 2 --format dot`

Output: DOT file processed into a graph image, showing the overall system architecture - high-risk areas (high coupling) become obvious.

## How the Analysis Works

1. **Symbol Extraction**: Uses php-index-generator to get all classes, interfaces, functions
2. **Relationship Analysis**: Extracts:
   - Function calls (`foo()`)
   - Method calls (`$obj->method()`, `Class::method()`)
   - Class inheritance (`extends`)
   - Interface implementation (`implements`)
3. **Graph Construction**: Builds a directed graph where edges represent "depends on" relationships
4. **Filtering & Depth Control**: Prunes graph based on filters and recursion limits
5. **Visualization**: Renders to chosen format

## Tips

- **Finding circular dependencies**: Look for cycles in the graph (paths that loop back)
- **Identifying bottlenecks**: Nodes with many inbound edges (depended-on heavily)
- **Refactoring targets**: Dense clusters indicate tight coupling - good candidates for decoupling
- **Migration planning**: High-depth graphs suggest complex interdependencies to address early
- **Documentation**: Use SVG or DOT outputs in architecture docs to keep them current

## Limitations

- Analysis is based on static code analysis (does not execute code)
- Dynamic method calls (`$method()`, `call_user_func()`) may not be detected
- External library calls are included but often have incomplete metadata
- Very large codebases (10,000+ files) may take time to analyze
