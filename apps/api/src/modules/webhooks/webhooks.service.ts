import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  transaction_id: string;
  settlement_time?: string;
  metadata?: {
    invoiceId?: string;
  };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: RemindersService,
  ) {}

  async handleMidtransNotification(body: MidtransNotification) {
    const signatureValid = this.verifySignature(body);
    if (!signatureValid) {
      this.logger.warn(
        `Invalid signature for order_id: ${body.order_id}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    const invoiceId = body.metadata?.invoiceId ?? body.order_id;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found for order_id: ${body.order_id}`);
      return { status: 'ignored', reason: 'invoice_not_found' };
    }

    if (invoice.status === 'paid') {
      return { status: 'ignored', reason: 'already_paid' };
    }

    if (invoice.status === 'cancelled') {
      return { status: 'ignored', reason: 'invoice_cancelled' };
    }

    const newStatus = this.mapTransactionStatus(
      body.transaction_status,
      body.fraud_status,
    );

    if (!newStatus) {
      return { status: 'ignored', reason: 'no_status_change' };
    }

    const grossAmount = new Prisma.Decimal(body.gross_amount);
    const invoiceTotal = new Prisma.Decimal(invoice.total);
    if (grossAmount.gt(invoiceTotal)) {
      this.logger.warn(
        `Gross amount ${body.gross_amount} exceeds invoice total ${invoice.total.toString()} for order_id: ${body.order_id}`,
      );
      throw new BadRequestException('Gross amount exceeds invoice total');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: { gatewayReference: body.transaction_id },
      });

      if (existingPayment) {
        return null;
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: grossAmount,
          method: 'midtrans',
          gatewayReference: body.transaction_id,
          paidAt: body.settlement_time
            ? new Date(body.settlement_time)
            : new Date(),
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      return payment;
    });

    if (payment && newStatus === 'paid') {
      await this.reminders.cancelPendingReminders(invoice.id);
    }

    return {
      status: 'processed',
      invoiceId: invoice.id,
      paymentId: payment?.id ?? null,
      newStatus,
    };
  }

  private verifySignature(body: MidtransNotification): boolean {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      this.logger.error('MIDTRANS_SERVER_KEY not configured');
      return false;
    }

    const input = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
    const expectedSignature = createHash('sha512')
      .update(input)
      .digest('hex');

    const bodySig = Buffer.from(body.signature_key, 'utf8');
    const expectedSig = Buffer.from(expectedSignature, 'utf8');

    if (bodySig.length !== expectedSig.length) {
      return false;
    }

    return timingSafeEqual(bodySig, expectedSig);
  }

  private mapTransactionStatus(
    transactionStatus: string,
    fraudStatus?: string,
  ): 'paid' | 'cancelled' | null {
    if (transactionStatus === 'settlement') {
      return 'paid';
    }

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        return 'paid';
      }
      return null;
    }

    if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire' ||
      transactionStatus === 'deny'
    ) {
      return 'cancelled';
    }

    return null;
  }
}
