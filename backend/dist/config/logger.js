"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
// Tell winston that you want to link the colors
winston_1.default.addColors(colors);
// Choose the aspect of your log customizing the log format
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Define which transports the logger must use to print out messages
const transports = [
    // Allow the use the console to print the messages
    new winston_1.default.transports.Console(),
    // Allow to print all the error level messages inside the error.log file
    new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    // Allow to print all the error message inside the all.log file
    new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
];
// Create the logger instance that has to be exported 
// and used to log messages
const logger = winston_1.default.createLogger({
    level: env_1.config.nodeEnv === 'development' ? 'debug' : 'warn',
    levels,
    format,
    transports,
});
exports.default = logger;
