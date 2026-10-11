import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface NotificationSignal {
  audience: 'USER' | 'ADMIN';
  /** present for USER-scoped signals */
  userId?: string | null;
  /** synthetic keep-alive tick, no real notification */
  ping?: boolean;
}

/**
 * In-process pub/sub used to push "a notification was just created" to the
 * clients that are currently connected via SSE.
 *
 * This is intentionally *not* a database poll: one `Subject` in memory costs
 * nothing, and each connected browser holds a single idle HTTP connection.
 * When nobody is listening the emit is a no-op, so the cost with thousands of
 * users stays proportional to the number of *online* users only.
 *
 * (Single-instance deployment: if the API is ever scaled to several replicas
 * this should move to Redis pub/sub. The interface below would not change.)
 */
@Injectable()
export class NotificationsEventsService implements OnModuleDestroy {
  private readonly subject = new Subject<NotificationSignal>();

  /** Called by NotificationsService after a row is written. */
  emit(signal: NotificationSignal): void {
    this.subject.next(signal);
  }

  /** Signals addressed to one specific user. */
  forUser(userId: string): Observable<NotificationSignal> {
    return this.subject.pipe(
      filter((signal) => signal.audience === 'USER' && signal.userId === userId),
    );
  }

  /** Signals for the shared admin feed (every admin listens). */
  forAdmins(): Observable<NotificationSignal> {
    return this.subject.pipe(filter((signal) => signal.audience === 'ADMIN'));
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
