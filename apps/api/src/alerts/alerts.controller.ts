import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, CreateAlertPairDto, UpdateAlertDto } from './dto/alert.dto';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post('pairs')
  createPair(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertPairDto) {
    return this.alerts.createPair(user.id, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlertDto) {
    return this.alerts.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.alerts.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alerts.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alerts.update(user.id, id, dto);
  }

  @Delete('pairs/:pairId')
  removePair(@CurrentUser() user: AuthUser, @Param('pairId') pairId: string) {
    return this.alerts.removePair(user.id, pairId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alerts.remove(user.id, id);
  }
}
