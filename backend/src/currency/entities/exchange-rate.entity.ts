import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Registro append-only de taxa de câmbio. Nunca é atualizado in-place: uma
 * nova cotação sempre gera uma nova linha, com sua própria vigência — assim
 * o histórico de taxas fica auditável (igual ao princípio de imutabilidade
 * das liquidações, seção 4.1.4 do desafio).
 *
 * Convenção: rate = quantas unidades de quoteCurrency valem 1 baseCurrency.
 * Ex.: baseCurrency='USD', quoteCurrency='BRL', rate='5.4321' => 1 USD = R$5,4321.
 */
@Entity('exchange_rates')
@Index(['baseCurrency', 'quoteCurrency', 'effectiveAt'])
export class ExchangeRateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'char', length: 3 })
  baseCurrency!: string;

  @Column({ type: 'char', length: 3 })
  quoteCurrency!: string;

  /**
   * NUMERIC no Postgres, exposto como string pelo driver `pg` — evita
   * coerção para float em qualquer ponto do caminho até o decimal.js.
   */
  @Column({ type: 'numeric', precision: 18, scale: 6 })
  rate!: string;

  @Column({ type: 'timestamptz' })
  effectiveAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
