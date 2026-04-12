// @/hooks/useMarqueeDataProduction.ts

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MarqueeItem, MarqueeAPIResponse, UseMarqueeDataReturn, MarqueeError, ProjectStatus } from "@/types/marquee";
import { marqueeCacheManager } from "@/lib/utils/marquee-cache-manager";

// Configuration constants
const CACHE_KEY = 'marquee-data-v2';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RETRY_INTERVALS = [1000, 2000, 4000, 8000]; // Exponential backoff

// Request deduplication
let activeRequest: Promise<MarqueeAPIResponse> | null = null;
let requestAbortController: AbortController | null = null;

export const useMarqueeData = (): UseMarqueeDataReturn => {
  const [items, setItems] = useState<MarqueeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currency, setCurrency] = useState<string>('NGN');

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmounted = useRef(false);
  /** Bumps on each effect run so async work from a previous mount is ignored (Strict Mode / fast navigation). */
  const effectGenRef = useRef(0);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    loadTime: 0,
    cacheHit: false,
    errorCount: 0,
    retryCount: 0,
  });

  // Check if data is stale
  const isStale = useMemo(() => {
    const cached = marqueeCacheManager.get(CACHE_KEY);
    if (!cached) return true;
    return marqueeCacheManager.isStale(CACHE_KEY);
  }, [lastUpdated]);

  const isStaleRef = useRef(isStale);
  isStaleRef.current = isStale;

  // Transform API response to MarqueeItem format with error handling
  const transformData = useCallback((apiData: MarqueeAPIResponse): MarqueeItem[] => {
    try {
      return apiData.items
        .filter(item => item && typeof item.id === 'string') // Validate items
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((item): MarqueeItem => {
          const baseItem = {
            id: item.id,
            type: item.type,
            href: item.href || '#',
            order: item.order || 0,
          };

          if (item.type === 'project') {
            return {
              ...baseItem,
              type: 'project' as const,
              title: item.title || 'Untitled Project',
              description: item.description || 'No description available',
              image_src: item.image_src, 
              image_alt: item.image_alt || `${item.title} cover image`, 
              country: item.country,
              progress: typeof item.progress === 'number' ? Math.max(0, Math.min(100, item.progress)) : undefined,
              slug: item.slug,
              status: item.status as ProjectStatus,
              goal_amount: item.goal_amount, 
              current_amount: item.current_amount, 
              created_at: item.created_at, 
            };
          } else {
            return {
              ...baseItem,
              type: 'metric' as const,
              metric_type: item.metric_type, 
              value: item.value || '0',
              unit: item.unit,
              trend: item.trend,
              label: item.label,
            };
          }
        });
    } catch (transformError) {
      console.error('Error transforming marquee data:', transformError);
      throw new Error('Failed to process marquee data');
    }
  }, []);

  // Create a custom error with additional context
  const createMarqueeError = useCallback((
    message: string, 
    originalError?: Error, 
    statusCode?: number
  ): MarqueeError => {
    const error = new Error(message) as MarqueeError;
    error.name = 'MarqueeError';
    error.code = 'FETCH_ERROR';
    error.retryable = true;
    error.statusCode = statusCode;
    
    if (originalError) {
      error.stack = originalError.stack;
    }
    
    return error;
  }, []);

  // Enhanced fetch with comprehensive error handling
  const fetchWithRetry = useCallback(async (
    retryCount = 0,
    signal?: AbortSignal
  ): Promise<MarqueeAPIResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Combine signals
      const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

      const cachedEntry = marqueeCacheManager.get(CACHE_KEY);
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      // Add ETag if available
      if (cachedEntry?.etag) {
        headers['If-None-Match'] = cachedEntry.etag;
      }

      const response = await fetch("/api/marquee-data", {
        method: 'GET',
        headers,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Handle 304 Not Modified - FIXED to use snake_case
      if (response.status === 304 && cachedEntry) {
        console.info('Data not modified, using cached version');
        return {
          items: cachedEntry.data.map(item => ({
            id: item.id,
            type: item.type,
            href: item.href,
            order: item.order || 0,
            ...(item.type === 'project' && {
              title: item.title,
              description: item.description,
              image_src: item.image_src, 
              image_alt: item.image_alt, 
              country: item.country,
              progress: item.progress,
              slug: item.slug,
              status: item.status,
              goal_amount: item.goal_amount, 
              current_amount: item.current_amount, 
              created_at: item.created_at, 
            }),
            ...(item.type === 'metric' && {
              metric_type: item.metric_type, 
              value: item.value,
              unit: item.unit,
              trend: item.trend,
              label: item.label,
            }),
          })),
          default_currency: cachedEntry.currency,
        };
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw createMarqueeError(
          `API error: ${response.status} ${response.statusText}`,
          new Error(errorText),
          response.status
        );
      }

      // Parse response
      let data: MarqueeAPIResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        throw createMarqueeError(
          'Invalid JSON response from server',
          parseError as Error,
          response.status
        );
      }

      // Validate response structure
      if (!data || !Array.isArray(data.items)) {
        throw createMarqueeError(
          'Invalid response format: missing items array',
          undefined,
          response.status
        );
      }

      // Store ETag for future requests
      const etag = response.headers.get('etag');
      if (etag) {
        const transformedItems = transformData(data);
        marqueeCacheManager.set(CACHE_KEY, transformedItems, data.default_currency, etag);
      }

      return data;

    } catch (err) {
      clearTimeout(timeoutId);

      // Handle abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        throw createMarqueeError('Request timeout or cancelled');
      }

      // Network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw createMarqueeError('Network error: Please check your connection', err);
      }

      // Retry logic
      if (retryCount < RETRY_INTERVALS.length) {
        const delay = RETRY_INTERVALS[retryCount];
        console.warn(`Fetch attempt ${retryCount + 1} failed, retrying in ${delay}ms...`, err);
        
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });

        if (!isUnmounted.current) {
          setAnalytics(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));
          return fetchWithRetry(retryCount + 1, signal);
        }
      }

      // Re-throw the error if we've exhausted retries
      throw err instanceof Error ? err : createMarqueeError('Unknown error occurred');
    }
  }, [transformData, createMarqueeError]);

  // Main fetch function with comprehensive caching
  const fetchMarqueeData = useCallback(async (
    forceRefresh = false,
    silent = false,
    effectGen?: number
  ) => {
    if (isUnmounted.current) return;

    const stale = () => effectGen != null && effectGen !== effectGenRef.current;

    const startTime = performance.now();
    let cacheHit = false;

    try {
      // Request deduplication
      if (activeRequest && !forceRefresh) {
        if (!silent) setLoading(true);
        const data = await activeRequest;
        if (isUnmounted.current || stale()) return;

        const transformedItems = transformData(data);
        setItems(transformedItems);
        setCurrency(data.default_currency);
        setLastUpdated(new Date());
        if (!silent) setLoading(false);
        return;
      }

      // Check cache first
      const cachedEntry = marqueeCacheManager.get(CACHE_KEY);
      if (!forceRefresh && cachedEntry && !marqueeCacheManager.isExpired(CACHE_KEY)) {
        setItems(cachedEntry.data);
        setCurrency(cachedEntry.currency);
        setLastUpdated(new Date(cachedEntry.timestamp));
        if (!silent) setLoading(false);
        cacheHit = true;

        // Update analytics
        setAnalytics(prev => ({
          ...prev,
          loadTime: performance.now() - startTime,
          cacheHit: true,
        }));

        // Preload images in background
        marqueeCacheManager.preloadImages(cachedEntry.data);

        // If data is stale, fetch fresh data in background
        if (marqueeCacheManager.isStale(CACHE_KEY)) {
          setTimeout(() => fetchMarqueeData(true, true, effectGen), 100);
        }
        return;
      }

      // Show loading state if not silent
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Create abort controller for this request
      const controller = new AbortController();
      requestAbortController = controller;

      // Fetch fresh data
      activeRequest = fetchWithRetry(0, controller.signal);
      const data = await activeRequest;
      
      if (isUnmounted.current || stale()) return;

      activeRequest = null;
      requestAbortController = null;

      const transformedItems = transformData(data);

      // Update cache
      const etag = data.etag || undefined;
      marqueeCacheManager.set(CACHE_KEY, transformedItems, data.default_currency, etag);

      // Update state
      setItems(transformedItems);
      setCurrency(data.default_currency);
      setLastUpdated(new Date());

      // Preload images
      marqueeCacheManager.preloadImages(transformedItems);

      // Update analytics
      setAnalytics(prev => ({
        ...prev,
        loadTime: performance.now() - startTime,
        cacheHit,
        errorCount: 0, // Reset on success
      }));

      // Update cache manager analytics
      marqueeCacheManager.updateAnalytics(CACHE_KEY, {
        loadTime: performance.now() - startTime,
        cacheHit,
      });

    } catch (err) {
      if (isUnmounted.current || stale()) return;

      console.error("Error fetching marquee data:", err);
      
      activeRequest = null;
      requestAbortController = null;

      const errorMessage = err instanceof Error ? err.message : "Failed to fetch marquee data";
      if (!silent) setError(errorMessage);

      // Update analytics
      setAnalytics(prev => ({
        ...prev,
        loadTime: performance.now() - startTime,
        cacheHit: false,
        errorCount: prev.errorCount + 1,
      }));

      // Update cache manager analytics
      marqueeCacheManager.updateAnalytics(CACHE_KEY, {
        errorCount: analytics.errorCount + 1,
      });

      // Try to serve cached data on error
      const cachedEntry = marqueeCacheManager.get(CACHE_KEY);
      if (cachedEntry && cachedEntry.data.length > 0) {
        setItems(cachedEntry.data);
        setCurrency(cachedEntry.currency);
        setLastUpdated(new Date(cachedEntry.timestamp));
        console.info('Serving cached data due to fetch error');
        
        // Clear error if we have cached data
        if (!silent) setError(null);
      } else {
        setItems([]);
      }
    } finally {
      if (!silent && !isUnmounted.current && !(effectGen != null && effectGen !== effectGenRef.current)) {
        setLoading(false);
      }
    }
  }, [transformData, analytics.errorCount, fetchWithRetry]);

  // Setup background refresh
  const setupBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && !isUnmounted.current) {
        fetchMarqueeData(false, true, effectGenRef.current); // Silent background refresh
      }
    }, BACKGROUND_REFRESH_INTERVAL);
  }, [fetchMarqueeData]);

  // Cleanup function
  const cleanup = useCallback(() => {
    isUnmounted.current = true;
    
    if (requestAbortController) {
      requestAbortController.abort();
      requestAbortController = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
      backgroundRefreshRef.current = null;
    }
    
    activeRequest = null;
  }, []);

  // Initial fetch and setup
  useEffect(() => {
    isUnmounted.current = false;
    const gen = ++effectGenRef.current;
    fetchMarqueeData(false, false, gen);
    setupBackgroundRefresh();

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isStaleRef.current &&
        !isUnmounted.current
      ) {
        fetchMarqueeData(false, true, effectGenRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMarqueeData, setupBackgroundRefresh, cleanup]);

  // Force refresh function
  const refetch = useCallback(() => {
    return fetchMarqueeData(true, false, effectGenRef.current);
  }, [fetchMarqueeData]);

  return {
    items,
    loading,
    error,
    refetch,
    isStale,
    lastUpdated,
    currency,
    analytics,
  };
};