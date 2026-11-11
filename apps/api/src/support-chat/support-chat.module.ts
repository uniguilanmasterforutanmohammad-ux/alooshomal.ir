import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import {
  AdminSupportChatController,
  SupportChatController,
} from './support-chat.controller';
import { SupportChatEventsService } from './support-chat-events.service';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SupportChatController, AdminSupportChatController],
  providers: [SupportChatService, SupportChatEventsService],
  exports: [SupportChatService, SupportChatEventsService],
})
export class SupportChatModule {}
