const DECIMAL_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;

export function isValidPositiveDecimal(value: string): boolean {
  return DECIMAL_PATTERN.test(value) && Number(value) > 0;
}

export function isValidDateRange(operationDate: string, dueDate: string): boolean {
  if (!operationDate || !dueDate) return false;
  return new Date(dueDate) > new Date(operationDate);
}
