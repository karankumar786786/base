import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get(Roles, context.getHandler());
        if (!roles || roles.length === 0) {
            return true;
        }

        const req = context.switchToHttp().getRequest();
        const userRole = req.role;

        if (!roles.includes(userRole)) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
