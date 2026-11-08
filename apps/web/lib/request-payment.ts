import type { RequestPaymentInfo } from './api';

/**
 * With the payment gateway connected, «پله» and ad requests must be paid before
 * an admin reviews them. When the API returns a gateway URL, send the browser
 * there and report that a redirect happened so the caller skips its success
 * message. Returns `false` for free requests (gateway off).
 */
export function goToPaymentGateway(
  payment?: RequestPaymentInfo | null,
): boolean {
  if (payment?.url) {
    window.location.href = payment.url;
    return true;
  }
  return false;
}
