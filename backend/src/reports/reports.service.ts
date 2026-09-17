import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceivableEntity } from '../receivables/entities/receivable.entity';
import { SettlementEntity } from '../settlements/entities/settlement.entity';

export interface SettlementsReportFilter {
  from?: string;
  to?: string;
  cedente?: string;
  currency?: 'BRL' | 'USD';
  page: number;
  pageSize: number;
}

export interface SettlementReportRow {
  id: string;
  receivableId: string;
  cedente: string;
  receivableType: string;
  faceValue: string;
  presentValueBRL: string;
  discountBRL: string;
  paymentCurrency: string;
  exchangeRateUsed: string | null;
  finalAmount: string;
  settledAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Extrato de liquidações (seção 4.1.6 do desafio). Usa query builder em vez
 * de repository.find() puro (diferencial pedido para pleno+): o filtro por
 * cedente exige um JOIN com receivables, que o ORM não modela como relação
 * formal (settlements guarda só o snapshot dos valores usados no cálculo,
 * não uma FK gerenciada) — faz mais sentido montar essa query explicitamente
 * do que forçar uma relação só para isso.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SettlementEntity)
    private readonly settlementRepository: Repository<SettlementEntity>,
  ) {}

  async findSettlements(filter: SettlementsReportFilter): Promise<PaginatedResult<SettlementReportRow>> {
    const qb = this.settlementRepository
      .createQueryBuilder('s')
      .innerJoin(ReceivableEntity, 'r', 'r.id = s.receivableId')
      .select('s.id', 'id')
      .addSelect('s.receivableId', 'receivableId')
      .addSelect('r.cedente', 'cedente')
      .addSelect('s.receivableType', 'receivableType')
      .addSelect('s.faceValue', 'faceValue')
      .addSelect('s.presentValueBRL', 'presentValueBRL')
      .addSelect('s.discountBRL', 'discountBRL')
      .addSelect('s.paymentCurrency', 'paymentCurrency')
      .addSelect('s.exchangeRateUsed', 'exchangeRateUsed')
      .addSelect('s.finalAmount', 'finalAmount')
      .addSelect('s.settledAt', 'settledAt');

    if (filter.from) {
      qb.andWhere('s.settledAt >= :from', { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere('s.settledAt <= :to', { to: filter.to });
    }
    if (filter.cedente) {
      qb.andWhere('r.cedente ILIKE :cedente', { cedente: `%${filter.cedente}%` });
    }
    if (filter.currency) {
      qb.andWhere('s.paymentCurrency = :currency', { currency: filter.currency });
    }

    const total = await qb.clone().getCount();

    const data = await qb
      .orderBy('s.settledAt', 'DESC')
      .offset((filter.page - 1) * filter.pageSize)
      .limit(filter.pageSize)
      .getRawMany<SettlementReportRow>();

    return { data, total, page: filter.page, pageSize: filter.pageSize };
  }
}
