/**
 * Logging utility for API calls and errors
 */

export interface APICallLog {
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  context?: Record<string, any>;
}

/**
 * Log an API call with context
 */
export function logAPICall(log: APICallLog): void {
  const timestamp = new Date().toISOString();
  const { method, path, statusCode, duration, error, context } = log;

  if (error) {
    console.error(`[${timestamp}] ${method} ${path} - ERROR`, {
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      error,
      context
    });
  } else if (duration && duration > 1000) {
    console.warn(`[${timestamp}] ${method} ${path} - SLOW QUERY`, {
      statusCode,
      duration: `${duration}ms`,
      context
    });
  } else {
    console.log(`[${timestamp}] ${method} ${path}`, {
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      context
    });
  }
}

/**
 * Log a validation failure
 */
export function logValidationFailure(
  field: string,
  value: any,
  reason: string,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] VALIDATION FAILURE`, {
    field,
    value,
    reason,
    context
  });
}

/**
 * Log an error with stack trace
 */
export function logError(
  message: string,
  error: Error,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, {
    error: error.message,
    stack: error.stack,
    context
  });
}

/**
 * Log a slow query
 */
export function logSlowQuery(
  query: string,
  duration: number,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] SLOW QUERY (${duration}ms)`, {
    query,
    duration: `${duration}ms`,
    context
  });
}

/**
 * Log cache hit/miss
 */
export function logCacheEvent(
  event: 'HIT' | 'MISS' | 'SET' | 'INVALIDATE',
  key: string,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] CACHE ${event}`, {
    key,
    context
  });
}

/**
 * Log a service operation
 */
export function logServiceOperation(
  service: string,
  operation: string,
  success: boolean,
  duration?: number,
  context?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILURE';
  
  if (!success) {
    console.error(`[${timestamp}] ${service}.${operation} - ${status}`, {
      duration: duration ? `${duration}ms` : undefined,
      context
    });
  } else if (duration && duration > 1000) {
    console.warn(`[${timestamp}] ${service}.${operation} - ${status} (SLOW)`, {
      duration: `${duration}ms`,
      context
    });
  } else {
    console.log(`[${timestamp}] ${service}.${operation} - ${status}`, {
      duration: duration ? `${duration}ms` : undefined,
      context
    });
  }
}

/**
 * Logger object with standard logging methods
 * Compatible with existing code that uses logger.info(), logger.error(), etc.
 */
const logger = {
  info: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, context || {});
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, context || {});
  },
  
  error: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, context || {});
  },
  
  debug: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] DEBUG: ${message}`, context || {});
  }
};

// Export as default for compatibility with existing imports
export default logger;

