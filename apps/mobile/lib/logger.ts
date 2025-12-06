/**
 * Logger Utility
 *
 * Centralized logging with categories and levels.
 * In production, these can be configured to send to a service
 * or be disabled entirely.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  minLevel: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configure based on environment
const config: LogConfig = {
  enabled: __DEV__,
  minLevel: 'debug',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatMessage(category: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const prefix = `[${timestamp}] [${category}]`;
  if (data !== undefined) {
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: string) {
  return {
    debug(message: string, data?: unknown) {
      if (shouldLog('debug')) {
        console.debug(formatMessage(category, message), data !== undefined ? data : '');
      }
    },
    info(message: string, data?: unknown) {
      if (shouldLog('info')) {
        console.info(formatMessage(category, message), data !== undefined ? data : '');
      }
    },
    warn(message: string, data?: unknown) {
      if (shouldLog('warn')) {
        console.warn(formatMessage(category, message), data !== undefined ? data : '');
      }
    },
    error(message: string, error?: unknown) {
      if (shouldLog('error')) {
        console.error(formatMessage(category, message), error !== undefined ? error : '');
      }
    },
  };
}

// Pre-configured loggers for common categories
export const cacheLogger = createLogger('Cache');
export const realtimeLogger = createLogger('Realtime');
export const dataLogger = createLogger('Data');
export const authLogger = createLogger('Auth');
