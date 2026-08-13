import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // CONNECTION POOLING
      max: Number(process.env.DB_POOL_MAX ?? '20'),
      connectionTimeoutMillis: Number(process.env.DB_TIMEOUT ?? '10000'),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT ?? '30000'),
      // QUERY SAFETY 
      statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT ?? '30000'),
    });

    super({
      adapter,
      // PRISMA-LEVEL TIMEOUTS 
      transactionOptions: {
        maxWait: 5000,  // wait max 5s for a connection from the pool
        timeout: 10000, // transaction must complete within 10s
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Prisma disconnected from database');
  }
}