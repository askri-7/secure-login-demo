import { Module } from '@nestjs/common';
import { PrismaModule } from '@/database/prisma.module';  // ← ADD
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [PrismaModule],  
  providers: [EmailService, EmailVerificationService],
  exports: [EmailService, EmailVerificationService],
})
export class EmailModule {}