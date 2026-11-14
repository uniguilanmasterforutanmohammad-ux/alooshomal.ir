/**
 * Idempotent admin-email migration run by the API entrypoint.
 *
 * `ADMIN_EMAIL` in `.env` is only a seed value; the real sign-in email lives
 * in `User.email`. This script makes a `.env` change take effect on deploy:
 *
 *   - if a user already has `ADMIN_EMAIL`:
 *       · promote it to an active ADMIN when it is a regular account
 *         (e.g. the address was registered on the site by mistake);
 *       · when `ADMIN_PREVIOUS_EMAIL` is set, demote that old admin to USER.
 *   - else if `ADMIN_PREVIOUS_EMAIL` is set, rename that admin;
 *   - else if exactly one ADMIN exists, rename it to `ADMIN_EMAIL`.
 *
 * It never creates or deletes accounts. Any failure is logged and ignored so
 * it can never block the API from starting.
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
    select: { id: true, role: true, isActive: true },
  });

  if (existing) {
    if (existing.role !== 'ADMIN' || !existing.isActive) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN', isActive: true },
      });
      console.log(
        `[admin-email] promoted ${next} from ${existing.role} to ADMIN`,
      );
    } else {
      console.log(`[admin-email] ${next} is already an active ADMIN`);
    }

    if (previous && previous !== next) {
      const demoted = await prisma.user.updateMany({
        where: { email: previous, role: 'ADMIN' },
        data: { role: 'USER' },
      });
      if (demoted.count > 0) {
        console.log(`[admin-email] demoted the previous admin ${previous} to USER`);
      }
    }
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
