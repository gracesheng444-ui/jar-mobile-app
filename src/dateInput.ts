// Countdown jars render a fixed number of individually-visible stars in a
// fixed-size jar; beyond ~125 days (capacity 250, verified empirically
// against the actual jar illustration — re-checked after the starWrap floor
// padding fix, which slightly reduced the usable area) stars overflow past
// the ruffle. Capped here so the app can't set a target date past the point
// it can actually render well.
export const MAX_TARGET_DAYS = 125;

export type TargetDateError = 'invalid' | 'too_far' | null;

/** Auto-inserts the dashes as digits are typed, so "20261225" becomes "2026-12-25" without the user typing "-" —
 *  and each dash appears the moment its segment is complete (right after the 4th/6th digit), not only once the
 *  next segment has started. `previous` is the field's current formatted value: without it, backspacing right
 *  after an auto-inserted dash (e.g. "2026-") would just regenerate the same dash and look like backspace does
 *  nothing — comparing against it lets a dash-only deletion fall through to delete the digit before it too. */
export function formatDateInput(raw: string, previous: string): string {
  let digits = raw.replace(/\D/g, '').slice(0, 8);
  const previousDigits = previous.replace(/\D/g, '');
  if (raw.length < previous.length && digits.length === previousDigits.length) {
    digits = digits.slice(0, -1);
  }
  let result = digits.slice(0, 4);
  if (digits.length >= 4) result += '-' + digits.slice(4, 6);
  if (digits.length >= 6) result += '-' + digits.slice(6, 8);
  return result;
}

/** Parses a "YYYY-MM-DD" target date, requiring a real calendar date within the supported range. */
export function parseTargetDate(text: string): { date: Date | null; error: TargetDateError } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return { date: null, error: null };
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day)) return { date: null, error: null };
  if (date.getTime() <= Date.now()) return { date: null, error: 'invalid' };
  const daysOut = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysOut > MAX_TARGET_DAYS) return { date: null, error: 'too_far' };
  return { date, error: null };
}
