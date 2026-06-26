import {
    NotFoundError,
    ValidationError,
    DatabaseError,
    DuplicateError,
} from './global.error.js';

// ─── USER-SPECIFIC ERRORS ───────────────────────────────────
// Extend the generic errors with user-specific context and messages.

/** Thrown when a user record is not found. */
export class UserNotFoundError extends NotFoundError {
    constructor(id?: string) {
        super('User', id);
    }
}

/** Thrown when user input fails validation. */
export class UserValidationError extends ValidationError {
    constructor(errors?: unknown) {
        super('User', errors);
    }
}

/** Thrown when a database operation on users fails. */
export class UserDatabaseError extends DatabaseError {
    constructor(operation: string, cause?: unknown) {
        super(operation, 'User', cause);
    }
}

/** Thrown when a user already exists (duplicate email, etc.). */
export class UserDuplicateError extends DuplicateError {
    constructor(field: string = 'email') {
        super('User', field);
    }
}

/** Thrown when creating a user fails (wraps validation + db errors). */
export class UserCreateError extends DatabaseError {
    constructor(cause?: unknown) {
        super('create', 'User', cause);
    }
}

/** Thrown when updating a user fails. */
export class UserUpdateError extends DatabaseError {
    constructor(cause?: unknown) {
        super('update', 'User', cause);
    }
}

/** Thrown when deleting a user fails. */
export class UserDeleteError extends DatabaseError {
    constructor(cause?: unknown) {
        super('delete', 'User', cause);
    }
}
