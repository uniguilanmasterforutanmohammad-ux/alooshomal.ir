import { Global, Module } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';
import { PermissionsService } from '../auth/permissions.service';
import { StreamTicketService } from '../auth/stream-ticket.service';
import { FacetsCacheService } from './facets-cache.service';
import { ProfileCompleteGuard } from './guards/profile-complete.guard';
import { RateLimitService } from './rate-limit.service';

/**
 * Shared, globally available helpers. `FacetsCacheService` is a singleton so
 * the directory services and the taxonomy admin share the same cache and a
 * taxonomy edit can invalidate it immediately.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [
    FacetsCacheService,
    PermissionsService,
    RateLimitService,
    StreamTicketService,
    ProfileCompleteGuard,
  ],
  exports: [
    FacetsCacheService,
    PermissionsService,
    RateLimitService,
    StreamTicketService,
    ProfileCompleteGuard,
  ],
})
export class CommonModule {}
