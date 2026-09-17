import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceivableType } from '../../pricing/receivable-type.enum';
import { ReceivableStatus } from '../receivable-status.enum';

@Entity('receivables')
export class ReceivableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ReceivableType })
  type!: ReceivableType;

  @Column({ type: 'varchar', length: 200 })
  cedente!: string;

  /** NUMERIC exposto como string — nunca float (ver ExchangeRateEntity). */
  @Column({ type: 'numeric', precision: 18, scale: 2 })
  faceValue!: string;

  /** Data da cessão/operação — base para o cálculo do prazo. */
  @Column({ type: 'timestamptz' })
  operationDate!: Date;

  @Column({ type: 'timestamptz' })
  dueDate!: Date;

  @Column({ type: 'char', length: 3 })
  paymentCurrency!: 'BRL' | 'USD';

  @Column({ type: 'enum', enum: ReceivableStatus, default: ReceivableStatus.PENDING })
  @Index()
  status!: ReceivableStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
