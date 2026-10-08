import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InternalCronGuard } from '../../common/guards/internal-cron.guard';
import { InvoicesService } from './invoices.service';

@Controller('api/v1/internal')
@UseGuards(InternalCronGuard)
export class InternalInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('mark-overdue-invoices')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async markOverdueInvoices() {
    return this.invoices.markOverdueInvoices();
  }
}
