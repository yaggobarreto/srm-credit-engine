import { useState } from 'react';
import { ApiError } from '../../api/client';
import { createReceivable } from '../../api/receivablesApi';
import { settleReceivable } from '../../api/settlementsApi';
import { usePricingSimulation } from '../../hooks/usePricingSimulation';
import type { PaymentCurrency, ReceivableType, Settlement } from '../../types/domain';
import { RECEIVABLE_TYPE_LABELS } from '../../types/domain';
import { formatDate, formatMoney, formatPercent } from '../../utils/formatMoney';
import { isValidDateRange, isValidPositiveDecimal } from '../../utils/validation';
import './OperatorPanel.css';

function todayAsDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDateTime(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

interface OperatorPanelProps {
  /** Avisa o container quando uma liquidação é concluída (ex.: refresh do grid). */
  onSettled: () => void;
}

export function OperatorPanel({ onSettled }: OperatorPanelProps) {
  const [type, setType] = useState<ReceivableType>('DUPLICATA_MERCANTIL');
  const [cedente, setCedente] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [operationDate, setOperationDate] = useState(todayAsDateInput());
  const [dueDate, setDueDate] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentCurrency>('BRL');
  const [exchangeRate, setExchangeRate] = useState('');

  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [lastSettlement, setLastSettlement] = useState<Settlement | null>(null);

  const canSimulate =
    isValidPositiveDecimal(faceValue) && isValidDateRange(operationDate, dueDate) && cedente.trim().length > 0;

  const { result, loading, error } = usePricingSimulation({
    type,
    faceValue,
    operationDate: toIsoDateTime(operationDate),
    dueDate: dueDate ? toIsoDateTime(dueDate) : '',
    paymentCurrency,
    exchangeRate,
    enabled: canSimulate,
  });

  async function handleSettle() {
    setSettling(true);
    setSettleError(null);
    try {
      const receivable = await createReceivable({
        type,
        cedente,
        faceValue,
        operationDate: toIsoDateTime(operationDate),
        dueDate: toIsoDateTime(dueDate),
        paymentCurrency,
      });

      const settlement = await settleReceivable(
        {
          receivableId: receivable.id,
          exchangeRate: paymentCurrency === 'USD' && exchangeRate ? exchangeRate : undefined,
        },
        crypto.randomUUID(),
      );

      setLastSettlement(settlement);
      setCedente('');
      setFaceValue('');
      setDueDate('');
      setExchangeRate('');
      onSettled();
    } catch (err) {
      setSettleError(err instanceof ApiError ? err.message : 'Erro ao liquidar o recebível');
    } finally {
      setSettling(false);
    }
  }

  return (
    <section className="operator-panel">
      <h2>Painel do operador</h2>

      <div className="operator-panel__grid">
        <form
          className="operator-panel__form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSettle();
          }}
        >
          <label>
            Tipo de recebível
            <select value={type} onChange={(e) => setType(e.target.value as ReceivableType)}>
              {Object.entries(RECEIVABLE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cedente
            <input
              type="text"
              value={cedente}
              onChange={(e) => setCedente(e.target.value)}
              placeholder="Nome da empresa cedente"
              required
            />
          </label>

          <label>
            Valor de face
            <input
              type="text"
              inputMode="decimal"
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.value)}
              placeholder="100000.00"
              required
            />
          </label>

          <div className="operator-panel__row">
            <label>
              Data da operação
              <input
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                required
              />
            </label>

            <label>
              Data de vencimento
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </label>
          </div>

          <div className="operator-panel__row">
            <label>
              Moeda de pagamento
              <select
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value as PaymentCurrency)}
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
              </select>
            </label>

            {paymentCurrency === 'USD' && (
              <label>
                Câmbio (opcional)
                <input
                  type="text"
                  inputMode="decimal"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="usa a taxa vigente se vazio"
                />
              </label>
            )}
          </div>

          <button type="submit" disabled={!result || settling}>
            {settling ? 'Liquidando…' : 'Liquidar recebível'}
          </button>

          {settleError && <p className="operator-panel__error">{settleError}</p>}
        </form>

        <aside className="operator-panel__simulation">
          <h3>Simulação em tempo real</h3>

          {!canSimulate && <p className="operator-panel__hint">Preencha os campos para simular.</p>}
          {loading && <p className="operator-panel__hint">Calculando…</p>}
          {error && <p className="operator-panel__error">{error}</p>}

          {result && (
            <dl className="operator-panel__result">
              <div>
                <dt>Prazo</dt>
                <dd>{result.termMonths} mês(es)</dd>
              </div>
              <div>
                <dt>Taxa base + spread</dt>
                <dd>
                  {formatPercent(result.baseRateUsed)} + {formatPercent(result.spread)}
                </dd>
              </div>
              <div>
                <dt>Valor presente (BRL)</dt>
                <dd>{formatMoney(result.presentValueBRL, 'BRL')}</dd>
              </div>
              <div>
                <dt>Deságio (BRL)</dt>
                <dd>{formatMoney(result.discountBRL, 'BRL')}</dd>
              </div>
              {result.exchangeRateUsed && (
                <div>
                  <dt>Câmbio usado</dt>
                  <dd>{result.exchangeRateUsed}</dd>
                </div>
              )}
              <div className="operator-panel__result-final">
                <dt>Valor líquido ({result.paymentCurrency})</dt>
                <dd>{formatMoney(result.finalAmount, result.paymentCurrency)}</dd>
              </div>
            </dl>
          )}

          {lastSettlement && (
            <p className="operator-panel__success">
              Liquidado: {formatMoney(lastSettlement.finalAmount, lastSettlement.paymentCurrency)} em{' '}
              {formatDate(lastSettlement.settledAt)}
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
