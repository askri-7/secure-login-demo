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
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('googleAuthRequest', JSON.stringify(request), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
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
      res.clearCookie('googleAuthRequest', { path: '/'});
    }


   // set normal auth cookie helper 
 // take an http respose object and two token and tell the browser to store them as cookie
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',  //send on every url 
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } 
   private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
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
    return {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || undefined,
    };
  }

  

  // github cookie helper 

  private setGithubStateCookie(res: Response, state: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('github_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 5 * 60 * 1000,
    });
  }

  private getGithubStateCookie(req: Request): string | null {
    return this.getCookie(req, 'github_oauth_state');
  }

  private clearGithubStateCookie(res: Response) {
    res.clearCookie('github_oauth_state', { path: '/' });
  }


  
  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async signup(@Body() signUpDto: SignUpDto, @Res({ passthrough: true}) res: Response,  @Req() req: Request) {
    const session = await this.authService.signUp(signUpDto, this.getClientInfo(req));
    this.setAuthCookies(res, session.accessToken, session.refreshToken)
    return {user: session.user};
  }

  @Post('login') 
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
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
    this.setGithubStateCookie(res, request.state);
    res.redirect(url.toString());
  }

  @Get('github/callback')
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const expectedState = this.getGithubStateCookie(req);
    this.clearGithubStateCookie(res);

    if (!expectedState || expectedState !== state) {
      throw new UnauthorizedException(
        'GitHub sign-in session expired or was tampered with — please try again.',
      );
    }

    if (!code) {
      throw new BadRequestException('GitHub authorization code missing');
    }

    const profile = await this.githubOAuthService.completeAuthorization(code);
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


}
