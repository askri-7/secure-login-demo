import { Injectable, NotFoundException } from '@nestjs/common';
import {PrismaService} from '@/database/prisma.service';

const userSelect = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}
    
    findAllUsers() {
            return this.prisma.user.findMany({select:userSelect,});

    }

    async findCurrentUser(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId},
            select: userSelect,
        });
        if(!user){
            throw new NotFoundException('User not found');
        }
        return user ;
    }
    
}

