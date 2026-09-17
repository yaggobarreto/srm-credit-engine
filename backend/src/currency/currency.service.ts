import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ExchangeRateEntity } from './entities/exchange-rate.entity';

export interface RegisterRateInput {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveAt?: string;
}

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(ExchangeRateEntity)
    private readonly exchangeRateRepository: Repository<ExchangeRateEntity>,
  ) {}

  /**
   * Registra uma nova cotação. Nunca atualiza uma linha existente — cada
   * chamada gera um novo registro de vigência, preservando o histórico.
   */
  async registerRate(input: RegisterRateInput): Promise<ExchangeRateEntity> {
    if (input.baseCurrency === input.quoteCurrency) {
      throw new BadRequestException('baseCurrency e quoteCurrency não podem ser iguais');
    }
    if (!new Decimal(input.rate).greaterThan(0)) {
      throw new BadRequestException('rate deve ser um valor positivo');
    }

    const entity = this.exchangeRateRepository.create({
      baseCurrency: input.baseCurrency,
      quoteCurrency: input.quoteCurrency,
      rate: input.rate,
      effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : new Date(),
    });

    return this.exchangeRateRepository.save(entity);
  }

  /**
   * Taxa vigente em `at` (default: agora) — a última cotação cuja vigência
   * não é futura em relação a `at`. É a política definida em SPEC.md 1.4
   * para quando a liquidação não informa câmbio explicitamente.
   */
  async getLatestRate(
    baseCurrency: string,
    quoteCurrency: string,
    at: Date = new Date(),
  ): Promise<ExchangeRateEntity> {
    const rate = await this.exchangeRateRepository.findOne({
      where: {
        baseCurrency,
        quoteCurrency,
        effectiveAt: LessThanOrEqual(at),
      },
      order: { effectiveAt: 'DESC' },
    });

    if (!rate) {
      throw new NotFoundException(
        `Nenhuma taxa vigente para ${baseCurrency}/${quoteCurrency} em ${at.toISOString()}`,
      );
    }

    return rate;
  }

  async getHistory(baseCurrency: string, quoteCurrency: string): Promise<ExchangeRateEntity[]> {
    return this.exchangeRateRepository.find({
      where: { baseCurrency, quoteCurrency },
      order: { effectiveAt: 'DESC' },
    });
  }
}
