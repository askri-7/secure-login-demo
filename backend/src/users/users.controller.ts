import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@/generated/prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UsersService } from './users.service';

type JwtRequestUser = {
  sub: number;
  email: string;
  role: UserRole;
};

type AuthenticatedRequest = Request & {
  user: JwtRequestUser;
};

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  // This route is protected twice: JWT first, then the ADMIN-only role check.
  findAll() {
    return this.usersService.findAllUsers();
  }

  @Get('me')
  // JWT is enough here because the logged-in user can only read their own record.
  findMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.findCurrentUser(request.user.sub);
  }
}