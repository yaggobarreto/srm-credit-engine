import { Body, Controller, Get, Headers, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SettleReceivableDto } from './dto/settle-receivable.dto';
import { SettlementsService } from './settlements.service';

@ApiTags('settlements')
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Chave única por tentativa de liquidação. Repetir a mesma chave retorna o resultado original.',
  })
  @ApiOperation({ summary: 'Liquida um recebível (idempotente, ACID, gera registro imutável)' })
  async settle(
    @Body() dto: SettleReceivableDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { settlement, replayed } = await this.settlementsService.settle(dto, idempotencyKey);
    res.status(replayed ? HttpStatus.OK : HttpStatus.CREATED);
    if (replayed) {
      res.setHeader('Idempotent-Replayed', 'true');
    }
    return settlement;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma liquidação (registro imutável)' })
  findOne(@Param('id') id: string) {
    return this.settlementsService.findById(id);
  }
}
