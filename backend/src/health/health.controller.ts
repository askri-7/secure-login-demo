import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  //is the process running?
//Terraform/ALB hits this. If it fails, the container is killed and restarted.
   
  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'secure-login-demo',
      timestamp: new Date().toISOString(),
    };
  }

  //is the app ready to handle requests?
   //Terraform/ALB hits this. If it fails, traffic is routed away from this instance.
   //Checks DB connection because without DB, auth is dead.
   
  @Get('ready')
  async ready() {
    try {
      // Lightweight DB ping 
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        db: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'not ready',
        db: 'disconnected',
        error: err instanceof Error ? err.message : 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }
}