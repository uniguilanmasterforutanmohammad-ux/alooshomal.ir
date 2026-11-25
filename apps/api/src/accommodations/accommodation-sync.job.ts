import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AccommodationsService } from './accommodations.service';

/** How often the sweep looks for channels whose feed is stale. */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
/** A channel is re-read when its last successful sync is older than this. */
const DEFAULT_SYNC_EVERY_MINUTES = 30;
/** Wait a little after boot so the DB and outbound network are ready. */
const FIRST_RUN_DELAY_MS = 3 * 60 * 1000;

function syncEveryMinutes(): number {
  const raw = Number(process.env.ACCOMMODATION_SYNC_INTERVAL_MINUTES);
  return Number.isFinite(raw) && raw >= 5 ? raw : DEFAULT_SYNC_EVERY_MINUTES;
}

/**
 * Keeps every connected channel's iCal feed fresh without the host pressing
 * «همگام‌سازی». The sweep only touches channels whose `lastSyncedAt` is older
 * than the configured interval, so it stays cheap when many channels exist.
 */
@Injectable()
export class AccommodationSyncJob implements OnModuleInit {
  private readonly logger = new Logger(AccommodationSyncJob.name);

  constructor(private readonly accommodations: AccommodationsService) {}

  onModuleInit(): void {
    const first = setTimeout(() => {
      void this.sweep();
    }, FIRST_RUN_DELAY_MS);
    first.unref?.();

    const timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
    timer.unref?.();
    this.logger.log(
      `accommodation channel sync scheduled (every ${syncEveryMinutes()} min)`,
    );
  }

  private async sweep(): Promise<void> {
    try {
      const result = await this.accommodations.syncDueChannels(
        syncEveryMinutes(),
      );
      if (result.channels > 0) {
        this.logger.log(
          `accommodation sync: ${result.channels} channel(s), ${result.synced} event(s), ${result.failed} failure(s)`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `accommodation sync failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
