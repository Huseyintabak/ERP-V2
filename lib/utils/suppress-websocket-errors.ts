/**
 * Suppress WebSocket connection errors in console
 * These errors are expected and handled by our fallback mechanisms
 */
export function suppressWebSocketErrors() {
  if (typeof window === 'undefined') return;

  // Store original console.error
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Filter out WebSocket errors
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    // Suppress WebSocket connection errors
    if (
      message.includes('WebSocket') ||
      message.includes('websocket') ||
      message.includes('realtime') ||
      message.includes('wss://') ||
      message.includes('ws://')
    ) {
      // Only log in development mode for debugging
      if (process.env.NODE_ENV === 'development') {
        // Log silently without showing in console
        return;
      }
      // In production, completely suppress
      return;
    }

    // Allow other errors through
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    // Suppress WebSocket warnings
    if (
      message.includes('WebSocket') ||
      message.includes('websocket') ||
      message.includes('realtime') ||
      message.includes('wss://') ||
      message.includes('ws://')
    ) {
      // Suppress in production, allow in development for debugging
      if (process.env.NODE_ENV === 'production') {
        return;
      }
    }

    // Allow other warnings through
    originalConsoleWarn.apply(console, args);
  };

  // Also suppress unhandled WebSocket errors
  window.addEventListener('error', (event) => {
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
  }, true);

  // Suppress unhandled promise rejections from WebSocket
  window.addEventListener('unhandledrejection', (event) => {
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
  });
}

