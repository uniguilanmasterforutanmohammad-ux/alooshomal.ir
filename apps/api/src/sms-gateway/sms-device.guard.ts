import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';

export interface SmsDeviceContext {
  id: string;
  workspaceId: string;
  name: string;
}

export type SmsDeviceRequest = Request & { smsDevice?: SmsDeviceContext };

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Authenticates the Android gateway with its long-lived device token.
 *
 * Device routes are marked `@Public()` so the global JWT guard steps aside;
 * this guard is then the only gate. Tokens are stored hashed, so a database
 * leak does not expose working credentials.
 */
@Injectable()
export class SmsDeviceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SmsDeviceRequest>();
    const header = request.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      throw new UnauthorizedException('توکن دستگاه ارسال نشده است');
    }
    const tokenHash = hashDeviceToken(match[1].trim());
    const device = await this.prisma.smsGatewayDevice.findUnique({
      where: { tokenHash },
      select: { id: true, workspaceId: true, name: true, status: true },
    });
    if (!device || device.status !== 'ACTIVE') {
      throw new UnauthorizedException('این دستگاه معتبر نیست یا قطع شده است');
    }
    request.smsDevice = {
      id: device.id,
      workspaceId: device.workspaceId,
      name: device.name,
    };
    // Best-effort presence update; never block the request on it.
    void this.prisma.smsGatewayDevice
      .update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    return true;
  }
}
