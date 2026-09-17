import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { GetLatestRateQuery } from './dto/get-latest-rate.query';
import { RegisterExchangeRateDto } from './dto/register-exchange-rate.dto';

@ApiTags('currency')
@Controller('currency-rates')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra uma nova cotação (atualização manual da mesa)' })
  registerRate(@Body() dto: RegisterExchangeRateDto) {
    return this.currencyService.registerRate(dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Taxa vigente para o par informado (default: momento atual)' })
  getLatest(@Query() query: GetLatestRateQuery) {
    const at = query.at ? new Date(query.at) : undefined;
    return this.currencyService.getLatestRate(query.base, query.quote, at);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de cotações registradas para o par informado' })
  getHistory(@Query() query: GetLatestRateQuery) {
    return this.currencyService.getHistory(query.base, query.quote);
  }
}
