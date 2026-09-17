import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, Length, Max, Min } from 'class-validator';

export class GetSettlementsReportQuery {
  @ApiPropertyOptional({ description: 'Liquidações a partir desta data (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Liquidações até esta data (ISO 8601).' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtro por cedente (contém, case-insensitive).' })
  @IsOptional()
  @Length(1, 200)
  cedente?: string;

  @ApiPropertyOptional({ enum: ['BRL', 'USD'] })
  @IsOptional()
  @IsIn(['BRL', 'USD'])
  currency?: 'BRL' | 'USD';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
