import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import { ReceivableType } from '../receivable-type.enum';

export class SimulatePricingDto {
  @ApiProperty({ enum: ReceivableType })
  @IsEnum(ReceivableType)
  type!: ReceivableType;

  @ApiProperty({ description: 'Valor de face, string decimal.', example: '100000.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'faceValue deve ser uma string decimal positiva' })
  faceValue!: string;

  @ApiPropertyOptional({
    description: 'Data da cessão/operação (ISO 8601). Default: agora.',
    example: '2026-09-17T12:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  operationDate?: string;

  @ApiProperty({ description: 'Data de vencimento (ISO 8601).', example: '2026-12-17T12:00:00Z' })
  @IsISO8601()
  dueDate!: string;

  @ApiProperty({ enum: ['BRL', 'USD'], example: 'BRL' })
  @IsIn(['BRL', 'USD'])
  paymentCurrency!: 'BRL' | 'USD';

  @ApiPropertyOptional({
    description: 'Câmbio explícito (SPEC.md 1.4). Quando omitido, usa a taxa vigente.',
    example: '5.4321',
  })
  @IsOptional()
  @Matches(/^\d{1,12}(\.\d{1,6})?$/, { message: 'exchangeRate deve ser uma string decimal' })
  exchangeRate?: string;
}
