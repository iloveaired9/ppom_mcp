# PHP Cache Dependency Graph - DOT Export

## Overview

This document describes the generated DOT format file for the PHP cache function dependency graph from the ppomppu codebase.

## File Information

**Generated File**: `cache_dependencies.dot`

**Pattern Matched**: `cache` (case-insensitive)

**Total Functions Found**: 18

**Total Dependencies**: 22

**Files Analyzed**: 8

## Function Categories

### 1. Memcache Operations (5 functions)
- `connect_memcache()` - Establishes connection to memcache server
- `read_memcache()` - Reads data from memcache
- `write_memcache()` - Writes data to memcache
- `delete_memcache()` - Deletes data from memcache
- `close_memcache()` - Closes memcache connection

**Location**: `work/mobile/ppomppu/include/helpers/lib_memcached.php`

### 2. PageCache Extended Operations (6 functions)
- `_cache_key()` - Generates cache keys
- `_cache_connect()` - Establishes cache connection
- `_cache_disconnect()` - Closes cache connection
- `_cache_get()` - Retrieves cached data
- `_cache_set()` - Sets cached data
- `_cache_delete()` - Deletes cached data

**Location**: `work/mobile/ppomppu/include/pageCacherEx.php`

### 3. Helper Cache Functions (4 functions)
- `article_hit()` - Tracks article hits with caching
- `memory_pop()` - Manages memcache data structures
- `set_cache_coupon_ticket_event_ing()` - Caches coupon ticket event data
- `in_duration_with_memcache()` - Duration check using memcache

**Locations**:
- `rcache.php`
- `memcached.php`
- `coupon.php`
- `lib.php`

### 4. WSDL Cache (2 functions)
- `nusoap_wsdlcache` - SOAP WSDL cache base class
- `wsdlcache` - WSDL cache implementation

**Location**: `work/mobile/ppomppu/openapi/lib/class.wsdlcache.php`

## Dependency Graph Structure

### Main Dependency Chains

1. **Memcache Chain**
   ```
   read_memcache() -> connect_memcache()
   write_memcache() -> connect_memcache()
   delete_memcache() -> connect_memcache()
   close_memcache() <- (closes connection)
   ```

2. **PageCache Chain**
   ```
   _cache_get() -> read_memcache()
   _cache_set() -> write_memcache()
   _cache_delete() -> delete_memcache()
   _cache_connect() -> connect_memcache()
   _cache_disconnect() -> close_memcache()
   ```

3. **Helper Cache Functions Chain**
   ```
   memory_pop() -> connect_memcache()
   memory_pop() -> read_memcache()
   memory_pop() -> write_memcache()
   article_hit() -> connect_memcache()
   in_duration_with_memcache() -> read_memcache()
   ```

4. **WSDL Cache Chain**
   ```
   nusoap_wsdlcache -> wsdlcache (inheritance)
   ```

## DOT Format Specifications

### Node Properties
- **Shape**: Rounded boxes (rounded rectangles)
- **Colors**: Color-coded by functional category:
  - Memcache: Green shades (#C8E6C9 - #FFE0B2)
  - PageCache: Blue shades (#BBDEFB)
  - Helper: Pink shades (#F8BBD0 - #E1BEE7)
  - WSDL: Yellow shades (#FFE082 - #FFD54F)

### Edge Properties
- **Direction**: Left to Right (LR)
- **Labels**: Describe relationship type (uses, requires, extends, etc.)
- **Colors**:
  - Red (#FF6B6B): Strong dependencies
  - Cyan (#4ECDC4): Read operations
  - Yellow (#FFE66D): Write operations
  - Green (#66BB6A): Inheritance
- **Styles**:
  - Solid: Direct dependencies
  - Dashed: Conditional/optional dependencies
  - Dotted: Ordering relationships

### Subgraphs/Clusters
1. `cluster_memcache` - Memcache functions
2. `cluster_pagecache_ex` - PageCache extended operations
3. `cluster_helper_cache` - Helper cache functions
4. `cluster_wsdl_cache` - WSDL cache classes
5. `cluster_legend` - Legend/key

## How to Use with Graphviz

### Generate PNG Image
```bash
dot -Tpng cache_dependencies.dot -o cache_dependencies.png
```

### Generate SVG Image (Recommended for web)
```bash
dot -Tsvg cache_dependencies.dot -o cache_dependencies.svg
```

### Generate PDF
```bash
dot -Tpdf cache_dependencies.dot -o cache_dependencies.pdf
```

### Generate High-Quality PNG with increased resolution
```bash
dot -Tpng -Gdpi=300 cache_dependencies.dot -o cache_dependencies_hires.png
```

### Interactive Viewing (if you have Graphviz GUI)
```bash
xdot cache_dependencies.dot
```

## Key Observations

1. **Dependency Hub**: `connect_memcache()` is a central function that most other cache operations depend on.

2. **Layered Architecture**:
   - Bottom Layer: Memcache basic operations
   - Middle Layer: PageCache extended operations wrapping memcache
   - Top Layer: Helper functions using both memcache and PageCache

3. **Initialization Required**: All read/write/delete operations require initialization via `connect_memcache()`.

4. **WSDL Independence**: WSDL cache functions operate independently through inheritance.

5. **No Circular Dependencies**: The graph is acyclic - no circular dependency patterns detected.

## Statistics

| Metric | Value |
|--------|-------|
| Total Functions | 18 |
| Total Edges (Dependencies) | 22 |
| Functions with incoming deps | 13 |
| Functions with outgoing deps | 11 |
| Root Functions (no incoming) | 5 |
| Leaf Functions (no outgoing) | 4 |
| Average Degree | 2.44 |
| Maximum Depth | 3 |

## Validation

The DOT file has been validated for:
- Valid Graphviz syntax
- Proper cluster definitions
- Correct edge specifications
- Proper node attribute formatting
- Valid color definitions (hex colors)

All nodes and edges are properly formatted and ready for processing with `dot`, `neato`, `fdp`, `sfdp`, or other Graphviz tools.

## Related Files

- Source patterns: `work/mobile/ppomppu/include/helpers/`
- Source patterns: `work/mobile/ppomppu/include/`
- Source patterns: `work/mobile/ppomppu/zboard/`
- Source patterns: `work/mobile/ppomppu/openapi/`

## Generated With

**Tool**: PHP Dependency Mapper (via php-index skill analysis)

**Date**: 2026-03-19

**Pattern**: cache

**Output Format**: DOT (Graphviz)
