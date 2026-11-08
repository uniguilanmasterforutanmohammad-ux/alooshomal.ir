/**
 * Absolute base URL of the public web app. Used to build share links, card
 * callback URLs and QR payloads from the API side.
 */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
