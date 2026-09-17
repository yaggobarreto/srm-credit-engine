import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PricingConfigEntity } from './entities/pricing-config.entity';

@Injectable()
export class PricingConfigService {
  constructor(
    @InjectRepository(PricingConfigEntity)
    private readonly repository: Repository<PricingConfigEntity>,
  ) {}

  async registerBaseRate(baseRate: string, effectiveAt?: string): Promise<PricingConfigEntity> {
    if (!new Decimal(baseRate).greaterThan(0)) {
      throw new BadRequestException('baseRate deve ser um valor positivo');
    }

    const entity = this.repository.create({
      baseRate,
      effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
    });

    return this.repository.save(entity);
  }

  async getLatestBaseRate(at: Date = new Date()): Promise<PricingConfigEntity> {
    const config = await this.repository.findOne({
      where: { effectiveAt: LessThanOrEqual(at) },
      order: { effectiveAt: 'DESC' },
    });

    if (!config) {
      throw new NotFoundException(`Nenhuma taxa base vigente em ${at.toISOString()}`);
    }

    return config;
  }
}
