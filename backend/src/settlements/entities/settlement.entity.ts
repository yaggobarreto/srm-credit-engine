import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ReceivableType } from '../../pricing/receivable-type.enum';

/**
 * Registro imutável de liquidação (seção 4.1.4 do desafio). Não existe
 * update/delete nesta entidade em nenhum lugar do código — nem repositório,
 * nem controller expõem essa operação. Cada linha grava um "snapshot" dos
 * valores efetivamente usados (taxa base, spread, câmbio), para que a
 * auditoria não dependa de reconstruir o estado de outras tabelas no
 * passado.
 *
 * Duas constraints de unicidade sustentam a idempotência e a proteção
 * contra liquidação duplicada (ver SettlementsService):
 *  - idempotencyKey: uma repetição da mesma requisição (retry de rede,
 *    duplo clique) nunca gera uma segunda linha.
 *  - receivableId: um recebível só pode ser liquidado uma única vez, ainda
 *    que duas requisições concorrentes cheguem com idempotencyKey diferentes.
 */
@Entity('settlements')
export class SettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index({ unique: true })
  idempotencyKey!: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  receivableId!: string;

  @Column({ type: 'enum', enum: ReceivableType })
  receivableType!: ReceivableType;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  faceValue!: string;

  @Column({ type: 'int' })
  termMonths!: number;

  @Column({ type: 'numeric', precision: 8, scale: 6 })
  baseRateUsed!: string;

  @Column({ type: 'numeric', precision: 8, scale: 6 })
  spreadUsed!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  presentValueBRL!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  discountBRL!: string;

  @Column({ type: 'char', length: 3 })
  paymentCurrency!: 'BRL' | 'USD';

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true })
  exchangeRateUsed!: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  finalAmount!: string;

  @Column({ type: 'timestamptz' })
  settledAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
