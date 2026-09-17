import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';

const SUPPORTED_CURRENCIES = ['USD', 'BRL'] as const;

export class RegisterExchangeRateDto {
  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'USD' })
  @IsIn(SUPPORTED_CURRENCIES)
  baseCurrency!: string;

  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'BRL' })
  @IsIn(SUPPORTED_CURRENCIES)
  quoteCurrency!: string;

  @ApiProperty({
    description: 'Quantas unidades de quoteCurrency valem 1 baseCurrency, como string decimal.',
    example: '5.4321',
  })
  @Matches(/^\d{1,12}(\.\d{1,6})?$/, {
    message: 'rate deve ser uma string decimal positiva (ex.: "5.4321")',
  })
  rate!: string;

  @ApiPropertyOptional({
    description: 'Timestamp ISO 8601 de vigência da taxa. Default: agora.',
    example: '2026-09-17T14:30:00Z',
  })
  @IsOptional()
  @IsISO8601()
  effectiveAt?: string;
}
