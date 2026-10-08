import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

process.env.RESEND_API_KEY = 're_test';

describe('InvoicesService', () => {
  const prisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const clients = {
    findOne: jest.fn(),
  };
  const reminders = {
    generateReminders: jest.fn(),
    cancelPendingReminders: jest.fn(),
  };
  const service = new InvoicesService(
    prisma as never,
    clients as never,
    reminders as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects access to an invoice that is not owned by the current user', async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-a', 'invoice-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
      where: { id: 'invoice-b', userId: 'user-a' },
      include: { client: true, items: true },
    });
  });

  it('checks client ownership before creating an invoice', async () => {
    clients.findOne.mockRejectedValue(new NotFoundException('Client tidak ditemukan'));
    const transaction = jest.fn();
    Object.assign(prisma, { $transaction: transaction });

    await expect(
      service.create('user-a', {
        clientId: 'client-a',
        issueDate: '2026-09-19',
        dueDate: '2026-09-20',
        items: [{ description: 'Jasa', quantity: 1, unitPrice: 100000 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(clients.findOne).toHaveBeenCalledWith('user-a', 'client-a');
    expect(transaction).not.toHaveBeenCalled();
  });

  describe('send', () => {
    function mockInvoice(overrides: Record<string, unknown> = {}) {
      return {
        id: 'inv-1',
        userId: 'user-a',
        status: 'draft',
        invoiceNumber: 'INV-2026-001',
        issueDate: new Date('2026-09-19T00:00:00.000Z'),
        dueDate: new Date('2026-09-20T00:00:00.000Z'),
        subtotal: { toNumber: () => 100000 },
        taxPercent: { toNumber: () => 0 },
        discountAmount: { toNumber: () => 0 },
        total: { toNumber: () => 100000 },
        currency: 'IDR',
        client: { name: 'Klien A', email: 'klien@example.com' },
        items: [
          {
            description: 'Jasa',
            quantity: { toNumber: () => 1 },
            unitPrice: { toNumber: () => 100000 },
            subtotal: { toNumber: () => 100000 },
          },
        ],
        ...overrides,
      };
    }

    it('sends invoice email to client with email before marking sent', async () => {
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.user.findUnique.mockResolvedValue({ name: 'Budi' });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'sent',
      });
      const sendMock = jest.fn().mockResolvedValue({ id: 'email-1' });
      (service as any).resend = { emails: { send: sendMock } };

      const result = await service.send('user-a', 'inv-1');

      expect(sendMock).toHaveBeenCalledTimes(1);
      const payload = sendMock.mock.calls[0][0];
      expect(payload.to).toBe('klien@example.com');
      expect(payload.subject).toContain('INV-2026-001');
      expect(result.data.status).toBe('sent');
      expect(reminders.generateReminders).toHaveBeenCalledWith(
        'inv-1',
        invoice.dueDate,
      );
    });

    it('skips email when client has no email but still marks sent', async () => {
      const invoice = mockInvoice({
        client: { name: 'Klien A', email: null },
      });
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'sent',
      });
      const sendMock = jest.fn();
      (service as any).resend = { emails: { send: sendMock } };

      const result = await service.send('user-a', 'inv-1');

      expect(sendMock).not.toHaveBeenCalled();
      expect(result.data.status).toBe('sent');
    });

    it('rejects sending an invoice that is not draft', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice({ status: 'sent' }));

      await expect(service.send('user-a', 'inv-1')).rejects.toThrow(
        'Hanya invoice draft yang dapat ditandai terkirim',
      );
    });

    it('does not mark invoice sent when email sending fails', async () => {
      const invoice = mockInvoice();
      prisma.invoice.findFirst.mockResolvedValue(invoice);
      prisma.user.findUnique.mockResolvedValue({ name: 'Budi' });
      prisma.invoice.update.mockClear();
      const sendMock = jest.fn().mockRejectedValue(new Error('resend down'));
      (service as any).resend = { emails: { send: sendMock } };

      await expect(service.send('user-a', 'inv-1')).rejects.toThrow(
        'resend down',
      );
      expect(prisma.invoice.update).not.toHaveBeenCalled();
      expect(reminders.generateReminders).not.toHaveBeenCalled();
    });
  });
});