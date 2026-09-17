import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

export class RegisterBaseRateDto {
  @ApiProperty({ description: 'Taxa base mensal, decimal (1% = "0.01").', example: '0.01' })
  @Matches(/^\d{1}(\.\d{1,6})?$/, { message: 'baseRate deve ser uma string decimal (ex.: "0.01")' })
  baseRate!: string;

  @ApiPropertyOptional({
    description: 'Timestamp ISO 8601 de vigência. Default: agora.',
    example: '2026-09-17T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  effectiveAt?: string;
}
