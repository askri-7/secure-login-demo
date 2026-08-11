import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export type GithubProfile = {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
};

export type GithubAuthRequest = {
  state: string;
};

@Injectable()
export class GithubOAuthService {
  
   // Step 1: Build the GitHub authorization URL and generate a CSRF state token.
   //The caller must store `request.state` in an httpOnly cookie.
   
  buildAuthorizationRequest(): { url: URL; request: GithubAuthRequest } {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const callbackURL = process.env.GITHUB_CALLBACK_URL;

    if (!clientID || !callbackURL) {
      throw new Error('GITHUB_CLIENT_ID and GITHUB_CALLBACK_URL are required');
    }

    const state = randomBytes(32).toString('hex');

    const params = new URLSearchParams({
      client_id: clientID,
      redirect_uri: callbackURL,
      scope: 'user:email',
      state,
    });

    const url = new URL(`https://github.com/login/oauth/authorize?${params.toString()}`);

    return { url, request: { state } };
  }

  //Step 2: Exchange the authorization code for an access token,
 //then fetch and verify the user's email addresses.
   
  async completeAuthorization(code: string): Promise<GithubProfile> {
    const accessToken = await this.exchangeCode(code);
    return this.fetchUserProfile(accessToken);
  }

  private async exchangeCode(code: string): Promise<string> {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackURL = process.env.GITHUB_CALLBACK_URL;

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackURL,
      }),
    });

    if (!res.ok) {
      throw new UnauthorizedException('Failed to exchange GitHub authorization code');
    }

    const data = (await res.json()) as { access_token?: string; error?: string };

    if (!data.access_token) {
      throw new UnauthorizedException(
        data.error ?? 'GitHub did not return an access token',
      );
    }

    return data.access_token;
  }

  private async fetchUserProfile(accessToken: string): Promise<GithubProfile> {
    // --- Fetch verified emails ---
    let emails: Array<{ email: string; primary: boolean; verified: boolean }> = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://api.github.com/user/emails', {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'secure-login-demo',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`GitHub responded ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Unexpected response shape');

      emails = data;
    } catch (err) {
      console.error('GitHub email verification failed:', err);
      throw new UnauthorizedException(
        'Unable to verify your GitHub email. Please try again later.',
      );
    }

    const primaryVerifiedEmail =
      emails.find((e) => e.verified && e.primary) ??
      emails.find((e) => e.verified);

    // --- Fetch display name ---
    let name = 'Github User';
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'secure-login-demo',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { name?: string; login?: string };
        name = userData.name || userData.login || 'Github User';
      }
    } catch {}

    return {
      providerUserId: primaryVerifiedEmail?.email ?? emails[0]?.email ?? 'unknown',
      email: primaryVerifiedEmail?.email ?? emails[0]?.email ?? null,
      emailVerified: Boolean(primaryVerifiedEmail),
      name,
    };
  }
}
