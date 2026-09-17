import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';

const SUPPORTED_CURRENCIES = ['USD', 'BRL'] as const;

export class GetLatestRateQuery {
  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES, default: 'USD' })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  base: string = 'USD';

  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES, default: 'BRL' })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  quote: string = 'BRL';

  @ApiPropertyOptional({
    description: 'Momento para o qual buscar a taxa vigente. Default: agora.',
    example: '2026-09-17T14:30:00Z',
  })
  @IsOptional()
  @IsISO8601()
  at?: string;
}
