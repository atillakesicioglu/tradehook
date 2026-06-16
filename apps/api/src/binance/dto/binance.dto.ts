import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MarketType } from '@tradehook/shared';

export class ConnectBinanceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  apiKey!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(256)
  secretKey!: string;

  @IsOptional()
  @IsEnum(MarketType)
  accountType?: MarketType;

  @IsOptional()
  @IsBoolean()
  useTestnet?: boolean;
}
