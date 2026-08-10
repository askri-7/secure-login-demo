import { Controller, Get } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return {
      message: this.appService.getHello(),
      routes: {
        auth: ['/auth/signup', '/auth/login'],
        users: ['/users', '/users/me'],
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
