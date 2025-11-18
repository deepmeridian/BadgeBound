import logger from './logger';

/**
 * Logger utility functions for consistent logging across the application
 */

/**
 * Log service start/initialization
 */
export function logServiceStart(serviceName: string, details?: any) {
  logger.info(`[${serviceName}] Service started`, details);
}

/**
 * Log service shutdown
 */
export function logServiceShutdown(serviceName: string, details?: any) {
  logger.info(`[${serviceName}] Service shutting down`, details);
}

/**
 * Log database operations
 */
export function logDatabaseOperation(operation: string, table: string, details?: any) {
  logger.debug(`[Database] ${operation} on ${table}`, details);
}

/**
 * Log API requests with context
 */
export function logApiRequest(method: string, endpoint: string, userId?: string, details?: any) {
  logger.info(`[API] ${method} ${endpoint}`, { userId, ...details });
}

/**
 * Log business logic operations
 */
export function logBusinessOperation(operation: string, context?: any) {
  logger.info(`[Business] ${operation}`, context);
}

/**
 * Log external service calls
 */
export function logExternalCall(service: string, operation: string, details?: any) {
  logger.info(`[External] ${service} - ${operation}`, details);
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, duration: number, details?: any) {
  logger.info(`[Performance] ${operation} completed in ${duration}ms`, details);
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, details?: any) {
  logger.warn(`[Security] ${event}`, details);
}

/**
 * Log errors with context
 */
export function logError(context: string, error: Error, details?: any) {
  logger.error(`[Error] ${context}: ${error.message}`, {
    error: error.message,
    stack: error.stack,
    ...details
  });
}

/**
 * Log validation errors
 */
export function logValidationError(field: string, value: any, reason: string) {
  logger.warn(`[Validation] Invalid ${field}: ${reason}`, { field, value, reason });
}