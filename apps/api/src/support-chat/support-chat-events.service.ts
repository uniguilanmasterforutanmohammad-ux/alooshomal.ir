import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type SupportChatEventType = 'message' | 'read' | 'status' | 'created';

export interface SupportChatSignal {
  audience: 'USER' | 'ADMIN';
  /** present for USER-scoped signals */
  userId?: string | null;
  type: SupportChatEventType;
  conversationId: string;
  /** the created message, when `type === 'message'` */
  message?: unknown;
  userUnread?: number;
  staffUnread?: number;
}

/**
 * In-process pub/sub for live support chat. It mirrors the notification event
 * bus: one idle SSE connection per open tab, no database polling, and no cost
 * when nobody is connected. A single-instance deployment is assumed; moving to
 * several API replicas would swap this for Redis pub/sub without changing the
 * controller contract.
 */
@Injectable()
export class SupportChatEventsService implements OnModuleDestroy {
  private readonly subject = new Subject<SupportChatSignal>();

  emit(signal: SupportChatSignal): void {
    this.subject.next(signal);
  }

  forUser(userId: string): Observable<SupportChatSignal> {
    return this.subject.pipe(
      filter((signal) => signal.audience === 'USER' && signal.userId === userId),
    );
  }

  forAdmins(): Observable<SupportChatSignal> {
    return this.subject.pipe(filter((signal) => signal.audience === 'ADMIN'));
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
