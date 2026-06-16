import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadConfig } from '../config/configuration';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { FirebaseService } from './firebase.service';
import { UsersModule } from '../users/users.module';

const config = loadConfig();

@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: config.jwtSecret,
      signOptions: { expiresIn: config.jwtExpiresIn as `${number}` },
    }),
  ],
  providers: [AuthService, AuthGuard, FirebaseService],
  controllers: [AuthController],
  exports: [AuthGuard, FirebaseService, JwtModule],
})
export class AuthModule {}
