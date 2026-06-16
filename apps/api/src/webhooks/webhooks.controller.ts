import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

// Public endpoint: TradingView calls this, so it must not require auth.
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('tradingview/:token')
  @HttpCode(200)
  handle(@Param('token') token: string, @Body() body: unknown) {
    return this.webhooks.handle(token, body);
  }
}
