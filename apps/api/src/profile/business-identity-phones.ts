import { IdentityInquiryKind, IdentityInquiryStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Business contact numbers that still need a Shahkar inquiry before the
 * identity bundle can finish: every changed/added business mobile, minus the
 * account phone (already OTP-verified) and numbers already matched with this
 * national code in an earlier successful inquiry.
 *
 * The onboarding checkout charges one Shahkar fee per returned phone, and the
 * post-payment bundle verifies exactly these numbers.
 */
export async function resolvePendingBusinessPhones(
  prisma: PrismaService,
  userId: string,
  accountPhone: string | null,
  nationalCode: string | null,
): Promise<string[]> {
  const workspace = await prisma.businessWorkspace.findFirst({
    where: { ownerId: userId, isPlaceholder: false },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { onboardingData: true },
  });
  const draft =
    workspace?.onboardingData && typeof workspace.onboardingData === 'object'
      ? (workspace.onboardingData as Record<string, unknown>)
      : {};
  const phones = [
    draft.mobile,
    ...(Array.isArray(draft.additionalMobiles) ? draft.additionalMobiles : []),
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(
      (value) =>
        /^09\d{9}$/.test(value) && (!accountPhone || value !== accountPhone),
    );
  const unique = Array.from(new Set(phones));
  if (unique.length === 0 || !nationalCode) return unique;

  const logs = await prisma.identityInquiryLog.findMany({
    where: {
      userId,
      kind: IdentityInquiryKind.PHONE_MATCH,
      status: IdentityInquiryStatus.SUCCESS,
      nationalCode,
      phone: { in: unique },
    },
    select: { phone: true },
  });
  const verified = new Set(logs.map((log) => log.phone));
  return unique.filter((phone) => !verified.has(phone));
}
