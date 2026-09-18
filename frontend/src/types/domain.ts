export type ReceivableType = 'DUPLICATA_MERCANTIL' | 'CHEQUE_PRE_DATADO';

export type PaymentCurrency = 'BRL' | 'USD';

export const RECEIVABLE_TYPE_LABELS: Record<ReceivableType, string> = {
  DUPLICATA_MERCANTIL: 'Duplicata Mercantil',
  CHEQUE_PRE_DATADO: 'Cheque Pré-datado',
};

export interface SimulationResult {
  termMonths: number;
  baseRateUsed: string;
  spread: string;
  presentValueBRL: string;
  discountBRL: string;
  paymentCurrency: PaymentCurrency;
  exchangeRateUsed: string | null;
  finalAmount: string;
}

export interface Receivable {
  id: string;
  type: ReceivableType;
  cedente: string;
  faceValue: string;
  operationDate: string;
  dueDate: string;
  paymentCurrency: PaymentCurrency;
  status: 'PENDING' | 'SETTLED';
  createdAt: string;
}

export interface Settlement {
  id: string;
  idempotencyKey: string;
  receivableId: string;
  receivableType: ReceivableType;
  faceValue: string;
  termMonths: number;
  baseRateUsed: string;
  spreadUsed: string;
  presentValueBRL: string;
  discountBRL: string;
  paymentCurrency: PaymentCurrency;
  exchangeRateUsed: string | null;
  finalAmount: string;
  settledAt: string;
}

export interface SettlementReportRow {
  id: string;
  receivableId: string;
  cedente: string;
  receivableType: ReceivableType;
  faceValue: string;
  presentValueBRL: string;
  discountBRL: string;
  paymentCurrency: PaymentCurrency;
  exchangeRateUsed: string | null;
  finalAmount: string;
  settledAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SettlementsReportFilter {
  from?: string;
  to?: string;
  cedente?: string;
  currency?: PaymentCurrency;
  page: number;
  pageSize: number;
}
