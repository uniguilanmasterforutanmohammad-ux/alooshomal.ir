import { Global, Module } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';
import { PermissionsService } from '../auth/permissions.service';
import { FacetsCacheService } from './facets-cache.service';
import { RateLimitService } from './rate-limit.service';

/**
 * Shared, globally available helpers. `FacetsCacheService` is a singleton so
 * the directory services and the taxonomy admin share the same cache and a
 * taxonomy edit can invalidate it immediately.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [FacetsCacheService, PermissionsService, RateLimitService],
  exports: [FacetsCacheService, PermissionsService, RateLimitService],
})
export class CommonModule {}
