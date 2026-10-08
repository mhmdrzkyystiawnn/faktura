import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';

@Controller('api/v1/public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  findByToken(@Param('token') token: string) {
    return this.invoices.findByPublicToken(token);
  }
}
