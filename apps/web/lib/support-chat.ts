/**
 * Fallback poll interval for the live-support UIs (user widget/panel, history
 * list and the admin inbox).
 *
 * Live messages already arrive over SSE, so this timer only patches the gaps
 * left by a stream that died silently; the EventSource client reconnects on
 * its own within a few seconds. Keeping the interval long therefore does not
 * hurt realtime delivery while cutting the per-user request load (and server
 * CPU) roughly three-fold compared with the previous 20s.
 */
export const SUPPORT_POLL_MS = 60_000;
