import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const sub = await this.subscriptions.getOrCreate(user.id);
    return {
      plan: sub.plan,
      status: sub.status,
      monthlyTradeLimit: sub.monthlyTradeLimit,
      monthlyTradeCount: sub.monthlyTradeCount,
      periodStart: sub.periodStart,
    };
  }
}
