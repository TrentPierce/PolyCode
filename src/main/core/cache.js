/**
 * Response Cache Module
 *
 * Provides intelligent caching for LLM responses to reduce latency
 * and improve user experience
 */

const crypto = require('crypto');

/**
 * Cache configuration
 * @typedef {Object} CacheConfig
 * @property {number} maxSize - Maximum number of cache entries
 * @property {number} ttl - Time to live in milliseconds
 * @property {number} maxEntrySize - Maximum size of single cache entry in bytes
 */

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG = {
  maxSize: 100,              // Maximum 100 cached responses
  ttl: 3600000,            // 1 hour (60 minutes)
  maxEntrySize: 10485760   // 10MB maximum per entry
};

/**
 * Cache entry
 * @typedef {Object} CacheEntry
 * @property {string} key - Cache key (hash)
 * @property {*} value - Cached value
 * @property {number} timestamp - When cached
 * @property {number} hits - Number of times this entry was retrieved
 * @property {number} size - Size in bytes
 */

/**
 * Response Cache Class
 */
class ResponseCache {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map(); // In-memory cache
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    // Load persisted cache if available
    this.loadFromStorage();
  }

  /**
   * Generate cache key from parameters
   * @param {string} prompt - User prompt
   * @param {string} model - Model ID
   * @param {Object} options - Generation options
   * @returns {string} Cache key
   */
  generateKey(prompt, model, options = {}) {
    const keyString = JSON.stringify({
      prompt: prompt.trim(),
      model,
      temperature: options.temperature || 0.7,
      maxTokens: options.max_tokens || 2000
    });

    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Calculate size of value in bytes
   * @param {*} value - Value to calculate size
   * @returns {number} Size in bytes
   */
  calculateSize(value) {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return Buffer.byteLength(str, 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Check if entry has expired
   * @param {CacheEntry} entry - Cache entry
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    const age = Date.now() - entry.timestamp;
    return age > this.config.ttl;
  }

  /**
   * Get cached value
   * @param {string} prompt - User prompt
   * @param {string} model - Model ID
   * @param {Object} options - Generation options
   * @returns {*} Cached value or null if not found/expired
   */
  get(prompt, model, options = {}) {
    const key = this.generateKey(prompt, model, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Return cached value
    this.stats.hits++;
    entry.hits++;

    return {
      value: entry.value,
      fromCache: true,
      age: Date.now() - entry.timestamp,
      key
    };
  }

  /**
   * Set cache value
   * @param {string} prompt - User prompt
   * @param {string} model - Model ID
   * @param {*} value - Value to cache
   * @param {Object} options - Generation options
   * @returns {boolean} True if cached successfully
   */
  set(prompt, model, value, options = {}) {
    const key = this.generateKey(prompt, model, options);
    const size = this.calculateSize(value);

    // Check if entry is too large
    if (size > this.config.maxEntrySize) {
      console.warn(`Cache entry too large (${size} bytes), skipping`);
      return false;
    }

    // Evict old entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    // Set cache entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
      size
    });

    // Persist to storage
    this.saveToStorage();

    return true;
  }

  /**
   * Evict oldest entry from cache
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict entries for specific model
   * @param {string} model - Model ID to evict
   */
  evictModel(model) {
    let evicted = 0;
    for (const [key, entry] of this.cache) {
      if (key.includes(model)) {
        this.cache.delete(key);
        evicted++;
      }
    }
    this.saveToStorage();
    return evicted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    this.saveToStorage();
    return size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate.toFixed(1)}%`,
      evictions: this.stats.evictions
    };
  }

  /**
   * Get all cache keys
   * @returns {string[]} Array of cache keys
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Save cache to persistent storage
   */
  saveToStorage() {
    try {
      const data = JSON.stringify({
        cache: Array.from(this.cache),
        stats: this.stats,
        version: 1
      });

      // Store in app data directory
      const path = require('path');
      const fs = require('fs');
      const app = require('electron').app || require('@electron/remote').app;

      const cacheFile = path.join(app.getPath('userData'), 'llm-cache.json');
      fs.writeFileSync(cacheFile, data, 'utf8');
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Load cache from persistent storage
   */
  loadFromStorage() {
    try {
      const path = require('path');
      const fs = require('fs');
      const app = require('electron').app || require('@electron/remote').app;

      const cacheFile = path.join(app.getPath('userData'), 'llm-cache.json');

      if (!fs.existsSync(cacheFile)) {
        return;
      }

      const data = fs.readFileSync(cacheFile, 'utf8');
      const parsed = JSON.parse(data);

      // Load only valid entries
      if (parsed.cache && Array.isArray(parsed.cache)) {
        for (const entry of parsed.cache) {
          // Skip expired entries
          if (!this.isExpired(entry)) {
            this.cache.set(entry.key, entry);
          }
        }

        if (parsed.stats) {
          this.stats = parsed.stats;
        }
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  /**
   * Clean expired entries
   * @returns {number} Number of entries cleaned
   */
  cleanExpired() {
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
    }

    return cleaned;
  }

  /**
   * Get cache size in bytes
   * @returns {number} Total cache size in bytes
   */
  getCacheSize() {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }

    return totalSize;
  }

  /**
   * Optimize cache by removing least frequently used entries
   * @param {number} keep - Number of entries to keep
   */
  optimize(keep = 50) {
    if (this.cache.size <= keep) {
      return;
    }

    // Sort by hit count (least used first)
    const sorted = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);

    // Remove least used entries
    const toRemove = sorted.slice(0, sorted.length - keep);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }

    this.saveToStorage();
    return toRemove.length;
  }
}

/**
 * Create global cache instance
 */
let globalCache = null;

/**
 * Get or create global cache instance
 * @returns {ResponseCache} Cache instance
 */
function getCache() {
  if (!globalCache) {
    globalCache = new ResponseCache();
  }
  return globalCache;
}

/**
 * Update cache configuration
 * @param {CacheConfig} config - New cache configuration
 */
function updateCacheConfig(config) {
  if (globalCache) {
    globalCache.config = { ...globalCache.config, ...config };
    globalCache.saveToStorage();
  }
}

module.exports = {
  ResponseCache,
  getCache,
  updateCacheConfig,
  DEFAULT_CONFIG
};
