import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../util/jwt.service';
import { blackListTokenCache, tokenPayloadSchema } from 'src/auth/auth.service';
import { HmacService } from 'src/util/hmac.service';
import { CacheService } from 'src/cache/cache.service';
import { InvalidTokenException } from 'src/filtures/invalidTokenException.filter';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly hmacService:HmacService,
        private readonly cacheService:CacheService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const header = req.headers['authorization'];

        if (!header || !header.startsWith('Bearer ')) {
            throw new UnauthorizedException('Unauthorized request');
        }

        const parts = header.split(' ');
        if (parts.length !== 2) {
            throw new UnauthorizedException('Invalid token format');
        }

        const accessToken = parts[1];
        const decoded = await this.jwtService.verify<typeof tokenPayloadSchema>(
            accessToken,
            tokenPayloadSchema,
            'accessToken',
        );
        await this.hmacService.verifyId(decoded.subject);
        const data = await this.cacheService.get<blackListTokenCache>(`blacklistToken:${decoded.jti}`);
        if(data){
            throw new InvalidTokenException;
        }
        req.tokenId = decoded.jti;
        req.role = decoded.role;
        req.userId = decoded.subject;
        req.audience = decoded.audience;

        return true;
    }
}
