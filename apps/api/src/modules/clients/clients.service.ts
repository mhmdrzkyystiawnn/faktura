import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    const clients = await this.prisma.client.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: clients };
  }

  async findOne(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
    });

    if (!client) {
      throw new NotFoundException('Client tidak ditemukan');
    }

    return { data: client };
  }

  async create(userId: string, dto: CreateClientDto) {
    const client = await this.prisma.client.create({
      data: {
        userId,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
      },
    });

    return { data: client };
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    await this.assertOwned(userId, id);

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() || null }
          : {}),
      },
    });

    return { data: client };
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.client.delete({ where: { id } });
  }

  private async assertOwned(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException('Client tidak ditemukan');
    }
  }
}
