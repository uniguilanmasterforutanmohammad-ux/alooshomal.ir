/**
 * Iranian national code (کد ملی) validation: exactly ten digits, not a
 * repeated digit, and a valid check digit.
 */
export function isValidNationalCode(value: string): boolean {
  const code = value.trim();
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(code[index]) * (10 - index);
  }
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

/**
 * Whether a user row has completed the two-step identity flow:
 * Shahkar phone↔national-code match, birth date, and the paid identity
 * inquiry. Every gated action (content creation, paid requests, plan purchase)
 * requires this.
 */
export function isProfileComplete(user: {
  firstName?: string | null;
  lastName?: string | null;
  nationalCode?: string | null;
  birthDate?: string | null;
  phoneMatchVerifiedAt?: Date | null;
  identityVerifiedAt?: Date | null;
}): boolean {
  return Boolean(
    user.firstName?.trim() &&
      user.lastName?.trim() &&
      user.nationalCode?.trim() &&
      user.birthDate?.trim() &&
      user.phoneMatchVerifiedAt &&
      user.identityVerifiedAt,
  );
}
