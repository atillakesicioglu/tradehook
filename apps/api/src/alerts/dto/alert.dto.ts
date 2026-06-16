import {

  IsBoolean,

  IsEnum,

  IsNumber,

  IsOptional,

  IsString,

  Matches,

  MaxLength,

  MinLength,

  Min,

  ValidateIf,

} from 'class-validator';

import { MarketType, OrderSide, OrderType, RiskType } from '@tradehook/shared';



export enum SlTpModeDto {

  PERCENT = 'PERCENT',

  USDT = 'USDT',

}



export class CreateAlertDto {

  @IsString()

  @MinLength(1)

  @MaxLength(80)

  name!: string;



  @IsString()

  @Matches(/^[A-Za-z0-9]{5,20}$/, { message: 'Symbol must look like BTCUSDT' })

  symbol!: string;



  @IsOptional()

  @IsEnum(MarketType)

  marketType?: MarketType;



  @IsEnum(OrderSide)

  side!: OrderSide;



  @IsOptional()

  @IsEnum(OrderType)

  orderType?: OrderType;



  @IsOptional()

  @IsEnum(RiskType)

  riskType?: RiskType;



  @IsNumber()

  @Min(0.00000001)

  riskValue!: number;



  @IsOptional()

  @IsBoolean()

  isActive?: boolean;



  @IsOptional()

  @IsBoolean()

  stopLossEnabled?: boolean;



  @ValidateIf((o) => o.stopLossEnabled === true)

  @IsEnum(SlTpModeDto)

  stopLossMode?: SlTpModeDto;



  @ValidateIf((o) => o.stopLossEnabled === true)

  @IsNumber()

  @Min(0.00000001)

  stopLossValue?: number;



  @IsOptional()

  @IsBoolean()

  takeProfitEnabled?: boolean;



  @ValidateIf((o) => o.takeProfitEnabled === true)

  @IsEnum(SlTpModeDto)

  takeProfitMode?: SlTpModeDto;



  @ValidateIf((o) => o.takeProfitEnabled === true)

  @IsNumber()

  @Min(0.00000001)

  takeProfitValue?: number;

}



export class UpdateAlertDto {

  @IsOptional()

  @IsString()

  @MaxLength(80)

  name?: string;



  @IsOptional()

  @IsBoolean()

  isActive?: boolean;



  @IsOptional()

  @IsNumber()

  @Min(0.00000001)

  riskValue?: number;



  @IsOptional()

  @IsEnum(OrderSide)

  side?: OrderSide;

}


