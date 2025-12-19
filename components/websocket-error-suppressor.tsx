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
      const fullMessage = args.map(a => String(a)).join(' ');
      
      // Suppress WebSocket connection errors and related network errors
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('realtime') ||
        message.includes('wss://') ||
        message.includes('ws://') ||
        message.includes('disconnect') ||
        fullMessage.includes('WebSocket') ||
        fullMessage.includes('realtime/v1/websocket') ||
        fullMessage.includes('closed before the connection is established') ||
        fullMessage.includes('supabase.co/realtime') ||
        fullMessage.includes('/realtime/') ||
        (fullMessage.includes('Failed to load resource') && fullMessage.includes('realtime')) ||
        (fullMessage.includes('400') && fullMessage.includes('complete') && fullMessage.includes('realtime')) ||
        // Suppress 401 Unauthorized errors from /api/auth/me when user is not logged in (expected behavior)
        (fullMessage.includes('Failed to load resource') && fullMessage.includes('401') && fullMessage.includes('me')) ||
        (fullMessage.includes('401') && (fullMessage.includes('Unauthorized') || fullMessage.includes('me'))) ||
        // Suppress Next.js React 19 sync dynamic API dev warnings for params/searchParams spam
        fullMessage.includes('params are being enumerated. `params` should be unwrapped with `React.use()`') ||
        fullMessage.includes('The keys of `searchParams` were accessed directly. `searchParams` should be unwrapped with `React.use()`')
      ) {
        // Completely suppress - these are handled by our hooks or are expected when user is not authenticated
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

    // Suppress unhandled WebSocket errors and auth errors
    const errorHandler = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';
      const errorString = `${message} ${filename}`;
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('realtime') ||
        message.includes('wss://') ||
        message.includes('ws://') ||
        message.includes('closed before the connection is established') ||
        errorString.includes('realtime/v1/websocket') ||
        errorString.includes('supabase.co/realtime') ||
        // Suppress 401 errors from auth endpoints (expected when not logged in)
        (errorString.includes('401') && (errorString.includes('me') || errorString.includes('auth')))
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Suppress unhandled promise rejections from WebSocket and auth errors
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      if (
        reason.includes('WebSocket') ||
        reason.includes('websocket') ||
        reason.includes('realtime') ||
        reason.includes('wss://') ||
        reason.includes('ws://') ||
        reason.includes('closed before the connection is established') ||
        reason.includes('realtime/v1/websocket') ||
        reason.includes('supabase.co/realtime') ||
        // Suppress 401 errors from auth endpoints (expected when not logged in)
        (reason.includes('401') && (reason.includes('Unauthorized') || reason.includes('me')))
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

