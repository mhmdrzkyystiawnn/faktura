import { NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  const prisma = {
    invoice: {
      findFirst: jest.fn(),
    },
  };
  const clients = {
    findOne: jest.fn(),
  };
  const service = new InvoicesService(prisma as never, clients as never);

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
});