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

describe('AuthService - Race Condition Fix', () => {
  let service: AuthService;
  let mockPrismaService: any;
  let mockTxClient: any;
  let mockJwtService: any;
  let mockAuditLogService: any;

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
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(mockTxClient)),
    };

    mockJwtService = {
      sign: jest.fn(() => 'fake-access-token'),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditLogService, useValue: mockAuditLogService },
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
});