import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';

/** Reconcile expired plans hourly; the read paths also do it lazily. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
/** Wait a little after boot so the DB/schema is definitely ready. */
const FIRST_RUN_DELAY_MS = 60 * 1000;

/**
 * Keeps subscription terms honest without user interaction: a paid term that
 * expired without an upgrade drops back to the free plan, and the free plan
 * renews itself one month at a time.
 */
@Injectable()
export class SubscriptionsExpiryJob implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsExpiryJob.name);

  constructor(private readonly subscriptions: SubscriptionsService) {}

  onModuleInit(): void {
    const first = setTimeout(() => {
      void this.reconcile();
    }, FIRST_RUN_DELAY_MS);
    first.unref?.();

    const timer = setInterval(() => {
      void this.reconcile();
    }, SWEEP_INTERVAL_MS);
    timer.unref?.();
    this.logger.log('subscription expiry job scheduled (hourly)');
  }

  private async reconcile(): Promise<void> {
    try {
      const result = await this.subscriptions.reconcileExpiredPlans();
      if (result.renewedFree > 0 || result.downgraded > 0) {
        this.logger.log(
          `subscription expiry sweep: ${result.downgraded} downgraded, ${result.renewedFree} free renewed`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `subscription expiry sweep failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
