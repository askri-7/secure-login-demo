import { Injectable} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { callbackify } from 'util';


// This is the shape we pull out of GitHub's raw profile response and
// hand off to AuthService — deliberately small and explicit, rather
// than passing GitHub's full raw profile object further into the app.

export type GithubProfile = {
    providerUserId: string;
    email: string | null ;
    emailVerfied: boolean;
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
        const primaryVerifiedEmail =
           profile.emails?.find((e) => (e as any).verified && (e as any).primary) ??
           profile.emails?.find((e) => (e as any).verified);
        

        return {
            providerUserId: profile.id,
            email: primaryVerifiedEmail?.value ?? profile.emails?.[0]?.value ?? null,
            emailVerfied: Boolean(primaryVerifiedEmail),
            name: profile.displayName || profile.username || 'Github User' ,

        };
    }
}

