// Feedback utility for barcode scanning operations
// Provides audio, vibration, and visual feedback

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackOptions {
  sound?: boolean;
  vibration?: boolean;
  visual?: boolean;
}

// Default options
const defaultOptions: FeedbackOptions = {
  sound: true,
  vibration: true,
  visual: true,
};

// Audio context for generating beep sounds
let audioContext: AudioContext | null = null;

// Initialize audio context (lazy loading)
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
};

// Generate beep sound
const playBeep = (frequency: number, duration: number, volume: number = 0.3) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Error playing beep:', e);
  }
};

// Vibration patterns
const vibrationPatterns = {
  success: [50], // Single short vibration
  error: [100, 50, 100], // Two vibrations with pause
  warning: [50, 50, 50], // Two quick vibrations
  info: [30], // Very short vibration
  transfer: [50, 30, 50, 30, 50], // Triple vibration for success
};

// Trigger device vibration
const triggerVibration = (pattern: number[]) => {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn('Vibration not supported:', e);
  }
};

// Visual flash effect
const createFlash = (color: string, duration: number = 200) => {
  if (typeof document === 'undefined') return;

  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.top = '0';
  flash.style.left = '0';
  flash.style.width = '100vw';
  flash.style.height = '100vh';
  flash.style.backgroundColor = color;
  flash.style.opacity = '0.3';
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '9999';
  flash.style.transition = `opacity ${duration}ms ease-out`;

  document.body.appendChild(flash);

  // Trigger reflow
  flash.offsetHeight;

  // Fade out
  flash.style.opacity = '0';

  setTimeout(() => {
    document.body.removeChild(flash);
  }, duration);
};

// Main feedback function
export const provideFeedback = (
  type: FeedbackType,
  options: FeedbackOptions = defaultOptions
) => {
  const opts = { ...defaultOptions, ...options };

  switch (type) {
    case 'success':
      if (opts.sound) {
        // Success: High-pitched pleasant beep
        playBeep(800, 0.15, 0.3);
      }
      if (opts.vibration) {
        triggerVibration(vibrationPatterns.success);
      }
      if (opts.visual) {
        createFlash('rgba(34, 197, 94, 0.3)', 200); // Green flash
      }
      break;

    case 'error':
      if (opts.sound) {
        // Error: Low-pitched double beep
        playBeep(300, 0.1, 0.3);
        setTimeout(() => playBeep(250, 0.1, 0.3), 120);
      }
      if (opts.vibration) {
        triggerVibration(vibrationPatterns.error);
      }
      if (opts.visual) {
        createFlash('rgba(239, 68, 68, 0.3)', 300); // Red flash
      }
      break;

    case 'warning':
      if (opts.sound) {
        // Warning: Medium-pitched quick beep
        playBeep(600, 0.1, 0.25);
      }
      if (opts.vibration) {
        triggerVibration(vibrationPatterns.warning);
      }
      if (opts.visual) {
        createFlash('rgba(251, 146, 60, 0.3)', 200); // Orange flash
      }
      break;

    case 'info':
      if (opts.sound) {
        // Info: Soft high beep
        playBeep(1000, 0.08, 0.2);
      }
      if (opts.vibration) {
        triggerVibration(vibrationPatterns.info);
      }
      if (opts.visual) {
        createFlash('rgba(59, 130, 246, 0.3)', 150); // Blue flash
      }
      break;
  }
};

// Specific feedback functions for common operations
export const scanSuccess = (options?: FeedbackOptions) => {
  provideFeedback('success', options);
};

export const scanError = (options?: FeedbackOptions) => {
  provideFeedback('error', options);
};

export const transferSuccess = (options?: FeedbackOptions) => {
  // Special feedback for successful transfer
  const opts = { ...defaultOptions, ...options };

  if (opts.sound) {
    // Success melody: ascending notes
    playBeep(600, 0.1, 0.25);
    setTimeout(() => playBeep(800, 0.1, 0.25), 100);
    setTimeout(() => playBeep(1000, 0.15, 0.3), 200);
  }
  if (opts.vibration) {
    triggerVibration(vibrationPatterns.transfer);
  }
  if (opts.visual) {
    createFlash('rgba(34, 197, 94, 0.4)', 300); // Brighter green flash
  }
};

export const stockUpdateSuccess = (options?: FeedbackOptions) => {
  provideFeedback('success', options);
};

// Utility to check if feedback is supported
export const isFeedbackSupported = () => {
  if (typeof window === 'undefined') return false;

  return {
    audio: !!(window.AudioContext || (window as any).webkitAudioContext),
    vibration: 'vibrate' in navigator,
  };
};

// Enable/disable feedback globally
let feedbackEnabled = true;

export const setFeedbackEnabled = (enabled: boolean) => {
  feedbackEnabled = enabled;
};

export const isFeedbackEnabled = () => feedbackEnabled;

// Wrapper that checks if feedback is enabled
export const provideFeedbackIfEnabled = (
  type: FeedbackType,
  options?: FeedbackOptions
) => {
  if (feedbackEnabled) {
    provideFeedback(type, options);
  }
};
