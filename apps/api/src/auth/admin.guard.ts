import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { isAdminEmail } from './admin.util';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?.email || !isAdminEmail(user.email)) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
