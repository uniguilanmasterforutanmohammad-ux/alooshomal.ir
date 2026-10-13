import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsService } from '../../sessions/sessions.service';
import { JWT_AUDIENCE, JWT_ISSUER, resolveJwtSecret } from '../jwt.config';

export interface JwtPayload {
  sub: string;
  /** Session id — the token is only valid while this session is live. */
  sid?: string;
  email: string | null;
  phone?: string | null;
  role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
  ) {
    super({
      // Bearer header for normal XHR, `?token=` for EventSource (SSE), which
      // cannot attach custom headers.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
      // Verify the claims we set at signing time — a token minted elsewhere (or
      // for another service) is rejected even if it is signed with the secret.
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Tokens minted before the session registry existed have no `sid`; they are
    // no longer accepted, which forces a one-time re-login after deploy.
    if (!payload.sid) {
      throw new UnauthorizedException('نشست نامعتبر است؛ دوباره وارد شوید');
    }
    const session = await this.sessions.findActive(payload.sid, payload.sub);
    if (!session) {
      throw new UnauthorizedException('نشست منقضی یا باطل شده است');
    }
    // Heartbeat: keeps the idle window (7 days) counting from real activity.
    void this.sessions.touch(payload.sid);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, phone: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('حساب کاربری معتبر نیست');
    }
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      sessionId: payload.sid,
    };
  }
}
