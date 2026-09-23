jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
  Prisma: {
    TransactionClient: class TransactionClient {},
  },
  User: class User {},
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));

jest.mock('./google-oidc.service', () => ({
  GoogleOidcService: class GoogleOidcService {},
}));

jest.mock('./github-oauth.service', () => ({
  GithubOAuthService: class GithubOAuthService {},
}));

import { AuthController } from './auth.controller';

describe('AuthController local email verification', () => {
  let controller: AuthController;
  let emailVerification: { verifyToken: jest.Mock };
  let response: { redirect: jest.Mock };

  beforeEach(() => {
    emailVerification = {
      verifyToken: jest.fn(),
    };
    controller = new AuthController(
      {} as never,
      {} as never,
      {} as never,
      emailVerification as never,
    );
    response = { redirect: jest.fn() };
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  it('redirects a valid verification token to login', async () => {
    emailVerification.verifyToken.mockResolvedValue(undefined);

    await controller.verifyEmail('valid-token', response as never);

    expect(emailVerification.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?verified=1',
    );
  });

  it('redirects a missing token to the verification error page', async () => {
    await controller.verifyEmail('', response as never);

    expect(emailVerification.verifyToken).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/verify-email?error=missing_token',
    );
  });

  it('redirects an invalid or expired token to the verification error page', async () => {
    emailVerification.verifyToken.mockRejectedValue(new Error('expired'));

    await controller.verifyEmail('expired-token', response as never);

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/verify-email?error=expired_or_invalid',
    );
  });
});