import { RemindersService } from './reminders.service';

process.env.RESEND_API_KEY = 're_test';

describe('RemindersService', () => {
  const prisma = {
    reminder: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const service = new RemindersService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReminders', () => {
    it('generates 4 reminders with correct schedule', async () => {
      const dueDate = new Date('2026-10-15T00:00:00.000Z');

      const result = await service.generateReminders('invoice-1', dueDate);

      expect(result.generated).toBe(4);
      expect(prisma.reminder.createMany).toHaveBeenCalledTimes(1);

      const { data } = prisma.reminder.createMany.mock.calls[0][0];
      expect(data).toHaveLength(4);

      const scheduledDates = data.map(
        (r: { scheduledAt: Date }) => r.scheduledAt.toISOString().slice(0, 10),
      );
      expect(scheduledDates).toEqual([
        '2026-10-12', // H-3
        '2026-10-14', // H-1
        '2026-10-15', // H
        '2026-10-16', // H+1
      ]);

      data.forEach((r: { channel: string; status: string }) => {
        expect(r.channel).toBe('email');
        expect(r.status).toBe('pending');
      });
    });

    it('schedules reminders at 09:00 UTC', async () => {
      const dueDate = new Date('2026-10-15T00:00:00.000Z');

      await service.generateReminders('invoice-1', dueDate);

      const { data } = prisma.reminder.createMany.mock.calls[0][0];
      data.forEach((r: { scheduledAt: Date }) => {
        expect(r.scheduledAt.getUTCHours()).toBe(9);
        expect(r.scheduledAt.getUTCMinutes()).toBe(0);
      });
    });
  });

  describe('cancelPendingReminders', () => {
    it('marks all pending reminders as cancelled', async () => {
      prisma.reminder.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cancelPendingReminders('invoice-1');

      expect(result.cancelled).toBe(3);
      expect(prisma.reminder.updateMany).toHaveBeenCalledWith({
        where: { invoiceId: 'invoice-1', status: 'pending' },
        data: { status: 'cancelled' },
      });
    });
  });

  describe('getRemindersForInvoice', () => {
    it('returns reminders for an invoice', async () => {
      const reminders = [
        { id: 'r1', status: 'pending' },
        { id: 'r2', status: 'sent' },
      ];
      prisma.reminder.findMany.mockResolvedValue(reminders);

      const result = await service.getRemindersForInvoice('invoice-1');

      expect(result.data).toEqual(reminders);
      expect(prisma.reminder.findMany).toHaveBeenCalledWith({
        where: { invoiceId: 'invoice-1' },
        orderBy: { scheduledAt: 'asc' },
      });
    });
  });
});
