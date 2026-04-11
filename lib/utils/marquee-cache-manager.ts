// @/utils/marqueeCacheManager.ts

import {
  MarqueeItem,
  CacheEntry,
  CacheConfig,
  MarqueeAnalytics,
} from "@/types/marquee";

export class MarqueeCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private analytics: Map<string, MarqueeAnalytics> = new Map();
  private persistenceEnabled: boolean = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      duration: 3 * 60 * 1000, // 3 minutes
      staleWhileRevalidate: 15 * 60 * 1000, // 15 minutes
      maxRetries: 3,
      retryDelays: [1000, 2000, 4000],
      enableEtag: true,
      enablePreload: true,
      ...config,
    };

    // Try to enable persistence if localStorage is available
    this.initializePersistence();
  }

  // Initialize persistence layer
  private initializePersistence(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        this.persistenceEnabled = true;
        this.loadFromPersistence();
      }
    } catch (error) {
      console.warn("localStorage not available, using memory-only cache");
      this.persistenceEnabled = false;
    }
  }

  // Load cache from localStorage
  private loadFromPersistence(): void {
    if (!this.persistenceEnabled) return;

    try {
      const stored = localStorage.getItem("marquee-cache");
      if (stored) {
        const data = JSON.parse(stored);

        // Validate and restore cache entries
        Object.entries(data).forEach(([key, entry]: [string, any]) => {
          if (this.isValidCacheEntry(entry)) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.warn("Failed to load cache from localStorage:", error);
    }
  }

  // Save cache to localStorage
  private saveToPersistence(): void {
    if (!this.persistenceEnabled) return;

    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem("marquee-cache", JSON.stringify(cacheObject));
    } catch (error) {
      console.warn("Failed to save cache to localStorage:", error);
    }
  }

  // Validate cache entry structure
  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry === "object" &&
      Array.isArray(entry.data) &&
      typeof entry.timestamp === "number" &&
      typeof entry.expiresAt === "number" &&
      typeof entry.currency === "string"
    );
  }

  // Get cache entry
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveToPersistence();
      return null;
    }

    return entry;
  }

  // Set cache entry
  set(key: string, data: MarqueeItem[], currency: string, etag?: string): void {
    const now = Date.now();
    const entry: CacheEntry = {
      data,
      currency,
      timestamp: now,
      expiresAt: now + this.config.duration,
      etag,
      version: 1,
    };

    this.cache.set(key, entry);
    this.saveToPersistence();
  }

  // Check if data is stale but within stale-while-revalidate window
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    return Date.now() > entry.timestamp + this.config.duration;
  }

  // Check if data is expired (beyond stale-while-revalidate window)
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    return Date.now() > entry.timestamp + this.config.staleWhileRevalidate;
  }

  // Invalidate cache entry
  invalidate(key: string): void {
    this.cache.delete(key);
    this.saveToPersistence();
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.analytics.clear();

    if (this.persistenceEnabled) {
      try {
        localStorage.removeItem("marquee-cache");
      } catch (error) {
        console.warn("Failed to clear cache from localStorage:", error);
      }
    }
  }

  // Update analytics
  updateAnalytics(key: string, analytics: Partial<MarqueeAnalytics>): void {
    const current = this.analytics.get(key) || {
      loadTime: 0,
      cacheHit: false,
      errorCount: 0,
      retryCount: 0,
    };

    this.analytics.set(key, { ...current, ...analytics });
  }

  // Get analytics
  getAnalytics(key: string): MarqueeAnalytics | null {
    return this.analytics.get(key) || null;
  }

  // Get cache statistics
  getStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    averageLoadTime: number;
    errorRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const analyticsData = Array.from(this.analytics.values());

    const totalEntries = entries.length;
    const totalSize = entries.reduce((size, entry) => {
      return size + JSON.stringify(entry).length;
    }, 0);

    const totalRequests = analyticsData.reduce(
      (sum, a) => sum + (a.cacheHit ? 1 : 0) + a.errorCount,
      0
    );
    const cacheHits = analyticsData.reduce(
      (sum, a) => sum + (a.cacheHit ? 1 : 0),
      0
    );
    const totalLoadTime = analyticsData.reduce((sum, a) => sum + a.loadTime, 0);
    const totalErrors = analyticsData.reduce((sum, a) => sum + a.errorCount, 0);

    return {
      totalEntries,
      totalSize,
      hitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      averageLoadTime:
        analyticsData.length > 0 ? totalLoadTime / analyticsData.length : 0,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    };
  }

  // Preload images from cache
  preloadImages(items: MarqueeItem[]): Promise<void[]> {
    if (!this.config.enablePreload) return Promise.resolve([]);

    const imageUrls = items
      .filter(
        (item): item is MarqueeItem & { imageSrc: string } =>
          item.type === "project" && Boolean(item.image_src)
      )
      .map((item) => item.imageSrc);

    const promises = imageUrls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`Failed to preload image: ${url}`);
          resolve();
        };
        img.src = url;
      });
    });

    return Promise.all(promises);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.info(`Cleaned up ${cleaned} expired cache entries`);
      this.saveToPersistence();
    }
  }

  // Auto cleanup setup
  setupAutoCleanup(intervalMs: number = 5 * 60 * 1000): () => void {
    const intervalId = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }

  // Export cache for debugging
  export(): Record<string, CacheEntry> {
    return Object.fromEntries(this.cache);
  }

  // Import cache (for testing or migration)
  import(data: Record<string, CacheEntry>): void {
    this.cache.clear();

    Object.entries(data).forEach(([key, entry]) => {
      if (this.isValidCacheEntry(entry)) {
        this.cache.set(key, entry);
      }
    });

    this.saveToPersistence();
  }

  // Get configuration
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global cache manager instance
export const marqueeCacheManager = new MarqueeCacheManager();

// Setup auto cleanup
marqueeCacheManager.setupAutoCleanup();

// Cache manager hook for React components
export const useMarqueeCacheManager = () => {
  return marqueeCacheManager;
};
