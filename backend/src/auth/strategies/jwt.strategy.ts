import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@/generated/prisma/client';
import type { Request } from 'express';

//
function getCookieValue(request: Request, cookieName: string){
   // 1. Get the raw cookie string from the request header
  const cookieHeader = request.headers.cookie;

  if(!cookieHeader) {
    return null;
  }

  // 3. Split by ";" to get individual cookies
  for (const cookie of cookieHeader.split(';')) {
     const [rawName, ...rawValueParts] = cookie.trim().split('=');
     // cookie.trim() removes leading space
    // "refreshToken=def456" → ["refreshToken", "def456"]
      if (rawName === cookieName) {
      return rawValueParts.join('=');
    }
  }
  return null;
}
export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => getCookieValue(request, 'accessToken')
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,

    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}