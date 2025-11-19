"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logServiceStart = logServiceStart;
exports.logServiceShutdown = logServiceShutdown;
exports.logDatabaseOperation = logDatabaseOperation;
exports.logApiRequest = logApiRequest;
exports.logBusinessOperation = logBusinessOperation;
exports.logExternalCall = logExternalCall;
exports.logPerformance = logPerformance;
exports.logSecurityEvent = logSecurityEvent;
exports.logError = logError;
exports.logValidationError = logValidationError;
const logger_1 = __importDefault(require("./logger"));
/**
 * Logger utility functions for consistent logging across the application
 */
/**
 * Log service start/initialization
 */
function logServiceStart(serviceName, details) {
    logger_1.default.info(`[${serviceName}] Service started`, details);
}
/**
 * Log service shutdown
 */
function logServiceShutdown(serviceName, details) {
    logger_1.default.info(`[${serviceName}] Service shutting down`, details);
}
/**
 * Log database operations
 */
function logDatabaseOperation(operation, table, details) {
    logger_1.default.debug(`[Database] ${operation} on ${table}`, details);
}
/**
 * Log API requests with context
 */
function logApiRequest(method, endpoint, userId, details) {
    logger_1.default.info(`[API] ${method} ${endpoint}`, { userId, ...details });
}
/**
 * Log business logic operations
 */
function logBusinessOperation(operation, context) {
    logger_1.default.info(`[Business] ${operation}`, context);
}
/**
 * Log external service calls
 */
function logExternalCall(service, operation, details) {
    logger_1.default.info(`[External] ${service} - ${operation}`, details);
}
/**
 * Log performance metrics
 */
function logPerformance(operation, duration, details) {
    logger_1.default.info(`[Performance] ${operation} completed in ${duration}ms`, details);
}
/**
 * Log security events
 */
function logSecurityEvent(event, details) {
    logger_1.default.warn(`[Security] ${event}`, details);
}
/**
 * Log errors with context
 */
function logError(context, error, details) {
    logger_1.default.error(`[Error] ${context}: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        ...details
    });
}
/**
 * Log validation errors
 */
function logValidationError(field, value, reason) {
    logger_1.default.warn(`[Validation] Invalid ${field}: ${reason}`, { field, value, reason });
}
