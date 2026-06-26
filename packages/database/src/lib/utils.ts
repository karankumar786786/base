/**
 * Zod v4 validation errors carry an `issues` array but ZodError is
 * a `$constructor`, not a real ES class — so `instanceof` doesn't work.
 *
 * This helper uses duck-typing to detect Zod validation errors safely.
 */
export function isZodError(error: unknown): error is { issues: unknown[] } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'issues' in error &&
        Array.isArray((error as any).issues)
    );
}

/**
 * Detects a unique-constraint violation across the common drivers
 * Drizzle can sit on top of:
 *   - Postgres (pg / postgres-js / neon):  error.code === '23505'
 *   - MySQL (mysql2):                      error.code === 'ER_DUP_ENTRY' (errno 1062)
 *   - SQLite (better-sqlite3 / libsql):     message contains 'UNIQUE constraint failed'
 */
export function isUniqueConstraintError(
    error: unknown
): error is { code?: string; errno?: number; constraint?: string; message?: string } {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as { code?: string; errno?: number; message?: string };

    if (err.code === '23505') return true; // Postgres
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) return true; // MySQL
    if (typeof err.message === 'string' && err.message.includes('UNIQUE constraint failed')) {
        return true; // SQLite
    }
    return false;
}

/**
 * Best-effort extraction of the offending field/constraint name from a
 * unique-constraint violation, for a more useful DuplicateError message.
 * Returns undefined if the driver doesn't expose one — callers should
 * handle that gracefully (DuplicateError already does).
 */
export function extractDuplicateField(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const err = error as { constraint?: string; message?: string };

    if (err.constraint) return err.constraint; // Postgres exposes this directly

    // SQLite: "UNIQUE constraint failed: users.email"
    const match = typeof err.message === 'string'
        ? err.message.match(/UNIQUE constraint failed: \w+\.(\w+)/)
        : null;
    return match?.[1];
}

/**
 * Detects transient/connection-level errors worth retrying, as opposed to
 * errors that will fail again no matter how many times we retry (bad input,
 * not-found, duplicate key, etc). Used to gate executeWithRetry so retries
 * aren't wasted — or risky — on errors that aren't actually transient.
 */
export function isTransientError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as { code?: string; message?: string };

    const transientCodes = new Set([
        'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN',
        '57P01', // Postgres: admin_shutdown
        '57P02', // Postgres: crash_shutdown
        '57P03', // Postgres: cannot_connect_now
        '08006', // Postgres: connection_failure
        '08001', // Postgres: sqlclient_unable_to_establish_sqlconnection
    ]);

    if (err.code && transientCodes.has(err.code)) return true;

    if (typeof err.message === 'string') {
        const msg = err.message.toLowerCase();
        if (
            msg.includes('connection terminated') ||
            msg.includes('connection timeout') ||
            msg.includes('connection refused') ||
            msg.includes('server closed the connection')
        ) {
            return true;
        }
    }

    return false;
}