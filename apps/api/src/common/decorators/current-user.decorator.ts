import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  role: 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN';
  /** Id of the session this request was authenticated with (when known). */
  sessionId?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
