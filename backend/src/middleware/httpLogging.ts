import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log the incoming request
  logger.http(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Listen to the finish event to log the response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.http(`${req.method} ${req.url} - ${res.statusCode}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}