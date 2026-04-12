/**
 * Formatting utility functions.
 *
 * Centralizes display formatting logic so it stays consistent
 * across all pages (ProductListPage, ProductDetailPage, etc.).
 */

/**
 * Format a price stored in cents as Malaysian Ringgit.
 * Price is stored as an integer in cents (e.g., 1250 = RM 12.50)
 * to avoid floating-point precision issues.
 *
 * @param priceInCents - The price value in cents.
 * @returns Formatted string like "RM 12.50".
 */
export const formatPrice = (priceInCents: number): string => {
  return `${(priceInCents / 100).toFixed(2)}`;
};
