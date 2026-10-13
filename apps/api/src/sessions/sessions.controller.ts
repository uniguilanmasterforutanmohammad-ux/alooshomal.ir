import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست نشست‌های فعال من' })
  async list(@CurrentUser() user: AuthUser) {
    await this.sessions.pruneStale(user.id);
    return this.sessions.listForUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'خروج از یک نشست مشخص' })
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const revoked = await this.sessions.revokeOwn(user.id, id);
    return { ok: revoked };
  }

  @Delete()
  @ApiOperation({ summary: 'خروج از همه‌ی نشست‌ها به‌جز نشست فعلی' })
  async revokeAll(@CurrentUser() user: AuthUser) {
    const count = await this.sessions.revokeAll(user.id, user.sessionId);
    return { ok: true, revoked: count };
  }
}
