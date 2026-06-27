import { Role } from '../util/jwt.service';

declare module 'socket.io' {
    interface Socket {
        tokenId: string;
        role: Role;
        userId: string;
        audience: 'web' | 'mobile';
    }
}