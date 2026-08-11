import { Injectable, OnModuleInit, BadRequestException } from "@nestjs/common";
import * as client from 'openid-client';


export type GoogleProfile = {
    providerUserId: string;
    email: string | null;
     emailVerified: boolean;
     name: string;
}

export type GoogleAuthRequest = {
    state: string;
    nonce: string;
    codeVerifier: string;

};

@Injectable()

export class GoogleOidcService implements OnModuleInit {
    // discovery fetch google for authorization endpoint 

    private config!: client.Configuration;

    async onModuleInit(){
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || clientSecret) {
            throw new Error('GOOGLE_CLIENT_ID AND GOOGLE_CLIENT_SECRET  are required');

        }

        this.config = await client.discovery(
            new URL('https://accounts.google.com'),
            clientId,
            clientSecret,
        );
    }
         // Step 1: build the URL we send the browser to, plus the secrets we
         // need to remember until Google redirects back.
        
    async buildAuthorizationRequest(): Promise<{ url : URL ; request : GoogleAuthRequest}> {
        const callbackURL = process.env.GOOGLE_CALLBACK_URL;

        if (!callbackURL){
            throw new Error('GOOGLE_CALLBACK_URL is required');
        }

        const codeVerifier = client.randomPKCECodeVerifier();
        const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
        const state = client.randomState();
        const nonce = client.randomNonce();

        const url = client.buildAuthorizationUrl(this.config, {
            redirect_uri: callbackURL,
            scope: 'openid email profile',
            state,
            nonce,
            code_challenge: codeChallenge,
            code_challenge_methode: 'S256',
        });

        return { url , request: {state, nonce , codeVerifier} };
    }

    async completeAuthorization(
      currentUrl: URL,
      authRequest: GoogleAuthRequest,

    ): Promise<GoogleProfile> {
        const tokens = await client.authorizationCodeGrant(this.config, currentUrl, {
            pkceCodeVerifier: authRequest.codeVerifier,
            expectedState: authRequest.state,
            expectedNonce: authRequest.nonce,
        });

        const claims = tokens.claims();
        if(!claims) {
            throw new BadRequestException('Google did not return valid identity claims');
        }

        return {
            providerUserId: claims.sub,
            email: typeof claims.email === 'string' ? claims.email : null,
            emailVerified: claims.email_verified === true,
            name: typeof claims.name === 'string' ? claims.name : 'Google User',
        };
    }
    
}