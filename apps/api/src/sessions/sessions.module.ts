import { Global, Module } from '@nestjs/common';

import { SessionsController } from './sessions.controller';
import { SessionsCleanupJob } from './sessions-cleanup.job';
import { SessionsService } from './sessions.service';

/**
 * Session registry. Global so the auth module (login/refresh/logout) and the
 * JWT strategy can both reach it without circular imports.
 */
@Global()
@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionsCleanupJob],
  exports: [SessionsService],
})
export class SessionsModule {}
