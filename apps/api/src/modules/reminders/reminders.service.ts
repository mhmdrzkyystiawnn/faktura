import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaService } from '../../database/prisma/prisma.service';

interface ReminderSchedule {
  daysFromDue: number;
  label: string;
}

const REMINDER_SCHEDULES: ReminderSchedule[] = [
  { daysFromDue: -3, label: 'H-3' },
  { daysFromDue: -1, label: 'H-1' },
  { daysFromDue: 0, label: 'Hari jatuh tempo' },
  { daysFromDue: 1, label: 'H+1 (lewat jatuh tempo)' },
];

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private readonly resend: Resend;

  constructor(private readonly prisma: PrismaService) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async generateReminders(invoiceId: string, dueDate: Date) {
    const due = new Date(dueDate);
    due.setUTCHours(0, 0, 0, 0);

    const reminders = REMINDER_SCHEDULES.map((schedule) => {
      const scheduledAt = new Date(due);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + schedule.daysFromDue);
      scheduledAt.setUTCHours(9, 0, 0, 0);

      return {
        invoiceId,
        channel: 'email' as const,
        scheduledAt,
        status: 'pending' as const,
      };
    });

    await this.prisma.reminder.createMany({ data: reminders });

    return { generated: reminders.length };
  }

  async processPendingReminders() {
    const pending = await this.prisma.reminder.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        status: 'pending',
      },
      include: {
        invoice: {
          include: { client: true, user: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    let sent = 0;
    let failed = 0;

    for (const reminder of pending) {
      try {
        await this.sendReminderEmail(reminder);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to send reminder ${reminder.id}: ${reason}`);
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'failed', failureReason: reason },
        });
        failed += 1;
      }
    }

    return { processed: pending.length, sent, failed };
  }

  async cancelPendingReminders(invoiceId: string) {
    const result = await this.prisma.reminder.updateMany({
      where: { invoiceId, status: 'pending' },
      data: { status: 'cancelled' },
    });

    return { cancelled: result.count };
  }

  async getRemindersForInvoice(invoiceId: string) {
    const reminders = await this.prisma.reminder.findMany({
      where: { invoiceId },
      orderBy: { scheduledAt: 'asc' },
    });

    return { data: reminders };
  }

  private async sendReminderEmail(reminder: {
    id: string;
    invoice: {
      invoiceNumber: string;
      dueDate: Date;
      total: unknown;
      currency: string;
      client: { name: string; email: string | null };
      user: { name: string; email: string };
    };
  }) {
    const { invoice } = reminder;
    const clientEmail = invoice.client.email;

    if (!clientEmail) {
      throw new Error('Client email not available');
    }

    const dueDateStr = invoice.dueDate.toISOString().slice(0, 10);
    const total = Number(invoice.total);
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: invoice.currency,
      maximumFractionDigits: 0,
    }).format(total);

    await this.resend.emails.send({
      from:
        process.env.EMAIL_FROM ??
        'Faktura <noreply@faktura.muhamadrizky.my.id>',
      to: clientEmail,
      subject: `Reminder: Invoice ${invoice.invoiceNumber} — ${dueDateStr}`,
      html: this.buildReminderHtml({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        dueDate: dueDateStr,
        total: formattedTotal,
        currency: invoice.currency,
      }),
    });
  }

  private buildReminderHtml(params: {
    invoiceNumber: string;
    clientName: string;
    dueDate: string;
    total: string;
    currency: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder Invoice ${params.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1a365d;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Faktura</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1a365d;font-size:18px;font-weight:600;">Reminder Invoice</h2>
              <p style="margin:0 0 24px;color:#4a5568;font-size:14px;line-height:1.6;">
                Kepada <strong>${params.clientName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#4a5568;font-size:14px;line-height:1.6;">
                Ini adalah pengingat untuk invoice berikut:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">No. Invoice</span>
                    <p style="margin:4px 0 0;color:#1a365d;font-size:14px;font-weight:600;">${params.invoiceNumber}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Jatuh Tempo</span>
                    <p style="margin:4px 0 0;color:#1a365d;font-size:14px;font-weight:600;">${params.dueDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Total</span>
                    <p style="margin:4px 0 0;color:#1a365d;font-size:14px;font-weight:600;">${params.total}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#4a5568;font-size:14px;line-height:1.6;">
                Mohon segera melakukan pembayaran sebelum tanggal jatuh tempo. Jika sudah melakukan pembayaran, abaikan email ini.
              </p>
              <p style="margin:0;color:#718096;font-size:12px;line-height:1.6;">
                Terima kasih,<br>
                <strong>Tim Faktura</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:11px;text-align:center;">
                Email ini dikirim otomatis oleh sistem Faktura. Jangan balas email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
