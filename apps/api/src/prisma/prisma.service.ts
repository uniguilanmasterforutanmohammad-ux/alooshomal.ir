import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    // Each API replica opens its own pool; keep the default small enough that
    // several replicas plus `prisma db push`/backups stay under Postgres'
    // `max_connections`. Override per environment with DATABASE_POOL_MAX.
    const configured = Number(process.env.DATABASE_POOL_MAX ?? '10');
    const max = Number.isInteger(configured) && configured > 0 ? configured : 10;
    super({ adapter: new PrismaPg({ connectionString, max }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
