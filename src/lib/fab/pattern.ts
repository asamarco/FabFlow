/** Shared pattern geometry: group offsets clamped so the pattern stays on the wafer. */

export const OFFSET_LIMIT = 0.45;

/** Clamp a group shift so `count` openings of `openingWidth` (fraction of pitch) stay in [0, 1]. */
export function clampHoleShift(count: number, openingWidth: number, offset = 0): number {
  const hw = openingWidth / count / 2;
  const room = Math.max(0, 0.5 / count - hw);
  const o = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, offset));
  return Math.max(-room, Math.min(room, o));
}

/** Covered interval [start, end] (fractions of the wafer) for a partial-cover pattern. */
export function partialCoverRange(coverage: number, offset = 0): [number, number] {
  const c = Math.max(0, Math.min(1, coverage));
  const o = Math.max(0, Math.min(1 - c, offset));
  return [o, o + c];
}
