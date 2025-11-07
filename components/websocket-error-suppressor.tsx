'use client';

import { useEffect } from 'react';

/**
 * Client component to suppress WebSocket errors in console
 * These errors are expected and handled by our fallback mechanisms
 */
export function WebSocketErrorSuppressor() {
  useEffect(() => {
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Filter out WebSocket errors
    const filteredError = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      // Suppress WebSocket connection errors
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('realtime') ||
        message.includes('wss://') ||
        message.includes('ws://') ||
        message.includes('disconnect')
      ) {
        // Completely suppress - these are handled by our hooks
        return;
      }

      // Allow other errors through
      originalConsoleError.apply(console, args);
    };

    const filteredWarn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      // Suppress WebSocket warnings
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('realtime') ||
        message.includes('wss://') ||
        message.includes('ws://')
      ) {
        // Suppress WebSocket warnings
        return;
      }

      // Allow other warnings through
      originalConsoleWarn.apply(console, args);
    };

    // Override console methods
    console.error = filteredError;
    console.warn = filteredWarn;

    // Suppress unhandled WebSocket errors
    const errorHandler = (event: ErrorEvent) => {
      const message = event.message || '';
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('realtime') ||
        message.includes('wss://') ||
        message.includes('ws://')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Suppress unhandled promise rejections from WebSocket
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      if (
        reason.includes('WebSocket') ||
        reason.includes('websocket') ||
        reason.includes('realtime') ||
        reason.includes('wss://') ||
        reason.includes('ws://')
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  return null; // This component doesn't render anything
}

