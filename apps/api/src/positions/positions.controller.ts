import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { PositionsService } from './positions.service';
import { MonitoredPositionsService } from './monitored-positions.service';

@Controller('positions')
@UseGuards(AuthGuard)
export class PositionsController {
  constructor(
    private readonly positions: PositionsService,
    private readonly monitored: MonitoredPositionsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.positions.findAll(user.id);
  }

  @Get('monitored')
  findMonitored(@CurrentUser() user: AuthUser) {
    return this.monitored.findAll(user.id);
  }

  @Post(':id/sell')
  sell(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.monitored.sellPosition(user.id, id);
  }
}
