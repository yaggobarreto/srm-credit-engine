import { useSettlementsReport } from '../../hooks/useSettlementsReport';
import { RECEIVABLE_TYPE_LABELS } from '../../types/domain';
import { formatDate, formatMoney } from '../../utils/formatMoney';
import './TransactionsGrid.css';

interface TransactionsGridProps {
  /** Muda a cada liquidação nova, força o grid a recarregar. */
  refreshKey: number;
}

export function TransactionsGrid({ refreshKey }: TransactionsGridProps) {
  const { cedente, setCedente, currency, setCurrency, page, setPage, pageSize, data, loading, error } =
    useSettlementsReport(refreshKey);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <section className="transactions-grid">
      <h2>Histórico de liquidações</h2>

      <div className="transactions-grid__filters">
        <input
          type="text"
          placeholder="Filtrar por cedente…"
          value={cedente}
          onChange={(e) => setCedente(e.target.value)}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)}>
          <option value="">Todas as moedas</option>
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {error && <p className="transactions-grid__error">{error}</p>}

      <div className="transactions-grid__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cedente</th>
              <th>Tipo</th>
              <th>Valor de face</th>
              <th>Valor presente</th>
              <th>Deságio</th>
              <th>Valor final</th>
              <th>Liquidado em</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="transactions-grid__hint">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="transactions-grid__hint">
                  Nenhuma liquidação encontrada.
                </td>
              </tr>
            )}
            {!loading &&
              data?.data.map((row) => (
                <tr key={row.id}>
                  <td>{row.cedente}</td>
                  <td>{RECEIVABLE_TYPE_LABELS[row.receivableType]}</td>
                  <td>{formatMoney(row.faceValue, 'BRL')}</td>
                  <td>{formatMoney(row.presentValueBRL, 'BRL')}</td>
                  <td>{formatMoney(row.discountBRL, 'BRL')}</td>
                  <td>{formatMoney(row.finalAmount, row.paymentCurrency)}</td>
                  <td>{formatDate(row.settledAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="transactions-grid__pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>
          Página {page} de {totalPages} · {data?.total ?? 0} liquidações
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Próxima
        </button>
      </div>
    </section>
  );
}
