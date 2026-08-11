import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@/database/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GoogleOidcService } from './google-oidc.service';
import { GithubOAuthService } from './github-oauth.service';
import { AuditLogService } from './audit-log.service';
import { TokenCleanupService } from './tokencleanup.service';
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
          throw new Error('JWT_SECRET is required');
        }

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  providers: [AuthService,
     JwtStrategy, GithubOAuthService,
      GoogleOidcService , JwtAuthGuard,
       RolesGuard, AuditLogService,  TokenCleanupService,],
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}