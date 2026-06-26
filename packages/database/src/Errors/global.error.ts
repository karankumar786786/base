/**
 * BaseError — the root of all custom errors in the database layer.
 *
 * Every custom error carries:
 *   - message    : a human-readable description
 *   - statusCode : an HTTP-friendly status code (default 500)
 *   - cause      : the original error that triggered this one (optional)
 *
 * The `name` property is set automatically to the class name,
 * so `instanceof` checks and stack traces show the correct error type.
 */
export class BaseError extends Error {
    public readonly statusCode: number;

    constructor(
        message: string,
        statusCode: number = 500,
        cause?: unknown
    ) {
        super(message);
        this.name = this.constructor.name; // e.g. "NotFoundError", "ValidationError"
        this.statusCode = statusCode;

        // preserve the original error for debugging
        if (cause) {
            this.cause = cause;
        }

        // fix the prototype chain so `instanceof` works correctly
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

// ─── GENERIC REPOSITORY ERRORS ──────────────────────────────

/** Thrown when a record is not found in the database. */
export class NotFoundError extends BaseError {
    constructor(entity: string, id?: string) {
        const message = id
            ? `${entity} with id "${id}" not found`
            : `${entity} not found`;
        super(message, 404);
    }
}

/** Thrown when input data fails Zod validation. */
export class ValidationError extends BaseError {
    public readonly errors: unknown;

    constructor(entity: string, errors?: unknown) {
        super(`Validation failed for ${entity}`, 400);
        this.errors = errors;
    }
}

/** Thrown when a database query fails unexpectedly. */
export class DatabaseError extends BaseError {
    constructor(operation: string, entity: string, cause?: unknown) {
        super(`Database error during ${operation} on ${entity}`, 500, cause);
    }
}

/** Thrown when an insert/update violates a unique constraint. */
export class DuplicateError extends BaseError {
    constructor(entity: string, field?: string) {
        const message = field
            ? `${entity} with duplicate ${field} already exists`
            : `Duplicate ${entity} already exists`;
        super(message, 409);
    }
}

/** Thrown when an operation is not allowed. */
export class ForbiddenError extends BaseError {
    constructor(message: string = 'Operation not allowed') {
        super(message, 403);
    }
}