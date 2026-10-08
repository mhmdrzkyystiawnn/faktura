import { createHash } from 'crypto';
import { MidtransNotification, WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  const prisma = {
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const reminders = {
    cancelPendingReminders: jest.fn(),
  };

  const service = new WebhooksService(prisma as never, reminders as never);

  const serverKey = 'test-server-key';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIDTRANS_SERVER_KEY = serverKey;
  });

  function createNotification(
    overrides: Partial<MidtransNotification> = {},
  ): MidtransNotification {
    const body: MidtransNotification = {
      order_id: 'inv-1',
      status_code: '200',
      gross_amount: '100000.00',
      signature_key: '',
      transaction_status: 'settlement',
      fraud_status: 'accept',
      payment_type: 'bank_transfer',
      transaction_id: 'txn-1',
      settlement_time: '2026-10-07T10:00:00.000Z',
      metadata: { invoiceId: 'inv-1' },
      ...overrides,
    };

    if (!overrides.signature_key) {
      const input = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
      body.signature_key = createHash('sha512').update(input).digest('hex');
    }

    return body;
  }

  describe('handleMidtransNotification', () => {
    it('processes settlement notification and marks invoice as paid', async () => {
      const invoice = {
        id: 'inv-1',
        status: 'sent',
        total: '100000.00',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: { toNumber: () => 100000 },
        method: 'midtrans',
        gatewayReference: 'txn-1',
      });

      const result = await service.handleMidtransNotification(
        createNotification(),
      );

      expect(result.status).toBe('processed');
      expect(result.newStatus).toBe('paid');
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(reminders.cancelPendingReminders).toHaveBeenCalledWith('inv-1');
    });

    it('ignores notification for already paid invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'paid',
      });

      const result = await service.handleMidtransNotification(
        createNotification(),
      );

      expect(result.status).toBe('ignored');
      expect(result.reason).toBe('already_paid');
    });

    it('ignores notification for cancelled invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'cancelled',
      });

      const result = await service.handleMidtransNotification(
        createNotification(),
      );

      expect(result.status).toBe('ignored');
      expect(result.reason).toBe('invoice_cancelled');
    });

    it('ignores notification when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      const result = await service.handleMidtransNotification(
        createNotification(),
      );

      expect(result.status).toBe('ignored');
      expect(result.reason).toBe('invoice_not_found');
    });

    it('rejects notification with invalid signature', async () => {
      const body = createNotification({ signature_key: 'invalid' });

      await expect(
        service.handleMidtransNotification(body),
      ).rejects.toThrow('Invalid signature');
    });

    it('ignores pending transaction status', async () => {
      const invoice = {
        id: 'inv-1',
        status: 'sent',
        total: '100000.00',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);

      const result = await service.handleMidtransNotification(
        createNotification({ transaction_status: 'pending' }),
      );

      expect(result.status).toBe('ignored');
      expect(result.reason).toBe('no_status_change');
    });

    it('processes cancel notification', async () => {
      const invoice = {
        id: 'inv-1',
        status: 'sent',
        total: '100000.00',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: { toNumber: () => 100000 },
        method: 'midtrans',
        gatewayReference: 'txn-1',
      });

      const result = await service.handleMidtransNotification(
        createNotification({ transaction_status: 'cancel' }),
      );

      expect(result.status).toBe('processed');
      expect(result.newStatus).toBe('cancelled');
    });

    it('rejects when gross amount exceeds invoice total', async () => {
      const invoice = {
        id: 'inv-1',
        status: 'sent',
        total: '50000.00',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);

      await expect(
        service.handleMidtransNotification(
          createNotification({ gross_amount: '100000.00' }),
        ),
      ).rejects.toThrow('Gross amount exceeds invoice total');
    });

    it('ignores duplicate transaction_id (idempotency)', async () => {
      const invoice = {
        id: 'inv-1',
        status: 'sent',
        total: '100000.00',
      };

      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.payment.findFirst.mockResolvedValue({ id: 'pay-existing' });

      const result = await service.handleMidtransNotification(
        createNotification(),
      );

      expect(result.status).toBe('processed');
      expect(result.paymentId).toBeNull();
    });
  });
});
