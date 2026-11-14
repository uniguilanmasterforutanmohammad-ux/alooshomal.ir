/**
 * One-time, idempotent admin-email migration run by the API entrypoint.
 *
 * `ADMIN_EMAIL` in `.env` is only a seed value; the real sign-in email lives
 * in `User.email`. Changing `.env` alone therefore does not rename the admin.
 * This script makes the next deployment apply the change:
 *
 *   - if a user already has `ADMIN_EMAIL`, nothing to do;
 *   - else if `ADMIN_PREVIOUS_EMAIL` is set, rename that admin;
 *   - else if exactly one ADMIN account exists, rename it to `ADMIN_EMAIL`.
 *
 * It never creates accounts and never deletes anything. Any failure is logged
 * and ignored so it can never block the API from starting.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const next = process.env.ADMIN_EMAIL?.trim();
const previous = process.env.ADMIN_PREVIOUS_EMAIL?.trim();

if (!connectionString) {
  console.log('[admin-email] DATABASE_URL is not set — skipping');
  process.exit(0);
}
if (!next) {
  console.log('[admin-email] ADMIN_EMAIL is not set — skipping');
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const existing = await prisma.user.findUnique({
    where: { email: next },
    select: { id: true, role: true },
  });
  if (existing) {
    console.log(`[admin-email] ${next} already exists — nothing to do`);
    process.exit(0);
  }

  if (previous) {
    const result = await prisma.user.updateMany({
      where: { email: previous, role: 'ADMIN' },
      data: { email: next },
    });
    console.log(
      `[admin-email] renamed ${result.count} admin(s) from ${previous} to ${next}`,
    );
    process.exit(0);
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true },
  });
  if (admins.length === 1) {
    await prisma.user.update({
      where: { id: admins[0].id },
      data: { email: next },
    });
    console.log(
      `[admin-email] renamed the only admin (${admins[0].email ?? 'no email'}) to ${next}`,
    );
  } else {
    console.log(
      `[admin-email] found ${admins.length} admin accounts; set ADMIN_PREVIOUS_EMAIL to choose which one to rename`,
    );
  }
} catch (error) {
  console.error(
    `[admin-email] migration failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
} finally {
  await prisma.$disconnect();
}
