import {Injectable,UnauthorizedException,ConflictException, BadRequestException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@/generated/prisma/client';
import { PrismaService } from '@/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'node:crypto';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GithubProfile } from './github-oauth.service';
import { GoogleProfile } from './google-oidc.service';
import { AuditLogService } from './audit-log.service';

type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditLogService,
  ) {}

  private toUserResponse(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

 
  private async storeRefreshToken(
    client: PrismaService | Prisma.TransactionClient,
    userId: number,
  ) {
    const refreshToken = randomBytes(64).toString('hex'); // 128 chars
    const tokenId = refreshToken.slice(0, 16);              // lookup key
    const tokenSecret = refreshToken.slice(16);             // the secret to hash

    const hashedSecret = await bcrypt.hash(tokenSecret, 12);

    await client.refreshToken.create({
      data: {
        id: randomUUID(),
        tokenId,
        hashedSecret,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return refreshToken; // return the FULL token to the caller
  }

  private async issueTokenPair(
    client: PrismaService | Prisma.TransactionClient,
    user: AuthUser,
  ) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = await this.storeRefreshToken(client, user.id);
    return { accessToken, refreshToken };
  }

  // Fast lookup by tokenId (indexed), then ONE bcrypt.compare on the secret.
   // O(1) lookup instead of O(n) table scan.
   
  private async findMatchingRefreshToken(
    client: PrismaService | Prisma.TransactionClient,
    refreshToken: string,
    activeOnly = true,
  ) {
    const tokenId = refreshToken.slice(0, 16);
    const tokenSecret = refreshToken.slice(16);

    const token = await client.refreshToken.findUnique({
      where: { tokenId },
    });

    if (!token) return null;

    // If activeOnly, skip revoked/expired tokens
    if (activeOnly && (token.revoked || token.expiresAt <= new Date())) {
      return null;
    }

    const valid = await bcrypt.compare(tokenSecret, token.hashedSecret);
    if (!valid) return null;

    return token;
  }

  
   //Delete old revoked and expired tokens to keep the table small.
   //Call this periodically (e.g., on startup, via cron, or after logout).
   
  async cleanupOldTokens(): Promise<{ deleted: number }> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { revoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
    return { deleted: result.count };
  }

  async signUp(
    signUpDto: SignUpDto,
    ctx: { ip: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const { name, email, password } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await this.audit.log({
        event: 'LOGIN_FAILURE',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'email_already_exists', email },
      });
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'USER' },
    });

    const { accessToken, refreshToken } = await this.issueTokenPair(this.prisma, user);

    await this.audit.log({
      event: 'SIGNUP',
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email: user.email },
    });

    return { accessToken, refreshToken, user: this.toUserResponse(user) };
  }
  async login(
  loginDto: LoginDto,
  ctx: { ip: string; userAgent?: string },
): Promise<AuthResponse> {
  const { email, password } = loginDto;

  const user = await this.prisma.user.findUnique({ where: { email } });

  // ── LOCKOUT CHECK ──
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    await this.audit.log({
      event: 'LOGIN_FAILURE',
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { reason: 'account_locked', email, remainingMinutes: mins },
    });
    throw new UnauthorizedException(
      `Too many failed attempts. Account locked for ${mins} minute(s).`,
    );
  }

  if (!user || !user.password) {
    // TIMING ATTACK FIX: fake bcrypt to match real path duration
    const dummyHash = '$2a$12$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu';
    await bcrypt.compare(password, dummyHash);

    await this.audit.log({
      event: 'LOGIN_FAILURE',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { reason: 'invalid_credentials', email },
    });
    throw new UnauthorizedException('Invalid email or password');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);
  if (!isPasswordMatched) {
    await this.handleFailedLogin(user, email, ctx);
    throw new UnauthorizedException('Invalid email or password');
  }

  // ── SUCCESS: RESET LOCKOUT ──
  await this.prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
    },
  });

  const { accessToken, refreshToken } = await this.issueTokenPair(this.prisma, user);

  await this.audit.log({
    event: 'LOGIN_SUCCESS',
    userId: user.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { accessToken, refreshToken, user: this.toUserResponse(user) };
}

  async refresh(
    refreshDto: RefreshDto,
    ctx: { ip: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const matchedToken = await this.findMatchingRefreshToken(
      this.prisma,
      refreshDto.refreshToken,
    );

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: matchedToken.userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }


    return this.prisma.$transaction(async (tx) => {
    // 1 Only succeed if token is STILL active
    const revokeResult = await tx.refreshToken.updateMany({
      where: {
        id: matchedToken.id,
        revoked: false, 
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    // 2  If no rows were updated, someone else won
    if (revokeResult.count === 0) {
      throw new UnauthorizedException(
        'Refresh token already used. Please log in again.',
      );
    }

  
    const { accessToken, refreshToken } = await this.issueTokenPair(tx, user);

      await this.audit.log({
        event: 'TOKEN_REFRESH',
        userId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return { accessToken, refreshToken, user: this.toUserResponse(user) };
    });

   
    
  }

  async logout(
    refreshDto: RefreshDto,
    ctx: { ip: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const matchedToken = await this.findMatchingRefreshToken(
      this.prisma,
      refreshDto.refreshToken,
      false, // allow revoking already-expired tokens too
    );

    if (matchedToken) {
      await this.prisma.refreshToken.update({
        where: { id: matchedToken.id },
        data: { revoked: true, revokedAt: new Date() },
      });

      await this.audit.log({
        event: 'LOGOUT',
        userId: matchedToken.userId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }

    return { message: 'Logout successful' };
  }

  private async handleOAuthLogin(
    provider: string,
    profile: {
      providerUserId: string;
      email: string | null;
      emailVerified: boolean;
      name: string;
    },
    ctx: { ip: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingOAuthAccount) {
      const { accessToken, refreshToken } = await this.issueTokenPair(
        this.prisma,
        existingOAuthAccount.user,
      );

      await this.audit.log({
        event: `OAUTH_${provider.toUpperCase()}_SUCCESS` as any,
        userId: existingOAuthAccount.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { provider, providerUserId: profile.providerUserId, returning: true },
      });

      return {
        accessToken,
        refreshToken,
        user: this.toUserResponse(existingOAuthAccount.user),
      };
    }

    if (!profile.email || !profile.emailVerified) {
      await this.audit.log({
        event: `OAUTH_${provider.toUpperCase()}_FAILURE` as any,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { provider, reason: 'unverified_email' },
      });
      throw new BadRequestException(
        `Your ${provider} account needs a verified email address to sign in.`,
      );
    }

    const { user, linked } = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: profile.email! },
      });

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: profile.email!,
            name: profile.name,
            password: null,
            role: 'USER',
          },
        }));

      await tx.oAuthAccount.create({
        data: {
          id: randomUUID(),
          provider,
          providerUserId: profile.providerUserId,
          userId: user.id,
        },
      });

      return { user, linked: !!existingUser };
    });

    const { accessToken, refreshToken } = await this.issueTokenPair(this.prisma, user);

    await this.audit.log({
      event: `OAUTH_${provider.toUpperCase()}_SUCCESS` as any,
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { provider, providerUserId: profile.providerUserId, returning: false, linked },
    });

    return { accessToken, refreshToken, user: this.toUserResponse(user) };
  }

  async loginWithGithub(
    profile: GithubProfile,
    ctx: { ip: string; userAgent?: string },
  ): Promise<AuthResponse> {
    return this.handleOAuthLogin('github', profile, ctx);
  }

  async loginWithGoogle(
    profile: GoogleProfile,
    ctx: { ip: string; userAgent?: string },
  ): Promise<AuthResponse> {
    return this.handleOAuthLogin('google', profile, ctx);
  }

  


  private getLoginDelay(attempts: number): number {
    const delays = [0, 0 , 100, 300];
    return delays[Math.min(attempts, delays.length -1)];
  }

  private async handleFailedLogin(
    user:User,
    email: string,
    ctx: {ip: string; userAgent?: string},
  ){
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60*1000);
    const isNewWindow = !user.lastFailedLoginAt || user.lastFailedLoginAt < oneMinuteAgo;
    const attempts = isNewWindow ? 1 : user.failedLoginAttempts + 1 ;

    const lockedUntil = attempts >= 3 
    ? new Date(now.getTime() +15 *60*1000)
    : user.lockedUntil;

    await  this.prisma.user.update({
      where : {id : user.id },
      data : {
        failedLoginAttempts: attempts,
        lastFailedLoginAt : now ,
        lockedUntil,
      },
    });

    await this.audit.log({
      event: 'LOGIN_FAILURE',
      userId: user.id , 
      ip: ctx.ip, 
      userAgent: ctx.userAgent,
      metadata:{
        reason : 'wrong_password',
        email,
        attempts: attempts,
        locked: attempts >= 3,
      }
    });

    const delayMs = this.getLoginDelay(attempts);
    if(delayMs > 0)
    {
      await new Promise ((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
