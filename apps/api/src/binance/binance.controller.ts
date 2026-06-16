import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BinanceService } from './binance.service';
import { ConnectBinanceDto } from './dto/binance.dto';

@Controller('binance')
@UseGuards(AuthGuard)
export class BinanceController {
  constructor(private readonly binance: BinanceService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.binance.getStatus(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectBinanceDto) {
    return this.binance.connect(user.id, dto);
  }

  @Post('test')
  test(@CurrentUser() user: AuthUser) {
    return this.binance.testConnection(user.id);
  }

  @Delete()
  disconnect(@CurrentUser() user: AuthUser) {
    return this.binance.disconnect(user.id);
  }

  @Get('balance')
  balance(@CurrentUser() user: AuthUser) {
    return this.binance.getBalance(user.id);
  }

  @Get('symbols')
  symbols(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.binance.searchSymbols(user.id, q);
  }

  @Get('holdings')
  holdings(@CurrentUser() user: AuthUser) {
    return this.binance.getHoldings(user.id);
  }
}
