import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}


  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'secure-login-demo',
      timestamp: new Date().toISOString(),
    };
  }


  @Get('ready')
async ready() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready', db: 'connected' };
  } catch (err) {
 
    throw new ServiceUnavailableException({
      status: 'not ready',
      db: 'disconnected',
      error: err instanceof Error ? err.message : 'Unknown database error',
    });
  }
}
}