import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { listSettlements } from '../api/reportsApi';
import type { PaginatedResult, PaymentCurrency, SettlementReportRow } from '../types/domain';

const DEBOUNCE_MS = 400;
const PAGE_SIZE = 10;

/**
 * Estado + busca do extrato (seção 4.1.6/4.2.2): filtro por cedente (com
 * debounce, é texto livre) e por moeda, paginação server-side. `refreshKey`
 * é incrementado pelo container quando uma liquidação nova acontece, para
 * o grid recarregar sem precisar de estado global compartilhado.
 */
export function useSettlementsReport(refreshKey: number) {
  const [cedente, setCedente] = useState('');
  const [debouncedCedente, setDebouncedCedente] = useState('');
  const [currency, setCurrency] = useState<PaymentCurrency | ''>('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedResult<SettlementReportRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCedente(cedente), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cedente]);

  useEffect(() => {
    setPage(1);
  }, [debouncedCedente, currency]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listSettlements({
      cedente: debouncedCedente || undefined,
      currency: currency || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Erro ao carregar o extrato');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCedente, currency, page, refreshKey]);

  return { cedente, setCedente, currency, setCurrency, page, setPage, pageSize: PAGE_SIZE, data, loading, error };
}
