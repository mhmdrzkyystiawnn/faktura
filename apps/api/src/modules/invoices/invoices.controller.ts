import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('api/v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  findAll(@GetUser('id') userId: string, @Query() query: InvoiceQueryDto) {
    return this.invoices.findAll(userId, query);
  }

  @Get('summary')
  getSummary(@GetUser('id') userId: string) {
    return this.invoices.getSummary(userId);
  }

  @Get(':id')
  findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.invoices.findOne(userId, id);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(@GetUser('id') userId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(userId, dto);
  }

  @Patch(':id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoices.update(userId, id, dto);
  }

  @Patch(':id/send')
  send(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.invoices.send(userId, id);
  }

  @Patch(':id/cancel')
  cancel(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.invoices.cancel(userId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    await this.invoices.remove(userId, id);
  }
}
