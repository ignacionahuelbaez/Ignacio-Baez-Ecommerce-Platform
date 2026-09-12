import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from './roles.decorator';

// Must run after JwtAuthGuard/GqlAuthGuard so `request.user` is already populated.
// Works for both REST and GraphQL, mirroring the GqlAuthGuard request-extraction pattern.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = this.getRequest(context);
    const user = request?.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role to access this resource');
    }

    return true;
  }

  private getRequest(context: ExecutionContext) {
    const gqlReq = GqlExecutionContext.create(context).getContext()?.req;
    return gqlReq ?? context.switchToHttp().getRequest();
  }
}
