export function sanitizeSearchTerm(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength).replace(/[%_]/g, '');
}

export function sanitizeSingleLine(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function sanitizeMultiLine(value: string): string {
  return value.trim();
}
