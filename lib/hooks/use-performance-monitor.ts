import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  memoryUsage: number;
  reRenderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

interface PerformanceThresholds {
  slowRender: number; // ms
  highMemory: number; // MB
  maxReRenders: number;
}

export const usePerformanceMonitor = (
  componentName: string,
  thresholds: PerformanceThresholds = {
    slowRender: 16, // 60fps
    highMemory: 50, // MB
    maxReRenders: 10,
  }
) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMountTime: 0,
    memoryUsage: 0,
    reRenderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  const renderTimesRef = useRef<number[]>([]);
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    renderCountRef.current = 0;
    renderTimesRef.current = [];

    if (process.env.NODE_ENV === 'development') {
      logger.log(`[Performance] Component ${componentName} mounted`);
    }

    return () => {
      const totalTime = performance.now() - mountTimeRef.current;
      
      if (process.env.NODE_ENV === 'development') {
        logger.log(`[Performance] Component ${componentName} unmounted after ${totalTime.toFixed(2)}ms`);
        logger.log(`[Performance] Total renders: ${renderCountRef.current}`);
        logger.log(`[Performance] Average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
        
        if (renderCountRef.current > thresholds.maxReRenders) {
          logger.warn(`[Performance Warning] ${componentName} rendered ${renderCountRef.current} times (threshold: ${thresholds.maxReRenders})`);
        }
      }
    };
  }, [componentName, thresholds.maxReRenders, metrics.averageRenderTime]);

  // Track render performance
  useEffect(() => {
    const renderStartTime = performance.now();
    renderCountRef.current += 1;
    lastRenderTimeRef.current = renderStartTime;

    // Calculate render time
    const renderTime = performance.now() - renderStartTime;
    renderTimesRef.current.push(renderTime);

    // Keep only last 20 render times for average calculation
    if (renderTimesRef.current.length > 20) {
      renderTimesRef.current = renderTimesRef.current.slice(-20);
    }

    const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;

    // Get memory usage if available
    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      componentMountTime: performance.now() - mountTimeRef.current,
      memoryUsage,
      reRenderCount: renderCountRef.current,
      lastRenderTime: renderStartTime,
      averageRenderTime,
    };

    setMetrics(newMetrics);

    // Performance warnings
    if (process.env.NODE_ENV === 'development') {
      if (renderTime > thresholds.slowRender) {
        logger.warn(`[Performance Warning] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);
      }

      if (memoryUsage > thresholds.highMemory) {
        logger.warn(`[Performance Warning] ${componentName} high memory usage: ${memoryUsage.toFixed(2)}MB`);
      }

      if (renderCountRef.current > thresholds.maxReRenders) {
        logger.warn(`[Performance Warning] ${componentName} excessive re-renders: ${renderCountRef.current}`);
      }
    }
  });

  // Monitor store subscription performance
  const monitorStoreSubscription = (storeName: string, actionName: string, startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
      if (duration > 10) { // 10ms threshold for store operations
        logger.warn(`[Store Performance] ${storeName}.${actionName} took ${duration.toFixed(2)}ms`);
      }
    }

    return duration;
  };

  // Monitor API call performance
  const monitorApiCall = async (apiName: string, apiCall: () => Promise<any>) => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      if (process.env.NODE_ENV === 'development') {
        if (duration > 1000) { // 1 second threshold for API calls
          logger.warn(`[API Performance] ${apiName} took ${duration.toFixed(2)}ms`);
        }
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`[API Error] ${apiName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };

  // Get performance summary
  const getPerformanceSummary = () => {
    const isSlowRendering = metrics.averageRenderTime > thresholds.slowRender;
    const isHighMemory = metrics.memoryUsage > thresholds.highMemory;
    const isExcessiveRerenders = metrics.reRenderCount > thresholds.maxReRenders;

    return {
      ...metrics,
      warnings: {
        slowRendering: isSlowRendering,
        highMemory: isHighMemory,
        excessiveRerenders: isExcessiveRerenders,
      },
      performanceScore: Math.max(0, 100 - 
        (isSlowRendering ? 20 : 0) - 
        (isHighMemory ? 30 : 0) - 
        (isExcessiveRerenders ? 25 : 0)
      ),
    };
  };

  return {
    metrics,
    monitorStoreSubscription,
    monitorApiCall,
    getPerformanceSummary,
  };
};

// Global performance monitor for the entire app
export const useGlobalPerformanceMonitor = () => {
  const [globalMetrics, setGlobalMetrics] = useState({
    totalComponents: 0,
    activeSubscriptions: 0,
    memoryUsage: 0,
    slowComponents: [] as string[],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

        setGlobalMetrics(prev => ({
          ...prev,
          memoryUsage,
        }));

        if (process.env.NODE_ENV === 'development' && memoryUsage > 100) {
          logger.warn('[Global Performance] High memory usage detected:', {
            used: `${memoryUsage.toFixed(2)}MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return globalMetrics;
};