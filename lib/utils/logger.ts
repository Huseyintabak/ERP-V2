import { logger } from '@/lib/utils/logger';

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error: (...args: any[]) => isDev && logger.error(...args),
  warn: (...args: any[]) => isDev && logger.warn(...args),
  info: (...args: any[]) => isDev && logger.info(...args),
  log: (...args: any[]) => isDev && logger.log(...args),
};

