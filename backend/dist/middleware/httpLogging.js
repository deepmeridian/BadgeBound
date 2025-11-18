"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLoggingMiddleware = httpLoggingMiddleware;
const logger_1 = __importDefault(require("../config/logger"));
function httpLoggingMiddleware(req, res, next) {
    const startTime = Date.now();
    // Log the incoming request
    logger_1.default.http(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    // Listen to the finish event to log the response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger_1.default.http(`${req.method} ${req.url} - ${res.statusCode}`, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    next();
}
