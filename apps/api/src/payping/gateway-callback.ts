/**
 * Normalised payload of a payment-gateway return.
 *
 * PayPing calls the merchant `returnUrl` with
 * `Content-Type: application/x-www-form-urlencoded` and this shape:
 *
 *   status=1&errorCode=&data={"paymentCode":"…","paymentRefId":123,
 *                            "clientRefId":"…","amount":…}
 *
 * Older/alternate integrations append the same fields to the query string, so
 * both sources are merged here.
 */
export interface GatewayCallbackPayload {
  paymentCode?: string;
  refId?: string;
  clientRefId?: string;
  /** `1` = paid, `0` = cancelled/failed (PayPing). */
  status?: number;
}

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Dict)
    : {};
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseData(value: unknown): Dict {
  if (typeof value === 'string') {
    try {
      return asDict(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return asDict(value);
}

/** Merge query, form body and PayPing's nested `data` JSON into one payload. */
export function parseGatewayCallback(
  query: unknown,
  body: unknown,
): GatewayCallbackPayload {
  const queryDict = asDict(query);
  const bodyDict = asDict(body);
  const data = parseData(bodyDict.data ?? queryDict.data);
  const merged: Dict = { ...queryDict, ...bodyDict, ...data };

  return {
    paymentCode: asString(merged.paymentCode) ?? asString(merged.code),
    refId:
      asString(merged.paymentRefId) ??
      asString(merged.refId) ??
      asString(merged.refid),
    clientRefId: asString(merged.clientRefId),
    status: asNumber(merged.status),
  };
}

/** Swagger body schema for the gateway's form-encoded POST. */
export const GATEWAY_CALLBACK_BODY_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'integer',
      description: '۱ = پرداخت موفق، ۰ = لغو/ناموفق',
      example: 1,
    },
    errorCode: {
      type: 'integer',
      nullable: true,
      description: 'کد خطای درگاه در صورت ناموفق بودن پرداخت',
    },
    data: {
      type: 'string',
      description:
        'JSON شامل paymentCode، paymentRefId، clientRefId، amount و اطلاعات کارت',
      example:
        '{"paymentCode":"…","paymentRefId":123456,"clientRefId":"…","amount":99000}',
    },
  },
};
