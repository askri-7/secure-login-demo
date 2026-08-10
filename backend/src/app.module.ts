import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@/database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
@Module({
  imports: [PrismaModule, AuthModule, UsersModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,   // time window: 60,000 ms = 1 minute
        limit: 100,   // 100 requests per minute per IP, generally generous
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService,{
    provide: APP_GUARD,
    useClass: ThrottlerGuard
  }, // applies the limit globally, to every route
  ],
})
export class AppModule {}
