export interface UploadResult {
  url: string;
  key: string;
  width: number;
  height: number;
  size: number;
  contentType: string;
}

export interface Paged<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  user: {
    id: string;
    email: string | null;
    phone?: string | null;
    fullName: string | null;
    role: 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN';
  };
  isNewUser?: boolean;
}
