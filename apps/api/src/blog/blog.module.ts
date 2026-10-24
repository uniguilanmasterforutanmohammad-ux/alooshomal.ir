import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminBlogController, BlogPublicController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  imports: [PrismaModule, ActivityModule, NotificationsModule],
  controllers: [BlogPublicController, AdminBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
