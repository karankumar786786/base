import { Role } from '../util/jwt.service';

/**
 * Extends Express Request with custom properties set by AuthGuard.
 */
declare global {
    namespace Express {
        interface Request {
            userId: string;
            user: Record<string, unknown>;
            role: Role;
            tokenId: string;
            audience: 'web' | 'mobile';
        }
    }
}
