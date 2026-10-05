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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('api/v1/clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  findAll(@GetUser('id') userId: string, @Query('search') search?: string) {
    return this.clients.findAll(userId, search?.trim());
  }

  @Get(':id')
  findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.clients.findOne(userId, id);
  }

  @Post()
  create(@GetUser('id') userId: string, @Body() dto: CreateClientDto) {
    return this.clients.create(userId, dto);
  }

  @Patch(':id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    await this.clients.remove(userId, id);
  }
}
