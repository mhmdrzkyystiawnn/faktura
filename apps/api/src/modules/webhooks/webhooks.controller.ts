import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('midtrans')
  @HttpCode(HttpStatus.OK)
  async handleMidtrans(@Body() body: Record<string, unknown>) {
    try {
      const result = await this.webhooks.handleMidtransNotification(
        body as never,
      );
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid notification');
    }
  }
}
