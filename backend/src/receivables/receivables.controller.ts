import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { ReceivablesService } from './receivables.service';

@ApiTags('receivables')
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um recebível para futura liquidação' })
  create(@Body() dto: CreateReceivableDto) {
    return this.receivablesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista recebíveis' })
  findAll() {
    return this.receivablesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um recebível' })
  findOne(@Param('id') id: string) {
    return this.receivablesService.findById(id);
  }
}
