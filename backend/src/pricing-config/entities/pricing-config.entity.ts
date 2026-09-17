import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Taxa base da mesa, com vigência (SPEC.md 1.2) — mesmo princípio
 * append-only do ExchangeRateEntity: atualizar a taxa nunca sobrescreve a
 * anterior, sempre insere uma nova linha vigente a partir de uma data.
 */
@Entity('pricing_configs')
@Index(['effectiveAt'])
export class PricingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'numeric', precision: 8, scale: 6 })
  baseRate!: string;

  @Column({ type: 'timestamptz' })
  effectiveAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
