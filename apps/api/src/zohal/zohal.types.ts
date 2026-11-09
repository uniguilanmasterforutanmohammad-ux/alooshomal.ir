/** One input field of a Zohal web service (rendered as a form in the panel). */
export interface ZohalField {
  /** wire name, e.g. `national_code`. */
  name: string;
  /** Persian label shown in the admin form. */
  label: string;
  required?: boolean;
  type?: 'text' | 'date' | 'boolean' | 'file';
  placeholder?: string;
}

/** One Zohal web service, mirroring a path in the official OpenAPI spec. */
export interface ZohalServiceDef {
  /** stable id, also used in the `zohal.service.<key>` setting key. */
  key: string;
  label: string;
  group: string;
  description: string;
  method: 'POST' | 'GET';
  path: string;
  /** path placeholders such as `session_id` (for GET result endpoints). */
  pathParams?: string[];
  fields: ZohalField[];
  /** enabled when the admin never touched the switch. */
  defaultEnabled: boolean;
}

/** Normalised result of one Zohal call. */
export interface ZohalCallResult<T = Record<string, unknown>> {
  ok: boolean;
  /** Zohal `result` code: 1 success, 4 invalid request, 5 server, 6 input. */
  result: number | null;
  message: string;
  errorCode: string | null;
  data: T | null;
  httpStatus: number | null;
  latencyMs: number;
}

/** Identity payload returned by `national_identity_inquiry`. */
export interface ZohalIdentity {
  matched: boolean;
  first_name: string | null;
  last_name: string | null;
  father_name: string | null;
  national_code: string | null;
  alive: boolean | null;
  is_dead: boolean | null;
}
