import { Module, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@/database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from '@/middleware/correlation-id.middleware';
import { EmailController } from './email/email.controller';
import { EmailModule } from './email/email.module';

@Module({
  
  imports: [
    EmailModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
   
    EmailModule,
  ],
  controllers: [AppController, HealthController, EmailController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {

    configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
