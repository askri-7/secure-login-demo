// test race revoked token test 


jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {
    $connect() { return Promise.resolve(); }
    $disconnect() { return Promise.resolve(); }
  },
  Prisma: {
    TransactionClient: class TransactionClient {},
  },
  User: class User {},
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('fake-hash'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { EmailService } from '@/email/email.service';
import { EmailVerificationService } from '@/email/email-verification.service';

describe('AuthService - Race Condition Fix', () => {
  let service: AuthService;
  let mockPrismaService: any;
  let mockTxClient: any;
  let mockJwtService: any;
  let mockAuditLogService: any;
  let mockEmailService: any;
  let mockEmailVerification: any;

  beforeEach(async () => {
    // Create FRESH mocks for every test — no state leakage
    mockTxClient = {
      refreshToken: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mockPrismaService = {
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback: any) => callback(mockTxClient)),
    };

    mockJwtService = {
      sign: jest.fn(() => 'fake-access-token'),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailVerification = {
      createToken: jest.fn().mockResolvedValue('verification-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerification,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should issue new tokens when revoke succeeds (count = 1)', async () => {
    const fakeToken = {
      id: 'token-uuid-123',
      tokenId: 'abc123xxxxxxxxxxxx', // must be 16 chars to match slice(0,16)
      hashedSecret: 'fake-hash',
      userId: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
    };

    const fakeUser = {
      id: 1,
      email: 'alice@test.com',
      name: 'Alice',
      role: 'USER',
      password: 'hashed-password',
    };

    mockPrismaService.refreshToken.findUnique.mockResolvedValue(fakeToken);
    mockPrismaService.user.findUnique.mockResolvedValue(fakeUser);
    mockTxClient.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    // raw token = 16-char tokenId + 112-char secret = 128 chars total
    const rawToken = 'abc123xxxxxxxxxxxx' + 'x'.repeat(112);

    const result = await service.refresh(
      { refreshToken: rawToken },
      { ip: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('fake-access-token');
    expect(result.refreshToken).toBeDefined();

    // THE FIX: verify updateMany only acts on ACTIVE tokens
    expect(mockTxClient.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'token-uuid-123',
        revoked: false,
      },
      data: expect.objectContaining({
        revoked: true,
        revokedAt: expect.any(Date),
      }),
    });
  });

  it('should throw UnauthorizedException when token already used (count = 0)', async () => {
    const fakeToken = {
      id: 'token-uuid-123',
      tokenId: 'abc123xxxxxxxxxxxx',
      hashedSecret: 'fake-hash',
      userId: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
    };

    const fakeUser = {
      id: 1,
      email: 'alice@test.com',
      name: 'Alice',
      role: 'USER',
      password: 'hashed-password',
    };

    mockPrismaService.refreshToken.findUnique.mockResolvedValue(fakeToken);
    mockPrismaService.user.findUnique.mockResolvedValue(fakeUser);
    mockTxClient.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    const rawToken = 'abc123xxxxxxxxxxxx' + 'x'.repeat(112);

    await expect(
      service.refresh({ refreshToken: rawToken }, { ip: '127.0.0.1' }),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      service.refresh({ refreshToken: rawToken }, { ip: '127.0.0.1' }),
    ).rejects.toThrow('Refresh token already used');
  });

  it('creates an unverified local account and sends its verification link', async () => {
    process.env.API_URL = 'http://localhost:3000';
    const user = {
      id: 7,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'fake-hash',
      role: 'USER',
      emailVerified: false,
    };
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.user.create.mockResolvedValue(user);

    const result = await service.signUp(
      {
        name: 'Alice',
        email: user.email,
        password: 'correct horse battery staple',
        confirmPassword: 'correct horse battery staple',
      },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result.message).toContain('check your email');
    expect(mockPrismaService.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: user.email,
        emailVerified: false,
        role: 'USER',
      }),
    });
    expect(mockEmailVerification.createToken).toHaveBeenCalledWith(
      user.id,
      user.email,
    );
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      user.email,
      user.name,
      'http://localhost:3000/auth/verify-email?token=verification-token',
    );
  });

  it('rejects local login until the email has been verified', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 7,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'fake-hash',
      role: 'USER',
      emailVerified: false,
      lockedUntil: null,
    });

    await expect(
      service.login(
        { email: 'alice@example.com', password: 'correct horse battery staple' },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toThrow('Please verify your email before logging in.');
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'LOGIN_FAILURE',
        metadata: expect.objectContaining({ reason: 'email_not_verified' }),
      }),
    );
  });

  it('logs in a verified local account and issues both tokens', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 7,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'fake-hash',
      role: 'USER',
      emailVerified: true,
      lockedUntil: null,
    });
    mockJwtService.sign.mockReturnValue('access-token');

    const result = await service.login(
      { email: 'alice@example.com', password: 'correct horse battery staple' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: expect.any(String),
      user: {
        id: 7,
        email: 'alice@example.com',
        name: 'Alice',
        role: 'USER',
      },
    });
    expect(mockAuditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'LOGIN_SUCCESS', userId: 7 }),
    );
  });
});