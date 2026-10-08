import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: RemindersService,
  ) {}

  async recordPayment(
    userId: string,
    invoiceId: string,
    amount: number,
    method: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice sudah lunas');
    }

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Invoice sudah dibatalkan');
    }

    if (invoice.status === 'draft') {
      throw new BadRequestException(
        'Invoice harus dikirim sebelum mencatat pembayaran',
      );
    }

    const amountDecimal = new Prisma.Decimal(amount);
    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Jumlah pembayaran harus lebih dari 0');
    }

    const totalDecimal = new Prisma.Decimal(invoice.total);
    if (amountDecimal.gt(totalDecimal)) {
      throw new BadRequestException(
        'Jumlah pembayaran tidak boleh melebihi total invoice',
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: amountDecimal,
          method,
          paidAt: new Date(),
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'paid' },
      });

      return payment;
    });

    await this.reminders.cancelPendingReminders(invoiceId);

    return {
      data: {
        ...payment,
        amount: payment.amount.toNumber(),
      },
    };
  }

  async getPaymentsForInvoice(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { id: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: payments.map((p) => ({
        ...p,
        amount: p.amount.toNumber(),
      })),
    };
  }
}
