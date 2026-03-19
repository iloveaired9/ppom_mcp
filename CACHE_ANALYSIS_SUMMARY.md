# Cache Dependency Analysis Summary

## Overview
This document provides a comprehensive analysis of cache-related functions in the ppomppu codebase.

**Generated:** 2026-03-19
**Pattern Matched:** `cache` (case-insensitive)
**Total Functions Found:** 18

## Cache Functions by Category

### 1. Memcached Helper Functions (lib_memcached.php)
File: `work/mobile/ppomppu/include/helpers/lib_memcached.php`

| Function | Line | Purpose |
|----------|------|---------|
| `connect_memcache()` | 8 | Establishes connection to Memcached server |
| `read_memcache($mem, $key)` | 19 | Retrieves value from Memcached by key |
| `write_memcache($mem, $key, $value, $life)` | 23 | Stores value in Memcached with optional TTL |
| `delete_memcache($mem, $key)` | 27 | Deletes key from Memcached |
| `close_memcache($mem)` | 31 | Closes Memcached connection |

**Dependencies:**
- Global config: `$g_memcache_session_conf`
- External library: `Memcached` class

### 2. PageCacher Class Methods (pageCacherEx.php)
File: `work/mobile/ppomppu/include/pageCacherEx.php`

| Function | Line | Purpose |
|----------|------|---------|
| `_cache_key($bbs_name)` | 68 | Generates cache key for board |
| `_cache_connect()` | 72 | Establishes Memcached connection for PageCacher |
| `_cache_disconnect()` | 81 | Closes PageCacher Memcached connection |
| `_cache_get($k)` | 87 | Retrieves cached data by key |
| `_cache_set($k, $data, $ttl)` | 97 | Stores data in cache with TTL |
| `_cache_delete($k)` | 103 | Deletes cached data |
| `_setCachedFirstPage($bbs_name, $data)` | 109 | High-level method to cache board first page |
| `getCachedFirstPage($bbs_name, $num)` | 114 | High-level method to retrieve cached first page |
| `_invalidateCachedFirstPage($bbs_name)` | 123 | High-level method to invalidate cached first page |

**Dependencies:**
- Uses Memcached for actual storage
- Config files:
  - `pagecacher_config.php`
  - `db_config.php`
  - `path_config.php`

### 3. Redis Cache Functions (rcache.php)
File: `work/mobile/ppomppu/include/helpers/rcache.php`

| Function | Line | Purpose |
|----------|------|---------|
| `article_hit($id, $no)` | 6 | Records article view count via Redis |

**Dependencies:**
- Redis client
- RCache class: `include/libraries/RCache.class.php`
- Fallback to database: `database.php` (master_conn)

### 4. Board Library Memcached Functions (zboard/lib.php)
File: `work/mobile/ppomppu/zboard/lib.php`

| Function | Line | Purpose |
|----------|------|---------|
| `in_duration_with_memcache($key, $ttl, $data)` | 3099 | Check/store value in memcache within duration |

**Dependencies:**
- `Helper::cache_get()`
- `Helper::cache_set()`

### 5. Coupon Helper Functions (helpers/coupon.php)
File: `work/mobile/ppomppu/include/helpers/coupon.php`

| Function | Line | Purpose |
|----------|------|---------|
| `set_cache_coupon_ticket_event_ing()` | 956 | Caches coupon ticket event state |

### 6. Helper Memory Functions (helpers/memcached.php)
File: `work/mobile/ppomppu/include/helpers/memcached.php`

| Function | Line | Purpose |
|----------|------|---------|
| `memory_pop()` | 8 | Pops value from memory/memcached |

### 7. WSDL Cache (openapi/lib/class.wsdlcache.php)
File: `work/mobile/ppomppu/openapi/lib/class.wsdlcache.php`

| Type | Name | Line | Purpose |
|------|------|------|---------|
| Class | `wsdlcache` | 131 | WSDL caching class (extends nusoap_wsdlcache) |
| Function | `nusoap_wsdlcache()` | 16 | Constructor for WSDL cache |

## Dependency Graph

### Memcache Operation Flow
```
PageCacher._cache_get()
    ↓
PageCacher._cache_connect()
    ↓
Memcached() [PHP built-in]
```

### Cross-Module Dependencies
```
in_duration_with_memcache()
    ↓
Helper::cache_get()
Helper::cache_set()
    ↓
read_memcache()
write_memcache()
```

### Redis Integration
```
article_hit($id, $no)
    ↓
RCache class
    ↓
Redis client
    ↓
(Fallback) database.php::master_conn()
```

## Configuration Files
- `config/pagecacher_config.php` - PageCacher server configuration
- `config/db_config.php` - Database configuration
- Global variables:
  - `$g_memcache_session_conf` - Memcached server configuration
  - `$g_rcache_conf` - Redis cache configuration

## Cache Technologies Used
1. **Memcached** - Primary caching layer for page/session data
2. **Redis** - Used for article hit counting with fallback to MySQL
3. **Socket-based PageCacher** - Dedicated page caching service
4. **NuSOAP WSDL Cache** - WSDL document caching

## Function Call Graph

### Direct Cache Operations
- `_cache_get()` → `_cache_connect()` → `_cache_disconnect()`
- `_cache_set()` → `_cache_connect()` → `_cache_disconnect()`
- `_cache_delete()` → `_cache_connect()` → `_cache_disconnect()`

### High-Level Operations
- `_setCachedFirstPage()` → `_cache_key()` → `_cache_set()`
- `getCachedFirstPage()` → `_cache_key()` → `_cache_get()`
- `_invalidateCachedFirstPage()` → `_cache_key()` → `_cache_delete()`

## Usage Patterns

### Pattern 1: Memcached Direct Operations
```
connect_memcache() → read/write/delete_memcache() → close_memcache()
```

### Pattern 2: PageCacher Wrapper
```
_cache_key() → _cache_get/set/delete() (auto-connect/disconnect)
```

### Pattern 3: Helper Functions
```
Helper::cache_get/set() → in_duration_with_memcache()
```

### Pattern 4: Redis with Fallback
```
article_hit() → RCache → Redis OR database.php::master_conn()
```

## Cache Configuration Topology

**Memcached Configuration:**
- Session caching via `$g_memcache_session_conf`
- Page caching via pagecacher servers (dev/production specific)
- Socket-based communication on `/tmp/ttserver-1979`

**Redis Configuration:**
- Article hit counting via `$g_rcache_conf`
- Automatic fallback to master database connection on Redis failure

## Files Containing Cache References
- `work/mobile/ppomppu/include/pageCacherEx.php`
- `work/mobile/ppomppu/include/helpers/lib_memcached.php`
- `work/mobile/ppomppu/include/helpers/memcached.php`
- `work/mobile/ppomppu/include/helpers/rcache.php`
- `work/mobile/ppomppu/include/helpers/coupon.php`
- `work/mobile/ppomppu/zboard/lib.php`
- `work/mobile/ppomppu/openapi/lib/class.wsdlcache.php`
- `work/mobile/ppomppu/config/pagecacher_config.php`
- `work/mobile/ppomppu/_admin/monitors/check_memcache.php`
- `work/mobile/ppomppu/_admin/monitors/check_memcached.php`
- `work/mobile/ppomppu/_admin/monitors/check_pagecacher.php`

## Notes
- Total of 18 cache-related functions identified
- Multiple caching layers used for different purposes
- Fallback mechanisms in place for critical operations (Redis → MySQL)
- Configuration is environment-aware (dev vs production)
