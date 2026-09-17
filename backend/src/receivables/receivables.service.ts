import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import { ReceivableEntity } from './entities/receivable.entity';
import { ReceivableStatus } from './receivable-status.enum';
import { ReceivableType } from '../pricing/receivable-type.enum';

export interface CreateReceivableInput {
  type: ReceivableType;
  cedente: string;
  faceValue: string;
  operationDate?: string;
  dueDate: string;
  paymentCurrency: 'BRL' | 'USD';
}

@Injectable()
export class ReceivablesService {
  constructor(
    @InjectRepository(ReceivableEntity)
    private readonly receivableRepository: Repository<ReceivableEntity>,
  ) {}

  async create(input: CreateReceivableInput): Promise<ReceivableEntity> {
    if (!new Decimal(input.faceValue).greaterThan(0)) {
      throw new BadRequestException('faceValue deve ser um valor positivo');
    }

    const operationDate = input.operationDate ? new Date(input.operationDate) : new Date();
    const dueDate = new Date(input.dueDate);
    if (dueDate <= operationDate) {
      throw new BadRequestException('dueDate deve ser posterior a operationDate');
    }

    const entity = this.receivableRepository.create({
      type: input.type,
      cedente: input.cedente,
      faceValue: input.faceValue,
      operationDate,
      dueDate,
      paymentCurrency: input.paymentCurrency,
      status: ReceivableStatus.PENDING,
    });

    return this.receivableRepository.save(entity);
  }

  async findById(id: string): Promise<ReceivableEntity> {
    const receivable = await this.receivableRepository.findOne({ where: { id } });
    if (!receivable) {
      throw new NotFoundException(`Recebível ${id} não encontrado`);
    }
    return receivable;
  }

  async findAll(): Promise<ReceivableEntity[]> {
    return this.receivableRepository.find({ order: { createdAt: 'DESC' } });
  }
}
