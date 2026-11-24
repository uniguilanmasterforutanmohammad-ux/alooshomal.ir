import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SessionsService } from './sessions.service';

/** Run the sweep once a day; sessions are cheap to keep for a few days. */
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Wait a little after boot so the DB is definitely reachable. */
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;

/**
 * Reclaims dead session rows. Without this the `sessions` table grows forever
 * (one row per login/refresh chain), even though most rows can no longer
 * authenticate anything.
 */
@Injectable()
export class SessionsCleanupJob implements OnModuleInit {
  private readonly logger = new Logger(SessionsCleanupJob.name);

  constructor(private readonly sessions: SessionsService) {}

  onModuleInit(): void {
    const first = setTimeout(() => {
      void this.sweep();
    }, FIRST_RUN_DELAY_MS);
    first.unref?.();

    const timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
    timer.unref?.();
    this.logger.log('session cleanup job scheduled (daily)');
  }

  private async sweep(): Promise<void> {
    try {
      const removed = await this.sessions.pruneDead();
      if (removed > 0) {
        this.logger.log(`session cleanup: removed ${removed} dead session(s)`);
      }
    } catch (error) {
      this.logger.warn(
        `session cleanup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
