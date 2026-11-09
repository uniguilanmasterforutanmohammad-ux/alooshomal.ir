import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 no longer accepts `url` inside the schema's `datasource` block;
 * the CLI reads the connection string from this config instead. `generate`
 * runs during `npm install` (including Docker/CI, where no database exists
 * yet), so a missing URL must not abort generation.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
