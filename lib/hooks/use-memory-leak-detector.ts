import { useEffect, useRef } from 'react';

interface MemoryLeakDetection {
  activeSubscriptions: Set<string>;
  activeIntervals: Set<number>;
  activeTimeouts: Set<number>;
  componentInstances: Set<string>;
}

export const useMemoryLeakDetector = (componentName: string) => {
  const detectionRef = useRef<MemoryLeakDetection>({
    activeSubscriptions: new Set(),
    activeIntervals: new Set(),
    activeTimeouts: new Set(),
    componentInstances: new Set(),
  });

  useEffect(() => {
    const instanceId = `${componentName}-${Date.now()}`;
    detectionRef.current.componentInstances.add(instanceId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Component ${componentName} mounted (instance: ${instanceId})`);
    }

    return () => {
      detectionRef.current.componentInstances.delete(instanceId);
      
      // Check for potential memory leaks
      const { activeSubscriptions, activeIntervals, activeTimeouts } = detectionRef.current;
      
      if (activeSubscriptions.size > 0) {
        console.warn(`[Memory Leak] ${componentName} unmounted with ${activeSubscriptions.size} active subscriptions:`, 
          Array.from(activeSubscriptions));
      }
      
      if (activeIntervals.size > 0) {
        console.warn(`[Memory Leak] ${componentName} unmounted with ${activeIntervals.size} active intervals:`, 
          Array.from(activeIntervals));
      }
      
      if (activeTimeouts.size > 0) {
        console.warn(`[Memory Leak] ${componentName} unmounted with ${activeTimeouts.size} active timeouts:`, 
          Array.from(activeTimeouts));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Memory] Component ${componentName} unmounted (instance: ${instanceId})`);
      }
    };
  }, [componentName]);

  const trackSubscription = (subscriptionId: string) => {
    detectionRef.current.activeSubscriptions.add(subscriptionId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Subscription ${subscriptionId} created for ${componentName}`);
    }
  };

  const untrackSubscription = (subscriptionId: string) => {
    detectionRef.current.activeSubscriptions.delete(subscriptionId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Subscription ${subscriptionId} cleaned up for ${componentName}`);
    }
  };

  const trackInterval = (intervalId: number) => {
    detectionRef.current.activeIntervals.add(intervalId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Interval ${intervalId} created for ${componentName}`);
    }
  };

  const untrackInterval = (intervalId: number) => {
    detectionRef.current.activeIntervals.delete(intervalId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Interval ${intervalId} cleaned up for ${componentName}`);
    }
  };

  const trackTimeout = (timeoutId: number) => {
    detectionRef.current.activeTimeouts.add(timeoutId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Timeout ${timeoutId} created for ${componentName}`);
    }
  };

  const untrackTimeout = (timeoutId: number) => {
    detectionRef.current.activeTimeouts.delete(timeoutId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] Timeout ${timeoutId} cleaned up for ${componentName}`);
    }
  };

  return {
    trackSubscription,
    untrackSubscription,
    trackInterval,
    untrackInterval,
    trackTimeout,
    untrackTimeout,
    getActiveCounts: () => ({
      subscriptions: detectionRef.current.activeSubscriptions.size,
      intervals: detectionRef.current.activeIntervals.size,
      timeouts: detectionRef.current.activeTimeouts.size,
      components: detectionRef.current.componentInstances.size,
    }),
  };
};

// Global memory leak detector for the entire app
let globalMemoryLeakDetector: {
  activeComponents: Set<string>;
  activeSubscriptions: Set<string>;
  totalMemoryUsage: number;
} = {
  activeComponents: new Set(),
  activeSubscriptions: new Set(),
  totalMemoryUsage: 0,
};

export const useGlobalMemoryLeakDetector = () => {
  useEffect(() => {
    // Monitor global memory usage every 30 seconds
    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        globalMemoryLeakDetector.totalMemoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Global Memory]', {
            used: `${globalMemoryLeakDetector.totalMemoryUsage.toFixed(2)}MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
            components: globalMemoryLeakDetector.activeComponents.size,
            subscriptions: globalMemoryLeakDetector.activeSubscriptions.size,
          });
          
          // Warning if memory usage is high
          if (globalMemoryLeakDetector.totalMemoryUsage > 100) {
            console.warn('[Memory Warning] High memory usage detected!', {
              usage: `${globalMemoryLeakDetector.totalMemoryUsage.toFixed(2)}MB`,
              components: Array.from(globalMemoryLeakDetector.activeComponents),
            });
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return globalMemoryLeakDetector;
};
