import { Body,Get, Controller, Post , Query,Req, Res, UnauthorizedException, UseGuards, BadRequestException} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import type { Request, Response } from 'express';
import { GithubOAuthService, type GithubAuthRequest } from './github-oauth.service';;
import { GoogleOidcService, type GoogleAuthRequest } from './google-oidc.service';
import { Throttle } from '@nestjs/throttler';


@Controller('auth')


export class AuthController {
  constructor(
    private authService: AuthService,
    private googleOidcService: GoogleOidcService,
    private githubOAuthService: GithubOAuthService, 
  ) {}
   // google cookie helper
  private setGoogleAuthRequestCookie(res: Response, request: GoogleAuthRequest){
    const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');

    res.cookie('googleAuthRequest', JSON.stringify(request), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureConnection,
      path: '/',
      maxAge: 5 * 60 * 1000,

    });
  }
    private getGoogleAuthRequestCookie(req: Request): GoogleAuthRequest | null {
        
      const raw = this.getCookie(req, 'googleAuthRequest');
      if (!raw) return null ;
      try {
        const decoded = decodeURIComponent(raw); 
        return JSON.parse(decoded) as GoogleAuthRequest;
      }catch{
        return null ;
      }
    }
   
private clearGoogleAuthRequestCookie(res: Response) {
  
  const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');
  res.clearCookie('googleAuthRequest', {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureConnection,
    path: '/',
  });
}


   // set normal auth cookie helper 
 // take an http respose object and two token and tell the browser to store them as cookie
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureConnection,
      path: '/',  //send on every url 
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureConnection,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } 
private clearAuthCookies(res: Response) {
  const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');

  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure:  isSecureConnection,
    path: '/',
  };

  res.clearCookie('accessToken', cookieOpts);
  res.clearCookie('refreshToken', cookieOpts);
}
private getCookie(req: Request, cookieName: string) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    for (const cookie of cookieHeader.split(';')) {
      const [rawName, ...rawValueParts] = cookie.trim().split('=');

      if (rawName === cookieName) {
        return rawValueParts.join('=');
      }
    }

    return null;
  }
private getClientInfo(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  
  // X-Forwarded-For can be "client, proxy1, proxy2" — take the first (real client)
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.ip || 'unknown');

  return {
    ip,
    userAgent: req.headers['user-agent'] || undefined,
  };
}
  

  // github cookie helper 

  private setGithubAuthRequestCookie(res: Response, request: GithubAuthRequest) {
   const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');
  res.cookie('github_auth_request', JSON.stringify(request), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureConnection ,
    path: '/',
    maxAge: 5 * 60 * 1000,
  });
}

private getGithubAuthRequestCookie(req: Request): GithubAuthRequest | null {
  const raw = this.getCookie(req, 'github_auth_request');
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as GithubAuthRequest;
  } catch {
    return null;
  }
}

private clearGithubAuthRequestCookie(res: Response) {
 const isSecureConnection = process.env.FRONTEND_URL?.startsWith('https://');
  res.clearCookie('github_auth_request', {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureConnection,
    path: '/',
  });
}

  
@Post('signup')
@Throttle({ default: { limit: 3, ttl: 60000 } })
async signup(@Body() signUpDto: SignUpDto, @Req() req: Request) {
  return this.authService.signUp(signUpDto, this.getClientInfo(req));
}

  @Post('login') 
  @Throttle({ default: { limit: 3, ttl: 60000 } }) 
  async login(@Body() loginDto: LoginDto,@Res({ passthrough: true })res: Response,  @Req() req: Request) {
    const session = await this.authService.login(loginDto, this.getClientInfo(req));
    this.setAuthCookies(res, session.accessToken, session.refreshToken);

    return { user: session.user };
    
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true}) res: Response){
    const refreshToken = this.getCookie(req, 'refreshToken');

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const session = await this.authService.refresh({ refreshToken }, this.getClientInfo(req));
    this.setAuthCookies(res, session.accessToken, session.refreshToken);

    return { user: session.user };
  }

  @Post('logout')
   async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.getCookie(req, 'refreshToken');
   
     // revoke the refresh token 
    if (refreshToken) {
      await this.authService.logout({ refreshToken }, this.getClientInfo(req));
    }

    this.clearAuthCookies(res);

    return { message: 'Logout successful' };
  }
 
@Get('github')
async githubLogin(@Res() res: Response) {
  const { url, request } = this.githubOAuthService.buildAuthorizationRequest();
  this.setGithubAuthRequestCookie(res, request);  // ← store full request (state + codeVerifier)
  res.redirect(url.toString());
}

@Get('github/callback')
async githubCallback(
  @Req() req: Request,
  @Res() res: Response,
  @Query('code') code: string,
  @Query('state') state: string,
) {
  const authRequest = this.getGithubAuthRequestCookie(req);
  this.clearGithubAuthRequestCookie(res);

  if (!authRequest || authRequest.state !== state) {
    throw new UnauthorizedException(
      'GitHub sign-in session expired or was tampered with — please try again.',
    );
  }

  if (!code) {
    throw new BadRequestException('GitHub authorization code missing');
  }

  // PASS codeVerifier to completeAuthorization
  const profile = await this.githubOAuthService.completeAuthorization(code, authRequest.codeVerifier);
  const session = await this.authService.loginWithGithub(profile, this.getClientInfo(req));
  this.setAuthCookies(res, session.accessToken, session.refreshToken);

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  res.redirect(frontendUrl);
}



  @Get('google')
  async googleLogin(@Res() res: Response) {
    const { url , request} = await this.googleOidcService.buildAuthorizationRequest();
    this.setGoogleAuthRequestCookie(res, request);
    res.redirect(url.toString());
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const authRequest = this.getGoogleAuthRequestCookie(req);
    this.clearGoogleAuthRequestCookie(res);

    if(!authRequest) {
      throw new BadRequestException(
         'Google sign-in session expired or was tampered with — please try again.',
      );
    }

    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if(!callbackURL) {
      throw new Error('GOOGLE_CALLBACK_URL is required');
    }

    const currentUrl = new URL(callbackURL);
    currentUrl.search =  new  URL(req.url , callbackURL).search;

    const profile = await this.googleOidcService.completeAuthorization(currentUrl , authRequest);
    const session = await this.authService.loginWithGoogle(profile, this.getClientInfo(req));
    this.setAuthCookies(res , session.accessToken, session.refreshToken);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/`);
    //res.redirect(`http://localhost:3000`);
  }

@Get('verify-email')
async verifyEmail(@Query('token') token: string, @Res() res: Response) {
  if (!token) {
    throw new BadRequestException('Verification token is required');
  }

  await this.authService.verifyEmail(token);

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  // Was: /email-verified — fix to match your route
  return res.redirect(`${frontendUrl}/verify-email?status=success`);
}


}
