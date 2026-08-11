import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from './auth.service';


 // Periodically removes revoked and expired refresh tokens from the database.
 
 // Runs every day at 3:00 AM. Keeping the table small ensures that
 
 
@Injectable()
export class TokenCleanupService {
  constructor(private authService: AuthService) {}

  @Cron('0 3 * * *')
  async handleCleanup() {
    const result = await this.authService.cleanupOldTokens();
    if (result.deleted > 0) {
      console.log(`Token cleanup: ${result.deleted} old refresh tokens removed`);
    }
  }
}
