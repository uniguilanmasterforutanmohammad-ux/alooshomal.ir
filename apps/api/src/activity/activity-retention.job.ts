import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ActivityService } from './activity.service';

/** Run the retention sweep once a day (in addition to the on-demand sweep
 *  triggered when the admin changes the retention window). */
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Wait a little after boot so the DB/schema is definitely ready. */
const FIRST_RUN_DELAY_MS = 60 * 1000;

/**
 * Periodic cleanup of the system activity log. Without this the table would
 * grow forever; with it, rows older than the admin-chosen window are dropped
 * automatically.
 */
@Injectable()
export class ActivityRetentionJob implements OnModuleInit {
  private readonly logger = new Logger(ActivityRetentionJob.name);

  constructor(private readonly activity: ActivityService) {}

  onModuleInit(): void {
    const first = setTimeout(() => {
      void this.activity.prune();
    }, FIRST_RUN_DELAY_MS);
    // `unref` so this timer never keeps the process alive on shutdown.
    first.unref?.();

    const timer = setInterval(() => {
      void this.activity.prune();
    }, SWEEP_INTERVAL_MS);
    timer.unref?.();
    this.logger.log('activity retention job scheduled (daily)');
  }
}
