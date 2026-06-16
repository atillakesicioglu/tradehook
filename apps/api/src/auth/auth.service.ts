import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { loadConfig } from '../config/configuration';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private assertDevMode() {
    if (!loadConfig().devMockAuth) {
      throw new BadRequestException(
        'Dev auth is disabled. Authenticate through Firebase instead.',
      );
    }
  }

  async register(dto: RegisterDto) {
    this.assertDevMode();
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.createDevUser({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    return this.issueToken(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    this.assertDevMode();
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return this.issueToken(user.id, user.email, user.name);
  }

  private async issueToken(id: string, email: string, name: string | null) {
    const accessToken = await this.jwt.signAsync({ sub: id, email });
    return {
      accessToken,
      user: { id, email, name },
    };
  }
}
