import { Global, Module } from '@nestjs/common';

import { RedisModule } from '../redis/redis.module';
import { FacetsCacheService } from './facets-cache.service';

/**
 * Shared, globally available helpers. `FacetsCacheService` is a singleton so
 * the directory services and the taxonomy admin share the same cache and a
 * taxonomy edit can invalidate it immediately.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [FacetsCacheService],
  exports: [FacetsCacheService],
})
export class CommonModule {}
