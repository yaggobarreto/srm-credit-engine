import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional, Length, Matches } from 'class-validator';
import { ReceivableType } from '../../pricing/receivable-type.enum';

export class CreateReceivableDto {
  @ApiProperty({ enum: ReceivableType })
  @IsEnum(ReceivableType)
  type!: ReceivableType;

  @ApiProperty({ example: 'Comércio de Tecidos LTDA' })
  @Length(1, 200)
  cedente!: string;

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
}
