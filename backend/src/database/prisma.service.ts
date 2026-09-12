import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  createDatabasePool,
  validateDatabaseConfiguration,
} from './database.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    validateDatabaseConfiguration();
    const pool = createDatabasePool();
    const adapter = new PrismaPg(pool, { disposeExternalPool: true });

    super({
      adapter,
      // PRISMA-LEVEL TIMEOUTS
      transactionOptions: {
        maxWait: 5000, // wait max 5s for a connection from the pool
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
