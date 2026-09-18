import { apiClient } from './client';
import type { PaginatedResult, SettlementReportRow, SettlementsReportFilter } from '../types/domain';

export function listSettlements(
  filter: SettlementsReportFilter,
): Promise<PaginatedResult<SettlementReportRow>> {
  const params = new URLSearchParams();
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  if (filter.cedente) params.set('cedente', filter.cedente);
  if (filter.currency) params.set('currency', filter.currency);
  params.set('page', String(filter.page));
  params.set('pageSize', String(filter.pageSize));

  return apiClient.get<PaginatedResult<SettlementReportRow>>(`/reports/settlements?${params.toString()}`);
}
