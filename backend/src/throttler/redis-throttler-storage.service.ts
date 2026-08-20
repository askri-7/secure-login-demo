import { Injectable } from '@nestjs/common';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import Redis from 'ioredis';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
  const multi = this.redis.multi();
  multi.incr(key);
  multi.pexpire(key, ttl);
  const results = await multi.exec();
  
  const totalHits = results?.[0]?.[1] as number ?? 1;
  const timeToExpire = await this.redis.pttl(key);
  
return {
  totalHits,
  timeToExpire,
  isBlocked: false,
  timeToBlockExpire: 0,
};
}
    
}