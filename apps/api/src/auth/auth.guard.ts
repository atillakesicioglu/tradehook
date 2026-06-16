import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { loadConfig } from '../config/configuration';
import { FirebaseService } from './firebase.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly firebase: FirebaseService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const config = loadConfig();
    const user = config.devMockAuth
      ? await this.resolveDevUser(token)
      : await this.resolveFirebaseUser(token);

    (req as Request & { user: unknown }).user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [type, value] = header.split(' ');
    return type === 'Bearer' && value ? value : null;
  }

  private async resolveDevUser(token: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async resolveFirebaseUser(token: string) {
    const fb = await this.firebase.verifyIdToken(token);
    return this.users.ensureFromFirebase(fb);
  }
}
