import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import { isUniqueViolation } from '../common/db/unique-violation';
import { Money } from '../common/money/money';
import { PricingResolutionService } from '../pricing/pricing-resolution.service';
import { ReceivableEntity } from '../receivables/entities/receivable.entity';
import { ReceivableStatus } from '../receivables/receivable-status.enum';
import { SettlementEntity } from './entities/settlement.entity';

export interface SettleReceivableInput {
  receivableId: string;
  /** Ver SPEC.md 1.4: se informado, tem prioridade sobre a taxa vigente. */
  exchangeRate?: string;
}

export interface SettleReceivableOutput {
  settlement: SettlementEntity;
  /** true quando esta é uma repetição idempotente (mesma Idempotency-Key). */
  replayed: boolean;
}

@Injectable()
export class SettlementsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly pricingResolutionService: PricingResolutionService,
  ) {}

  async settle(input: SettleReceivableInput, idempotencyKey: string): Promise<SettleReceivableOutput> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Header Idempotency-Key é obrigatório');
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock pessimista na linha do recebível: serializa qualquer outra
      // tentativa de liquidação (retry concorrente com a mesma chave, ou
      // uma segunda liquidação genuína) até esta transação terminar.
      const receivable = await manager.findOne(ReceivableEntity, {
        where: { id: input.receivableId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!receivable) {
        throw new NotFoundException(`Recebível ${input.receivableId} não encontrado`);
      }

      // Com o lock já adquirido, esta checagem é a fonte da verdade sobre
      // "este recebível já foi liquidado?" — não pode haver corrida aqui.
      const existing = await manager.findOne(SettlementEntity, {
        where: { receivableId: receivable.id },
      });
      if (existing) {
        if (existing.idempotencyKey === idempotencyKey) {
          return { settlement: existing, replayed: true };
        }
        throw new ConflictException(`Recebível ${receivable.id} já foi liquidado`);
      }

      const pricingResult = await this.pricingResolutionService.resolve({
        type: receivable.type,
        faceValue: Money.fromString(receivable.faceValue),
        operationDate: receivable.operationDate,
        dueDate: receivable.dueDate,
        paymentCurrency: receivable.paymentCurrency,
        exchangeRateOverride: input.exchangeRate ? new Decimal(input.exchangeRate) : undefined,
      });

      const settlement = manager.create(SettlementEntity, {
        idempotencyKey,
        receivableId: receivable.id,
        receivableType: receivable.type,
        faceValue: receivable.faceValue,
        termMonths: pricingResult.termMonths,
        baseRateUsed: pricingResult.baseRateUsed.toFixed(6),
        spreadUsed: pricingResult.spread.toFixed(6),
        presentValueBRL: pricingResult.presentValueBRL.toFixed(2),
        discountBRL: pricingResult.discountBRL.toFixed(2),
        paymentCurrency: receivable.paymentCurrency,
        exchangeRateUsed: pricingResult.exchangeRateUsed ? pricingResult.exchangeRateUsed.toFixed(6) : null,
        finalAmount: pricingResult.finalAmount.toFixed(2),
        settledAt: new Date(),
      });

      try {
        await manager.save(settlement);
      } catch (error) {
        // Rede de segurança no nível do banco: se a mesma Idempotency-Key
        // foi (indevidamente) usada para outro recebível, a constraint
        // UNIQUE rejeita o insert em vez de deixar dois registros
        // divergentes coexistirem.
        if (isUniqueViolation(error)) {
          throw new ConflictException('Idempotency-Key já foi usada em outra liquidação');
        }
        throw error;
      }

      receivable.status = ReceivableStatus.SETTLED;
      await manager.save(receivable);

      return { settlement, replayed: false };
    });
  }

  async findById(id: string): Promise<SettlementEntity> {
    const settlement = await this.dataSource.getRepository(SettlementEntity).findOne({
      where: { id },
    });
    if (!settlement) {
      throw new NotFoundException(`Liquidação ${id} não encontrada`);
    }
    return settlement;
  }
}
