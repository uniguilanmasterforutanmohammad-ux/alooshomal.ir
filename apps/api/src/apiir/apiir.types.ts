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
