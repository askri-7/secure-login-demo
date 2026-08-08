import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {PrismaService} from '@/database/prisma.service';
import { Prisma, User } from '@/generated/prisma/client';
import { randomUUID, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs'
import {SignUpDto} from './dto/signup.dto';
import {LoginDto} from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private prisma : PrismaService,
    private jwtService : JwtService,
  ){}

  private toUserResponse(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private async storeRefreshToken(
    client: PrismaService | Prisma.TransactionClient,
    userId: number,
  ) {
    const refreshToken = randomBytes(64).toString('hex');

    // Hash refresh tokens before storage so a database leak cannot be used to replay sessions.
    const hashedToken = await bcrypt.hash(refreshToken, 12);

    await client.refreshToken.create({
      data: {
        id: randomUUID(),
        hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return refreshToken;
  }

  private async issueTokenPair(
    client: PrismaService | Prisma.TransactionClient,
    user: AuthUser,
  ) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await this.storeRefreshToken(client, user.id);

    return { accessToken, refreshToken };
  }

  private async findMatchingRefreshToken(
    client: PrismaService | Prisma.TransactionClient,
    refreshToken: string,
    activeOnly = true,
  ) {
    const tokens = await client.refreshToken.findMany({
      where: activeOnly
        ? {
            revoked: false,
            expiresAt: {
              gt: new Date(),
            },
          }
        : undefined,
      select: {
        id: true,
        hashedToken: true,
        userId: true,
      },
    });

    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.hashedToken)) {
        return token;
      }
    }

    return null;
  }
  
  async signUp(signUpDto: SignUpDto): Promise<AuthResponse>{
    const {name , email , password} = signUpDto;

    //check if user exists 
    const existingUser = await this.prisma.user.findUnique({where : {email} });
    // if not exist throw error
    if(existingUser){
        throw  new ConflictException('Email already in use');
    }
   // hash the password
    const hashedPassword = await bcrypt.hash(password,12);
   // create the new user with default role USER
   const user = await  this.prisma.user.create({data: {name , email , password: hashedPassword, role: 'USER'} });

   const { accessToken, refreshToken } = await this.issueTokenPair(this.prisma, user);

 
  return {accessToken, refreshToken, user: this.toUserResponse(user)};

}
async login(loginDto: LoginDto): Promise<AuthResponse> {
  const {email, password} = loginDto;

  //find user 
  const user = await this.prisma.user.findUnique({
    where: { email}
  });

  if(!user) {
    throw new UnauthorizedException('Invalid email or password');
  }

  //compare password
  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new UnauthorizedException('Invalid email or password');

  }
  const { accessToken, refreshToken } = await this.issueTokenPair(this.prisma, user);

  return { accessToken, refreshToken, user: this.toUserResponse(user) };
}

async refresh(refreshDto: RefreshDto): Promise<AuthResponse> {
  const matchedToken = await this.findMatchingRefreshToken(
    this.prisma,
    refreshDto.refreshToken,
  );

  if (!matchedToken) {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  const user = await this.prisma.user.findUnique({
    where: {
      id: matchedToken.userId,
    },
  });

  if (!user) {
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  return this.prisma.$transaction(async (tx) => {
    // Rotate refresh tokens so every refresh call invalidates the previous token.
    await tx.refreshToken.update({
      where: {
        id: matchedToken.id,
      },
      data: {
        revoked: true,
      },
    });

    const { accessToken, refreshToken } = await this.issueTokenPair(tx, user);

    return {
      accessToken,
      refreshToken,
      user: this.toUserResponse(user),
    };
  });
}

async logout(refreshDto: RefreshDto): Promise<{ message: string }> {
  const matchedToken = await this.findMatchingRefreshToken(
    this.prisma,
    refreshDto.refreshToken,
    false,
  );

  if (matchedToken) {
    await this.prisma.refreshToken.update({
      where: {
        id: matchedToken.id,
      },
      data: {
        revoked: true,
      },
    });
  }

  return { message: 'Logout successful' };
} 
}
