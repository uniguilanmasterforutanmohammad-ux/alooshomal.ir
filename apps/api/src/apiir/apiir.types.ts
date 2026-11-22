/** One input field of an api.ir web service (rendered as a panel form). */
export interface ApiIrField {
  /** wire name, e.g. `trackingCode`. */
  name: string;
  /** Persian label shown in the admin form. */
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

/** One api.ir web service, mirroring a path in the official OpenAPI spec. */
export interface ApiIrServiceDef {
  /** stable id, also used in the `apiir.service.<key>` setting key. */
  key: string;
  label: string;
  group: string;
  description: string;
  method: 'POST' | 'GET';
  path: string;
  fields: ApiIrField[];
  /**
   * Official api.ir tariff for one call, in Toman (what api.ir charges *us*).
   * Taken from the provider's panel (`https://p.api.ir/service/list`, behind a
   * login) via `scripts/apiir_tariffs.json`; absent until it has been recorded.
   * Distinct from the admin-set user price (`apiir.price.<key>`).
   */
  tariff?: number;
}

/** Normalised result of one api.ir call. */
export interface ApiIrCallResult<T = Record<string, unknown>> {
  ok: boolean;
  /** api.ir `code` field (numeric or string) echoed for diagnostics. */
  code: number | string | null;
  message: string;
  data: T | null;
  httpStatus: number | null;
  latencyMs: number;
  /** True when the answer came from the local simulator (no real call/cost). */
  simulated?: boolean;
}

/** Payload of `POST /api/sw1/License` — اعتبار مجوز شغلی (پروانه کسب). */
export interface ApiIrLicense {
  title: string | null;
  trackingCode: string | null;
  isuuer: string | null;
  fullName: string | null;
  fatherName: string | null;
  nationalCode: string | null;
  phone: string | null;
  issueDate: string | null;
  expireDate: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  isActive: boolean | null;
}

/**
 * One admin-defined composite product: several api.ir services sold (and paid
 * for) as a single item. Paying for it runs every service in `serviceKeys` in
 * the same order.
 */
export interface ApiIrComposite {
  /** stable id used in `apiir.composites` and the PayPing product key. */
  key: string;
  label: string;
  description: string | null;
  serviceKeys: string[];
  /**
   * Price in Toman. `0` means «جمع تعرفه‌ی سرویس‌ها» and is resolved from the
   * current per-service prices at quote time.
   */
  amount: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Admin-facing composite with its resolved price and saleability. */
export interface ApiIrCompositeView extends ApiIrComposite {
  serviceLabels: string[];
  /** Union of the input fields of every service (rendered as one form). */
  fields: ApiIrField[];
  services: Array<{
    key: string;
    label: string;
    group: string;
    price: number;
    enabled: boolean;
  }>;
  purchasable: boolean;
  issues: string[];
  paypingCode: string | null;
}
