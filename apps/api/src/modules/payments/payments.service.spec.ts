import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const reminders = {
    cancelPendingReminders: jest.fn(),
  };

  const service = new PaymentsService(prisma as never, reminders as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('records payment and marks invoice as paid', async () => {
      const invoice = {
        id: 'inv-1',
        userId: 'user-1',
        status: 'sent',
        total: new Prisma.Decimal('100000'),
      };

      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: { toNumber: () => 100000 },
        method: 'manual',
        paidAt: new Date(),
      });

      const result = await service.recordPayment(
        'user-1',
        'inv-1',
        100000,
        'manual',
      );

      expect(result.data.amount).toBe(100000);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'inv-1',
          amount: expect.anything(),
          method: 'manual',
          paidAt: expect.any(Date),
        },
      });
      expect(reminders.cancelPendingReminders).toHaveBeenCalledWith('inv-1');
    });

    it('rejects payment for draft invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'draft',
      });

      await expect(
        service.recordPayment('user-1', 'inv-1', 100000, 'manual'),
      ).rejects.toThrow('Invoice harus dikirim sebelum mencatat pembayaran');
    });

    it('rejects payment exceeding invoice total', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'sent',
        total: new Prisma.Decimal('50000'),
      });

      await expect(
        service.recordPayment('user-1', 'inv-1', 100000, 'manual'),
      ).rejects.toThrow(
        'Jumlah pembayaran tidak boleh melebihi total invoice',
      );
    });

    it('rejects payment for already paid invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: 'paid',
      });

      await expect(
        service.recordPayment('user-1', 'inv-1', 100000, 'manual'),
      ).rejects.toThrow('Invoice sudah lunas');
    });
  });

  describe('getPaymentsForInvoice', () => {
    it('returns payments for an invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'inv-1' });
      prisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: { toNumber: () => 100000 },
          method: 'manual',
        },
      ]);

      const result = await service.getPaymentsForInvoice('user-1', 'inv-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(100000);
    });

    it('throws NotFound when invoice does not exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.getPaymentsForInvoice('user-1', 'inv-1'),
      ).rejects.toThrow('Invoice tidak ditemukan');
    });
  });
});
