import { Injectable} from '@nestjs/common';
import {PrismaService} from '@/database/prisma.service';


export type AuditEvent =
  | 'SIGNUP'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'OAUTH_GITHUB_SUCCESS'
  | 'OAUTH_GITHUB_FAILURE'
  | 'OAUTH_GOOGLE_SUCCESS'
  | 'OAUTH_GOOGLE_FAILURE'
  | 'ACCOUNT_LOCKED';

export type AuditMetadata = Record<string, unknown>;

@Injectable()
export class AuditLogService {
    constructor( private prisma: PrismaService){}
   
   
    async log(opts:{
        event : AuditEvent;
        userId?: number | null ;
        ip: string;
        userAgent?: string;
        metadata?: AuditMetadata;

    }): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: opts.userId ?? null ,
                    event: opts.event,
                    ip: opts.ip,
                    userAgent: opts.userAgent ?? null,
                    metadata: opts.metadata? JSON.stringify(opts.metadata) : null, 
                },
            });
        }catch(err) {
             console.error('Audit log failed:', err);

        }
    }
}