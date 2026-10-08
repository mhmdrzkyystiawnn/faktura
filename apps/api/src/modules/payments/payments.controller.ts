import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

class RecordPaymentDto {
  amount: number;
  method: string;
}

@Controller('api/v1/invoices/:invoiceId/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  recordPayment(
    @GetUser('id') userId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.payments.recordPayment(
      userId,
      invoiceId,
      dto.amount,
      dto.method,
    );
  }

  @Get()
  getPayments(
    @GetUser('id') userId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.payments.getPaymentsForInvoice(userId, invoiceId);
  }
}
