const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error: (...args: any[]) => isDev && console.error(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  info: (...args: any[]) => isDev && console.info(...args),
  log: (...args: any[]) => isDev && console.log(...args),
};

