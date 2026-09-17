import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class SettleReceivableDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receivableId!: string;

  @ApiPropertyOptional({
    description:
      'Câmbio explícito para liquidação em USD (SPEC.md 1.4). Quando omitido, ' +
      'usa a taxa vigente no momento da liquidação.',
    example: '5.4321',
  })
  @IsOptional()
  @Matches(/^\d{1,12}(\.\d{1,6})?$/, { message: 'exchangeRate deve ser uma string decimal' })
  exchangeRate?: string;
}
