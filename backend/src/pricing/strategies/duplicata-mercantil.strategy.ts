import Decimal from 'decimal.js';
import { Injectable } from '@nestjs/common';
import { ReceivableType } from '../receivable-type.enum';
import { BasePricingStrategy } from './base-pricing.strategy';

/** Duplicata Mercantil: spread de 1,5% a.m. (seção 4.1.2 do desafio). */
@Injectable()
export class DuplicataMercantilStrategy extends BasePricingStrategy {
  readonly receivableType = ReceivableType.DUPLICATA_MERCANTIL;
  protected readonly spread = new Decimal('0.015');
}
