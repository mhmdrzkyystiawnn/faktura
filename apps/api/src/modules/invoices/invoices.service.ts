import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { RemindersService } from '../reminders/reminders.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { calculateInvoiceTotals } from './invoice-calculator';

const MAX_NUMBER_RETRIES = 3;

@Injectable()
export class InvoicesService {
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
    private readonly reminders: RemindersService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async findAll(userId: string, query: InvoiceQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.perPage;

    const [invoices, totalItems] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: { client: true, items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.perPage,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((invoice) => this.serializeInvoice(invoice)),
      meta: {
        page: query.page,
        perPage: query.perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / query.perPage),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    return { data: this.serializeInvoice(invoice) };
  }

  async create(userId: string, dto: CreateInvoiceDto) {
    const dates = this.validateDates(dto.issueDate, dto.dueDate);
    await this.clients.findOne(userId, dto.clientId);
    const totals = this.calculateTotals(
      dto.items,
      dto.taxPercent ?? 0,
      dto.discountAmount ?? 0,
    );

    for (let attempt = 0; attempt < MAX_NUMBER_RETRIES; attempt += 1) {
      try {
        const invoice = await this.prisma.$transaction(async (tx) => {
          const invoiceNumber = await this.generateInvoiceNumber(
            tx,
            dates.issueDate.getUTCFullYear(),
          );
          return tx.invoice.create({
            data: {
              userId,
              clientId: dto.clientId,
              invoiceNumber,
              issueDate: dates.issueDate,
              dueDate: dates.dueDate,
              subtotal: totals.subtotal,
              taxPercent: new Prisma.Decimal(dto.taxPercent ?? 0),
              discountAmount: new Prisma.Decimal(dto.discountAmount ?? 0),
              total: totals.total,
              currency: dto.currency ?? 'IDR',
              publicToken: this.createPublicToken(),
              items: {
                create: dto.items.map((item, index) => ({
                  description: item.description.trim(),
                  quantity: new Prisma.Decimal(item.quantity),
                  unitPrice: new Prisma.Decimal(item.unitPrice),
                  subtotal: totals.itemSubtotals[index],
                  sortOrder: item.sortOrder ?? index,
                })),
              },
            },
            include: { client: true, items: true },
          });
        });

        return { data: this.serializeInvoice(invoice) };
      } catch (error) {
        if (
          !this.isUniqueConstraintError(error) ||
          attempt === MAX_NUMBER_RETRIES - 1
        ) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Nomor invoice gagal dibuat, silakan coba lagi',
    );
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.getOwnedInvoice(userId, id);
    this.assertDraft(existing.status);

    const issueDate = dto.issueDate
      ? this.parseDateOnly(dto.issueDate, 'issueDate')
      : existing.issueDate;
    const dueDate = dto.dueDate
      ? this.parseDateOnly(dto.dueDate, 'dueDate')
      : existing.dueDate;
    this.assertDueDateIsValid(issueDate, dueDate);

    const items = dto.items ?? existing.items;
    const taxPercent = dto.taxPercent ?? existing.taxPercent;
    const discountAmount = dto.discountAmount ?? existing.discountAmount;
    const totals = this.calculateTotals(items, taxPercent, discountAmount);

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        taxPercent: new Prisma.Decimal(taxPercent),
        discountAmount: new Prisma.Decimal(discountAmount),
        total: totals.total,
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.items
          ? {
              items: {
                deleteMany: {},
                create: dto.items.map((item, index) => ({
                  description: item.description.trim(),
                  quantity: new Prisma.Decimal(item.quantity),
                  unitPrice: new Prisma.Decimal(item.unitPrice),
                  subtotal: totals.itemSubtotals[index],
                  sortOrder: item.sortOrder ?? index,
                })),
              },
            }
          : {}),
      },
      include: { client: true, items: true },
    });

    return { data: this.serializeInvoice(invoice) };
  }

  async remove(userId: string, id: string) {
    const existing = await this.getOwnedInvoice(userId, id);
    this.assertDraft(existing.status);
    await this.prisma.invoice.delete({ where: { id } });
  }

  // --- Sesi 2: dashboard summary ---

  async getSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

    const [
      totalReceivableResult,
      overdueCount,
      monthlyRevenueResult,
      monthlyInvoiceCount,
      recentInvoices,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { userId, status: { in: ['sent', 'viewed', 'overdue'] } },
        _sum: { total: true },
      }),
      this.prisma.invoice.count({ where: { userId, status: 'overdue' } }),
      this.prisma.payment.aggregate({
        where: {
          invoice: { userId },
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          dueDate: true,
          total: true,
          currency: true,
          client: { select: { name: true } },
        },
      }),
    ]);

    return {
      data: {
        totalReceivable: (
          totalReceivableResult._sum.total ?? new Prisma.Decimal(0)
        ).toNumber(),
        overdueCount,
        monthlyRevenue: (
          monthlyRevenueResult._sum.amount ?? new Prisma.Decimal(0)
        ).toNumber(),
        usage: { used: monthlyInvoiceCount, limit: 5 },
        recentInvoices: recentInvoices.map((inv) => ({
          ...inv,
          total: inv.total.toNumber(),
        })),
      },
    };
  }

  // --- Sesi 3: status transitions ---

  async send(userId: string, id: string) {
    const invoice = await this.getOwnedInvoice(userId, id);

    if (invoice.status !== 'draft') {
      throw new ConflictException(
        'Hanya invoice draft yang dapat ditandai terkirim',
      );
    }

    // Kirim email ke client dulu supaya kalau gagal, status tetap draft
    // dan user bisa coba lagi. Kalau client tidak punya email, lewati
    // (invoice tetap bisa ditandai terkirim secara manual).
    if (invoice.client.email) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await this.sendInvoiceEmail(invoice, user?.name ?? 'Faktura');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
      include: { client: true, items: true },
    });

    await this.reminders.generateReminders(id, updated.dueDate);

    return { data: this.serializeInvoice(updated) };
  }

  async cancel(userId: string, id: string) {
    const invoice = await this.getOwnedInvoice(userId, id);

    if (invoice.status === 'paid') {
      throw new ConflictException(
        'Invoice yang sudah lunas tidak dapat dibatalkan',
      );
    }
    if (invoice.status === 'cancelled') {
      throw new ConflictException('Invoice sudah dibatalkan');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { client: true, items: true },
    });

    await this.reminders.cancelPendingReminders(id);

    return { data: this.serializeInvoice(updated) };
  }

  private async getOwnedInvoice(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { client: true, items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice tidak ditemukan');
    }

    return invoice;
  }

  private validateDates(issueDateValue: string, dueDateValue: string) {
    const issueDate = this.parseDateOnly(issueDateValue, 'issueDate');
    const dueDate = this.parseDateOnly(dueDateValue, 'dueDate');
    this.assertDueDateIsValid(issueDate, dueDate);
    return { issueDate, dueDate };
  }

  private parseDateOnly(value: string, field: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} harus berformat YYYY-MM-DD`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} tidak valid`);
    }

    return date;
  }

  private assertDueDateIsValid(issueDate: Date, dueDate: Date) {
    if (dueDate < issueDate) {
      throw new UnprocessableEntityException(
        'Tanggal jatuh tempo tidak boleh sebelum tanggal invoice dibuat',
      );
    }
  }

  private assertDraft(status: string) {
    if (status !== 'draft') {
      throw new ConflictException(
        'Hanya invoice draft yang dapat diubah atau dihapus',
      );
    }
  }

  private calculateTotals(
    items: Parameters<typeof calculateInvoiceTotals>[0],
    taxPercent: Parameters<typeof calculateInvoiceTotals>[1],
    discountAmount: Parameters<typeof calculateInvoiceTotals>[2],
  ) {
    try {
      return calculateInvoiceTotals(items, taxPercent, discountAmount);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Diskon tidak boleh melebihi subtotal'
      ) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    year: number,
  ) {
    const prefix = `INV-${year}-`;
    const latest = await tx.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const latestSequence = latest
      ? Number(latest.invoiceNumber.slice(prefix.length))
      : 0;
    const nextSequence = Number.isSafeInteger(latestSequence)
      ? latestSequence + 1
      : 1;
    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
  }

  private createPublicToken() {
    return randomBytes(32).toString('hex');
  }

  private async sendInvoiceEmail(invoice: any, senderName: string) {
    const clientEmail = invoice.client.email;
    if (!clientEmail) return;

    const formatted = this.formatInvoiceForEmail(invoice);

    await this.resend.emails.send({
      from:
        process.env.EMAIL_FROM ??
        'Faktura <noreply@faktura.muhamadrizky.my.id>',
      to: clientEmail,
      subject: `Invoice ${formatted.invoiceNumber} dari ${senderName}`,
      html: this.buildInvoiceHtml(formatted, senderName),
    });
  }

  private formatInvoiceForEmail(invoice: any) {
    const currency = invoice.currency ?? 'IDR';
    const fmt = (value: unknown) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Number(value));

    return {
      invoiceNumber: invoice.invoiceNumber as string,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      currency,
      clientName: invoice.client.name as string,
      subtotal: fmt(invoice.subtotal),
      taxPercent: invoice.taxPercent.toNumber(),
      taxAmount: fmt(
        invoice.total.toNumber() -
          invoice.subtotal.toNumber() +
          invoice.discountAmount.toNumber(),
      ),
      discountAmount: fmt(invoice.discountAmount),
      total: fmt(invoice.total),
      items: invoice.items.map((item: any) => ({
        description: item.description as string,
        quantity: item.quantity.toNumber(),
        unitPrice: fmt(item.unitPrice),
        subtotal: fmt(item.subtotal),
      })),
    };
  }

  private buildInvoiceHtml(
    data: ReturnType<InvoicesService['formatInvoiceForEmail']>,
    senderName: string,
  ): string {
    const rows = data.items
      .map(
        (item) => `
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#2d3748;font-size:14px;">${item.description}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#4a5568;font-size:14px;text-align:right;">${item.quantity}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#4a5568;font-size:14px;text-align:right;">${item.unitPrice}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#1a365d;font-size:14px;font-weight:600;text-align:right;">${item.subtotal}</td>
                </tr>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
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
              <h2 style="margin:0 0 8px;color:#1a365d;font-size:18px;font-weight:600;">Invoice ${data.invoiceNumber}</h2>
              <p style="margin:0 0 24px;color:#718096;font-size:13px;">
                Dari <strong>${senderName}</strong> untuk <strong>${data.clientName}</strong>
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-right:16px;">Tanggal</td>
                  <td style="color:#2d3748;font-size:14px;font-weight:600;">${data.issueDate}</td>
                  <td style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;padding-right:16px;">Jatuh Tempo</td>
                  <td style="color:#2d3748;font-size:14px;font-weight:600;">${data.dueDate}</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background-color:#f7fafc;">
                    <th style="padding:12px 16px;text-align:left;color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Deskripsi</th>
                    <th style="padding:12px 16px;text-align:right;color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                    <th style="padding:12px 16px;text-align:right;color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Harga</th>
                    <th style="padding:12px 16px;text-align:right;color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${rows}
                </tbody>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-left:auto;max-width:280px;">
                <tr>
                  <td style="padding:4px 0;color:#718096;font-size:14px;">Subtotal</td>
                  <td style="padding:4px 0;color:#2d3748;font-size:14px;text-align:right;">${data.subtotal}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#718096;font-size:14px;">Diskon</td>
                  <td style="padding:4px 0;color:#2d3748;font-size:14px;text-align:right;">-${data.discountAmount}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#718096;font-size:14px;">Pajak (${data.taxPercent}%)</td>
                  <td style="padding:4px 0;color:#2d3748;font-size:14px;text-align:right;">${data.taxAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;border-top:2px solid #1a365d;color:#1a365d;font-size:15px;font-weight:600;">Total</td>
                  <td style="padding:12px 0 0;border-top:2px solid #1a365d;color:#1a365d;font-size:16px;font-weight:700;text-align:right;">${data.total}</td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#4a5568;font-size:14px;line-height:1.6;">
                Mohon melakukan pembayaran sebelum tanggal jatuh tempo. Jika ada pertanyaan, silakan balas email ini.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:11px;text-align:center;">
                Email ini dikirim otomatis oleh sistem Faktura.
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

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private serializeInvoice(invoice: any) {
    return {
      ...invoice,
      subtotal: invoice.subtotal.toNumber(),
      taxPercent: invoice.taxPercent.toNumber(),
      discountAmount: invoice.discountAmount.toNumber(),
      total: invoice.total.toNumber(),
      items: invoice.items.map((item: any) => ({
        ...item,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(),
        subtotal: item.subtotal.toNumber(),
      })),
    };
  }
}
