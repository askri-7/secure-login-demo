import { Injectable , UnauthorizedException} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { callbackify } from 'util';


// This is the shape we pull out of GitHub's raw profile response and
// hand off to AuthService — deliberately small and explicit, rather
// than passing GitHub's full raw profile object further into the app.

export type GithubProfile = {
    providerUserId: string;
    email: string | null ;
    emailVerified: boolean;
    name: string;
};


@Injectable()

export class GithubStrategy extends PassportStrategy(Strategy, 'github')  {
    constructor() {
        const clientID = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const callbackURL = process.env.GITHUB_CALLBACK_URL;
        
        if(!clientID || !clientSecret || !callbackURL) {
        
            throw new Error(
                'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL are required',

            );    
        }

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['user:email'],

        });
    }

    
    async validate(
  accessToken: string,
  _refreshToken: string,
  profile: Profile,
): Promise<GithubProfile> {
  let emails: Array<{ email: string; primary: boolean; verified: boolean }> = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
   // fetch github api directly is the most reliable way
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
    // Fail closed: if we can't verify with GitHub, reject
    console.error('GitHub email verification failed:', err);
    throw new UnauthorizedException(
      'Unable to verify your GitHub email. Please try again later.',
    );
  }

  const primaryVerifiedEmail =
    emails.find((e) => e.verified && e.primary) ??
    emails.find((e) => e.verified);

  return {
    providerUserId: profile.id,
    email: primaryVerifiedEmail?.email ?? emails[0]?.email ?? null,
    emailVerified: Boolean(primaryVerifiedEmail),
    name: profile.displayName || profile.username || 'Github User',
  };
}
}

