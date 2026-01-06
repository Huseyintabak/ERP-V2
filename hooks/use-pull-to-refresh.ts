'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchCurrentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;

      touchCurrentY = e.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;

      // Only allow pull down when at top
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault();
        setIsPulling(true);

        // Apply resistance
        const resistedDistance = Math.min(
          deltaY / resistance,
          maxPullDistance
        );

        setPullDistance(resistedDistance);
        currentY.current = touchCurrentY;
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, maxPullDistance, resistance, isRefreshing, pullDistance]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldRefresh = pullDistance >= threshold;

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh,
  };
}
