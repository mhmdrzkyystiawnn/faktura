import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { calculateInvoiceTotals } from './invoice-calculator';

const MAX_NUMBER_RETRIES = 3;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
  ) {}

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

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
      include: { client: true, items: true },
    });

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
