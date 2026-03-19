================================================================================
CACHE DEPENDENCY ANALYSIS - DOT FORMAT EXPORT
Generated: 2026-03-19
================================================================================

PROJECT: ppomppu Mobile Application
PATTERN: cache (case-insensitive)
TOTAL CACHE FUNCTIONS FOUND: 18
TOTAL FILES ANALYZED: 8

================================================================================
OUTPUT FILES GENERATED
================================================================================

1. cache_dependencies.dot
   - Main DOT format dependency graph
   - Visualizable with Graphviz tools (dot, neato, circo, etc.)
   - Contains clustered subgraphs organized by cache type:
     * Memcache Functions
     * PageCache Extended Operations
     * Helper Cache Functions
     * WSDL Cache
   - Includes legend and summary statistics

2. cache_dependencies_detailed.dot
   - Alternative detailed DOT format
   - Uses left-to-right (LR) layout
   - Includes color coding by operation type:
     * Green: Initialization/Setup
     * Blue: Read Operations
     * Orange: Write Operations
     * Red: Delete Operations
     * Yellow: Cleanup

3. cache_functions_analysis.json
   - Complete JSON structure with all metadata
   - Includes function parameters, types, descriptions
   - Full dependency mapping with relation types
   - Cache technology details
   - Operation patterns
   - Configuration variables

4. CACHE_ANALYSIS_SUMMARY.md
   - Markdown format comprehensive analysis
   - Categorized function listing with descriptions
   - Dependency flow diagrams
   - Usage patterns
   - Configuration topology
   - Cross-references to all cache files

5. cache_dependency_export_README.txt
   - This file with overview and instructions

================================================================================
CACHE FUNCTIONS BY CATEGORY
================================================================================

MEMCACHED HELPER FUNCTIONS (lib_memcached.php)
- connect_memcache() [Line 8]
- read_memcache() [Line 19]
- write_memcache() [Line 23]
- delete_memcache() [Line 27]
- close_memcache() [Line 31]

PAGECACHER CLASS METHODS (pageCacherEx.php)
- _cache_key() [Line 68]
- _cache_connect() [Line 72]
- _cache_disconnect() [Line 81]
- _cache_get() [Line 87]
- _cache_set() [Line 97]
- _cache_delete() [Line 103]

HELPER & SPECIALIZED FUNCTIONS
- set_cache_coupon_ticket_event_ing() [coupon.php:956]
- memory_pop() [memcached.php:8]
- article_hit() [rcache.php:6]
- in_duration_with_memcache() [zboard/lib.php:3099]

WSDL CACHE (class.wsdlcache.php)
- wsdlcache (class) [Line 131]
- nusoap_wsdlcache() [Line 16]

================================================================================
HOW TO USE THE DOT FILES
================================================================================

With Graphviz command-line tools:
$ dot -Tpng cache_dependencies.dot -o cache_dependencies.png
$ dot -Tsvg cache_dependencies.dot -o cache_dependencies.svg
$ neato -Tpng cache_dependencies_detailed.dot -o cache_detailed.png

With Online Tools:
- http://www.webgraphviz.com/
- https://dreampuf.github.io/GraphvizOnline/

With IDE/Editor Plugins:
- VS Code: GraphViz extension
- Sublime: GraphVizPreview plugin

================================================================================
DEPENDENCY RELATIONSHIPS
================================================================================

MEMCACHE CHAIN:
  read_memcache() → requires → connect_memcache()
  write_memcache() → requires → connect_memcache()
  delete_memcache() → requires → connect_memcache()
  close_memcache() → closes → connect_memcache()

PAGECACHER CHAIN:
  _cache_get() → calls → _cache_connect() → uses → connect_memcache()
  _cache_set() → calls → _cache_connect() → uses → connect_memcache()
  _cache_delete() → calls → _cache_connect() → uses → connect_memcache()

CROSS-MODULE:
  in_duration_with_memcache() → uses → read_memcache() / write_memcache()
  article_hit() → uses → RCache class (with MySQL fallback)
  wsdlcache → extends → nusoap_wsdlcache

================================================================================
CACHE TECHNOLOGIES USED
================================================================================

1. MEMCACHED
   - Primary session and page caching mechanism
   - Configuration: $g_memcache_session_conf
   - Used by: lib_memcached.php, pageCacherEx.php
   - Socket: localhost with configured port

2. REDIS
   - Article hit counter caching
   - Configuration: $g_rcache_conf
   - Fallback: Database (master_conn)
   - Location: included in rcache.php

3. SOCKET-BASED PAGECACHER
   - Dedicated high-performance page cache
   - Socket path: /tmp/ttserver-1979
   - Used by: pageCacherEx.php

4. NUSOAP WSDL CACHE
   - WSDL document caching
   - File-based caching mechanism
   - Classes: nusoap_wsdlcache, wsdlcache

================================================================================
CONFIGURATION FILES
================================================================================

config/pagecacher_config.php
  - PageCacher server list and settings
  - Environment-dependent configuration (dev/production)

config/db_config.php
  - Database configuration for fallback operations
  - Redis configuration: $g_rcache_conf

Global Configuration Variables:
  - $g_memcache_session_conf - Memcached server address
  - $g_pagecacher20_severs - PageCacher server list v2.0
  - $g_pagecacher28_conf - PageCacher server configuration v2.8
  - $g_rcache_conf - Redis configuration

================================================================================
KEY INSIGHTS
================================================================================

1. LAYERED CACHING ARCHITECTURE
   - Multiple cache layers (Memcached, Redis, Socket-based)
   - Each layer optimized for specific use case
   - Fallback mechanisms in place for critical operations

2. WRAPPER PATTERN USAGE
   - PageCacher class wraps Memcached operations
   - Provides higher-level API (_cache_key, _setCachedFirstPage, etc.)
   - Automatic connection management (connect/disconnect)

3. HELPER FUNCTION ABSTRACTION
   - Helper functions provide simplified access to cache operations
   - in_duration_with_memcache() encapsulates common TTL pattern
   - article_hit() handles cache + database fallback transparently

4. ERROR HANDLING & FALLBACK
   - Redis failures automatically fall back to database
   - PageCacher failures don't break application flow
   - Graceful degradation pattern throughout

5. CONFIGURATION FLEXIBILITY
   - Environment-aware configuration (dev vs production)
   - Multiple server options for load balancing
   - Socket-based and TCP-based cache options

================================================================================
FILE LOCATIONS IN SOURCE TREE
================================================================================

work/mobile/ppomppu/
├── include/
│   ├── pageCacherEx.php (6 cache functions)
│   ├── helpers/
│   │   ├── lib_memcached.php (5 cache functions)
│   │   ├── memcached.php (1 cache function)
│   │   ├── rcache.php (1 cache function)
│   │   └── coupon.php (1 cache function)
│   └── libraries/
│       └── RCache.class.php (dependency)
├── config/
│   ├── pagecacher_config.php
│   └── db_config.php
├── zboard/
│   └── lib.php (1 cache function)
├── openapi/lib/
│   └── class.wsdlcache.php (2 cache functions)
└── _admin/monitors/
    ├── check_memcache.php
    ├── check_memcached.php
    └── check_pagecacher.php

================================================================================
USAGE PATTERNS & BEST PRACTICES
================================================================================

PATTERN 1: Direct Memcached Operations
  1. Create connection: $mem = connect_memcache()
  2. Perform operation: read/write/delete_memcache($mem, key, value)
  3. Close connection: close_memcache($mem)
  Example: cache_1 → cache_2/3/4 → cache_5

PATTERN 2: PageCacher Wrapper
  1. Generate key: $key = _cache_key($bbs_name)
  2. Call operation: _cache_get/set/delete($key) [auto-connects]
  3. No explicit close needed
  Example: cache_8 → cache_9 → cache_11 → cache_10

PATTERN 3: Helper Functions
  1. Call abstracted function: Helper::cache_get/set()
  2. Or use duration wrapper: in_duration_with_memcache()
  3. Automatic key and TTL management
  Example: cache_16 → cache_2/3

PATTERN 4: Redis with Fallback
  1. Call article_hit($id, $no)
  2. Internally tries Redis via RCache class
  3. Falls back to MySQL on connection failure
  Example: cache_7 (conditional)

================================================================================
STATISTICS
================================================================================

Total Functions: 18
Total Files: 8
Total Dependencies: 22

Function Distribution:
- Memcached: 5 functions (28%)
- PageCacher: 6 functions (33%)
- Helpers: 3 functions (17%)
- WSDL: 2 functions (11%)
- Coupon: 1 function (6%)
- Miscellaneous: 1 function (5%)

Dependency Relationships:
- Direct requires: 8
- Method calls: 6
- Internal uses: 5
- Inheritance: 1
- Related operations: 2

================================================================================
NOTES & RECOMMENDATIONS
================================================================================

1. All DOT files are compatible with Graphviz 2.40+
2. For large-scale visualization, use neato or fdp layout engine
3. JSON file includes complete metadata for programmatic analysis
4. All function descriptions include parameter and return type information
5. Cross-references between files are preserved for navigation
6. Configuration variables are documented for deployment engineers

================================================================================
