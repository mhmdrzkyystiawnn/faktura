import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InternalCronGuard } from '../../common/guards/internal-cron.guard';
import { RemindersService } from './reminders.service';

@Controller('api/v1/internal')
@UseGuards(InternalCronGuard)
export class InternalRemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post('process-reminders')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async processReminders() {
    return this.reminders.processPendingReminders();
  }
}
