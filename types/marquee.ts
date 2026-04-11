// @/types/marquee.ts

// ===============================================
// CORE MARQUEE TYPES
// ===============================================

export interface MarqueeItem {
  id: string;
  type: "project" | "metric";
  href: string;
  order?: number;

  // Project-specific fields (camelCase - converted from snake_case API)
  title?: string;
  description?: string;
  image_src?: string; // Mapped from image_src
  image_alt?: string; // Mapped from image_alt
  country?: string;
  progress?: number;
  slug?: string;
  status?: ProjectStatus;
  goal_amount?: number; // Mapped from goal_amount
  current_amount?: number; // Mapped from current_amount
  created_at?: string; // Mapped from created_at

  // Metric-specific fields
  metric_type?: string; // Mapped from metric_type
  value?: string;
  unit?: string;
  trend?: MetricTrend;
  label?: string;
}

export type ProjectStatus =
  | "draft"
  | "proposed"
  | "voting"
  | "active"
  | "completed"
  | "cancelled"
  | "archived";
export interface MetricTrend {
  direction: "up" | "down" | "stable";
  value: string;
}

// ===============================================
// API RESPONSE TYPES (snake_case from database)
// ===============================================

export interface MarqueeAPIResponse {
  items: MarqueeAPIItem[];
  default_currency: string;
  etag?: string;
}

export interface MarqueeAPIItem {
  id: string;
  type: "project" | "metric";
  href: string;
  order: number;

  // Project fields (snake_case from database)
  title?: string;
  description?: string;
  image_src?: string;
  image_alt?: string;
  country?: string;
  progress?: number;
  slug?: string;
  status?: string;
  goal_amount?: number;
  current_amount?: number;
  created_at?: string;

  // Metric fields (snake_case from database)
  metric_type?: string;
  value?: string;
  unit?: string;
  trend?: MetricTrend;
  label?: string;
}

// ===============================================
// COMPONENT PROPS
// ===============================================

export interface MarqueeContainerProps {
  items: MarqueeItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  autoplaySpeed?: number;
  showNavigation?: boolean;
  className?: string;
  currency?: string;
}

export interface LoadingSkeletonProps {
  count?: number;
  type?: "projects" | "metrics" | "mixed";
  className?: string;
}

// ===============================================
// HOOK TYPES
// ===============================================

export interface UseMarqueeDataReturn {
  items: MarqueeItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  lastUpdated: Date | null;
  currency: string;
  analytics: MarqueeAnalytics;
}

export interface MarqueeAnalytics {
  loadTime: number;
  cacheHit: boolean;
  errorCount: number;
  retryCount: number;
}

// ===============================================
// CACHE TYPES
// ===============================================

export interface CacheEntry {
  data: MarqueeItem[];
  currency: string;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  version: number;
}

export interface CacheConfig {
  duration: number; // Cache duration in milliseconds
  staleWhileRevalidate: number; // Stale-while-revalidate duration
  maxRetries: number;
  retryDelays: number[];
  enableEtag: boolean;
  enablePreload: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  averageLoadTime: number;
  errorRate: number;
}

// ===============================================
// ERROR TYPES
// ===============================================

export interface MarqueeError extends Error {
  name: "MarqueeError";
  code?: string;
  retryable?: boolean;
  statusCode?: number;
}

export type MarqueeErrorCode =
  | "FETCH_ERROR"
  | "TIMEOUT_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "CACHE_ERROR";

// ===============================================
// PERFORMANCE MONITORING TYPES
// ===============================================

export interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdate: Date;
  requestCount: number;
  averageResponseTime: number;
}

export interface PerformanceThresholds {
  good: number;
  warning: number;
}

export interface PerformanceConfig {
  loadTime: PerformanceThresholds;
  cacheHitRate: PerformanceThresholds;
  errorRate: PerformanceThresholds;
}

// ===============================================
// SETTINGS/ADMIN TYPES (for backwards compatibility)
// ===============================================

export interface FeaturedItem {
  id: string;
  type: "project" | "metric";
  order: number;

  // Project fields
  title?: string;
  cover_image?: string;

  // Metric fields
  label?: string;
  metric_type?: string;
}

export interface MarqueeConfiguration {
  featuredItems: FeaturedItem[];
  autoplayEnabled: boolean;
  autoplaySpeed: number;
  showNavigation: boolean;
  maxItems: number;
  currency: string;
}

// ===============================================
// UTILITY TYPES
// ===============================================

export type MarqueeItemType = MarqueeItem["type"];

export type ProjectItem = MarqueeItem & { type: "project" };
export type MetricItem = MarqueeItem & { type: "metric" };

// Type guards
export const isProjectItem = (item: MarqueeItem): item is ProjectItem => {
  return item.type === "project";
};

export const isMetricItem = (item: MarqueeItem): item is MetricItem => {
  return item.type === "metric";
};

// ===============================================
// REQUEST/RESPONSE TYPES
// ===============================================

export interface FetchOptions {
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

export interface RequestContext {
  startTime: number;
  retryCount: number;
  cacheAttempted: boolean;
  requestId: string;
}

// ===============================================
// EVENT TYPES
// ===============================================

export interface MarqueeInteractionEvent {
  type: "click" | "view" | "slide_change" | "interaction";
  item?: MarqueeItem;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface MarqueeAnalyticsEvent {
  eventType: string;
  data: any;
  timestamp: number;
  sessionId?: string;
}

// ===============================================
// BROWSER API TYPES (for AbortSignal.any compatibility)
// ===============================================

declare global {
  interface AbortSignal {
    any?(signals: AbortSignal[]): AbortSignal;
  }
}

// ===============================================
// VALIDATION SCHEMAS (for runtime type checking)
// ===============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface MarqueeItemValidator {
  validateItem(item: any): ValidationResult;
  validateAPIResponse(response: any): ValidationResult;
}

// ===============================================
// DEBUGGING TYPES
// ===============================================

export interface DebugInfo {
  cacheSize: number;
  lastFetch: Date | null;
  requestHistory: RequestContext[];
  performanceMetrics: PerformanceMetrics;
}

export interface DebuggerMethods {
  logCacheStatus(): void;
  forceCacheRefresh(): void;
  exportCache(): void;
  simulateSlowNetwork(delayMs?: number): void;
  simulateNetworkError(): void;
}

// ===============================================
// ENVIRONMENT TYPES
// ===============================================

export type Environment = "development" | "staging" | "production";

export interface EnvironmentConfig {
  enableDebug: boolean;
  enablePerformanceMonitor: boolean;
  enableAnalytics: boolean;
  cacheConfig: Partial<CacheConfig>;
}

// ===============================================
// TRANSFORMATION TYPES
// ===============================================

export type APIToMarqueeTransform = (apiItem: MarqueeAPIItem) => MarqueeItem;
export type MarqueeToAPITransform = (
  marqueeItem: MarqueeItem
) => MarqueeAPIItem;

export interface DataTransformer {
  apiToMarquee: APIToMarqueeTransform;
  marqueeToAPI: MarqueeToAPITransform;
}

// ===============================================
// CONSTANTS AND DEFAULTS
// ===============================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  duration: 3 * 60 * 1000, // 3 minutes
  staleWhileRevalidate: 15 * 60 * 1000, // 15 minutes
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000],
  enableEtag: true,
  enablePreload: true,
};

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  loadTime: { good: 500, warning: 1000 },
  cacheHitRate: { good: 80, warning: 60 },
  errorRate: { good: 1, warning: 5 },
};

export const CACHE_KEYS = {
  MARQUEE_DATA: "marquee-data-v2",
  SETTINGS: "marquee-settings",
  ANALYTICS: "marquee-analytics",
} as const;

// ===============================================
// TYPE UTILITIES
// ===============================================

export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Snake case to camel case transformation utility type
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

export type CamelCaseKeys<T> = {
  [K in keyof T as SnakeToCamel<string & K>]: T[K];
};

// ===============================================
// MODULE AUGMENTATION (if needed)
// ===============================================

declare module "react" {
  interface HTMLAttributes<T> {
    "data-marquee-item"?: string;
    "data-marquee-item-id"?: string;
    "data-marquee-item-type"?: string;
  }
}
