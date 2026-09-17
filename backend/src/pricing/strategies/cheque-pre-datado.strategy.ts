import Decimal from 'decimal.js';
import { Injectable } from '@nestjs/common';
import { ReceivableType } from '../receivable-type.enum';
import { BasePricingStrategy } from './base-pricing.strategy';

/** Cheque Pré-datado: spread de 2,5% a.m. (seção 4.1.2 do desafio). */
@Injectable()
export class ChequePreDatadoStrategy extends BasePricingStrategy {
  readonly receivableType = ReceivableType.CHEQUE_PRE_DATADO;
  protected readonly spread = new Decimal('0.025');
}
