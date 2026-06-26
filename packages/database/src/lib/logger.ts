/**
 * Logger interface for the database layer.
 *
 * Swap the implementation for pino / winston / whatever in production.
 * This interface keeps the repository layer decoupled from any specific
 * logging library.
 */
export interface Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * A no-op logger that silently discards all messages.
 * Useful as a default so callers aren't forced to provide a logger.
 */
export const noopLogger: Logger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
};

/**
 * A simple console-based logger for development.
 * Prints structured output with timestamps.
 */
export const consoleLogger: Logger = {
    debug(message, meta) {
        console.debug(`[DEBUG] ${message}`, meta ?? '');
    },
    info(message, meta) {
        console.info(`[INFO]  ${message}`, meta ?? '');
    },
    warn(message, meta) {
        console.warn(`[WARN]  ${message}`, meta ?? '');
    },
    error(message, meta) {
        console.error(`[ERROR] ${message}`, meta ?? '');
    },
};

/**
 * Represents a generic external logger object with optional standard log levels
 * (e.g. NestJS Logger, Winston, Pino, Console, etc.).
 */
export interface ExternalLogger {
    debug?(message: any, ...optionalParams: any[]): any;
    info?(message: any, ...optionalParams: any[]): any;
    log?(message: any, ...optionalParams: any[]): any;
    warn?(message: any, ...optionalParams: any[]): any;
    error?(message: any, ...optionalParams: any[]): any;
}

/**
 * Adapter that maps database log calls to any compatible external logger.
 */
export class LoggerAdapter implements Logger {
    constructor(private readonly externalLogger: ExternalLogger) {}

    debug(message: string, meta?: Record<string, unknown>): void {
        const fn = this.externalLogger.debug || this.externalLogger.log;
        if (fn) fn.call(this.externalLogger, message, meta ?? '');
    }

    info(message: string, meta?: Record<string, unknown>): void {
        const fn = this.externalLogger.info || this.externalLogger.log;
        if (fn) fn.call(this.externalLogger, message, meta ?? '');
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        const fn = this.externalLogger.warn || this.externalLogger.log;
        if (fn) fn.call(this.externalLogger, message, meta ?? '');
    }

    error(message: string, meta?: Record<string, unknown>): void {
        const fn = this.externalLogger.error || this.externalLogger.log;
        if (fn) fn.call(this.externalLogger, message, meta ?? '');
    }
}