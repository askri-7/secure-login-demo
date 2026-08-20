// redis token service
import { Injectable , UnauthorizedException} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import {User} from '@/generated/prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class EmailVerificationService{
    private redis: Redis;
    constructor(private prisma: PrismaService){
        this.redis = new Redis({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
        });
    }

    async createToken(userId: number, email: string): Promise<string> {
        const rawtoken = randomBytes(32).toString('hex');
        const tokenId = rawtoken.slice(0,16);
        const TokenSecret = rawtoken.slice(16);
        const hashedSecret = await bcrypt.hash(TokenSecret,12);

        await this.redis.set(
            `verify:${tokenId}`,
            `${userId}:${hashedSecret}`,
            'EX',
            86400,
        );
        return rawtoken;  
    }

    async verifyToken(rawToken: string): Promise<User> {
        const tokenId = rawToken.slice(0,16);
        const tokensecret = rawToken.slice(16);

        const stored = await this.redis.get(`verify:${tokenId}`);

        if(!stored) {
            throw new UnauthorizedException('Invalid or expired verification');
        }

        const [ userIdStr, hashedSecret]= stored.split(':');
        const valid = await bcrypt.compare(tokensecret, hashedSecret);
        if(!valid) {
            throw new UnauthorizedException('Invalid or expired verfication link');
        }

        await this.redis.del(`verify:${tokenId}`);

        const userId = parseInt(userIdStr, 10);

        await this.prisma.user.update({
            where: { id : userId},
            data: { emailVerified: true},
        });

        return this.prisma.user.findUniqueOrThrow({
            where :{id: userId}
        });

    }
}