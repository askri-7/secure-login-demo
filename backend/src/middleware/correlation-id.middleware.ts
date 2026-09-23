import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    
    req.correlationId = correlationId;
    

    res.setHeader('X-Correlation-Id', correlationId);
    
    next();
  }
}