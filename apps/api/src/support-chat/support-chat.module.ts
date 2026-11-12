import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  AdminSupportChatController,
  SupportChatController,
} from './support-chat.controller';
import { SupportChatEventsService } from './support-chat-events.service';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SupportChatController, AdminSupportChatController],
  providers: [SupportChatService, SupportChatEventsService],
  exports: [SupportChatService, SupportChatEventsService],
})
export class SupportChatModule {}
