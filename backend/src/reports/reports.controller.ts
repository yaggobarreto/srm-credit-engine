import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetSettlementsReportQuery } from './dto/get-settlements-report.query';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports/settlements')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Extrato de liquidações, paginado (server-side), com filtro por período/cedente/moeda',
  })
  findSettlements(@Query() query: GetSettlementsReportQuery) {
    return this.reportsService.findSettlements(query);
  }
}
