/**
 * Home-page ad scheduling.
 *
 * The admin decides how many ads may run in parallel (`adDailySlots`) and how
 * long each approved ad runs (`adDurationDays`). Approved requests therefore
 * form a queue of fixed-length display windows spread over that many parallel
 * "lanes": when the admin approves a request we work out the earliest lane
 * (0..slots-1) that frees up soonest and schedule the new ad right after it.
 *
 * Keeping this in one small pure function means the ads service and the points
 * reward flow both schedule identically, and it is trivial to reason about in
 * tests: `startedAt` is never in the past, and `endsAt = startedAt + duration`.
 */

export interface ScheduledWindow {
  startedAt: Date;
  endsAt: Date;
}

/**
 * Pick the display window for one newly approved ad.
 *
 * `active` are the already-approved ads whose display window has not finished
 * (`endsAt > now`). Because every lane runs its ads back-to-back, we can recover
 * how many lanes are occupied and when each one frees up. The new ad starts at
 * `now` in the first free lane, or — when all `slots` lanes are busy — right
 * after the lane that frees first, so approvals never overlap in a lane.
 */
export function scheduleAdWindow(
  now: Date,
  active: ScheduledWindow[],
  slots: number,
  durationDays: number,
): ScheduledWindow {
  const lanes = Math.max(1, Math.floor(slots));
  const durationMs = Math.max(1, Math.floor(durationDays)) * 86_400_000;

  // Assign every not-yet-finished ad to a lane by start order: it fits any lane
  // that is already free when it starts, otherwise it opens a fresh lane.
  const laneEnds: Date[] = [];
  const ordered = active
    .filter((window) => window.endsAt.getTime() > now.getTime())
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  for (const window of ordered) {
    const index = laneEnds.findIndex(
      (end) => end.getTime() <= window.startedAt.getTime(),
    );
    if (index >= 0) laneEnds[index] = window.endsAt;
    else laneEnds.push(window.endsAt);
  }

  if (laneEnds.length < lanes) {
    // A lane is free right now.
    return { startedAt: now, endsAt: new Date(now.getTime() + durationMs) };
  }

  // Every lane is busy: wait for the lane that frees up soonest.
  const startedAt = new Date(
    Math.min(...laneEnds.map((end) => end.getTime())),
  );
  return { startedAt, endsAt: new Date(startedAt.getTime() + durationMs) };
}
