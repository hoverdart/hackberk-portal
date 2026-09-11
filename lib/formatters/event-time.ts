/**
 * Event times, rendered in the event's own zone.
 *
 * Every function here takes the zone rather than reading the server's, because
 * an operational time that drifts with the host is worse than no time at all: a
 * shift starting at "5:00 PM" has to mean five in the afternoon where the event
 * is happening, not wherever the process runs. `events.timezone` is the source;
 * this fallback covers the rows that predate it.
 */
const fallbackTimeZone = "America/Los_Angeles";
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Format an operational timestamp in the event's own time zone, never UTC. */
export function formatEventDateTime(value: string, timeZone = fallbackTimeZone) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(value));
}

/** A shift's date and hours, with the zone named so the reader can trust them. */
export function formatShiftRange(startsAt: string, endsAt: string, timeZone = fallbackTimeZone) {
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone });
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const timeWithZone = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
  const startsDay = day.format(starts);
  const endsDay = day.format(ends);
  return startsDay === endsDay
    ? `${startsDay} · ${time.format(starts)}–${timeWithZone.format(ends)}`
    : `${startsDay} · ${timeWithZone.format(starts)} → ${endsDay} · ${timeWithZone.format(ends)}`;
}

/**
 * `datetime-local` deliberately submits a wall-clock value without an offset.
 * Interpret that value in the event's IANA zone so an organizer's 3:00 PM PT
 * shift remains 3:00 PM PT even when the Next.js server runs in UTC.
 */
export function parseEventDateTime(value: string, timeZone = fallbackTimeZone) {
  const match = localDateTimePattern.exec(value);
  if (!match) throw new RangeError("Expected a local date and time.");
  const [, year, month, day, hour, minute] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const offset = zonedPartsAsUtc(new Date(utcGuess), timeZone) - utcGuess;
  const instant = new Date(utcGuess - offset);
  const resolved = zonedParts(instant, timeZone);
  if (
    resolved.year !== parts.year ||
    resolved.month !== parts.month ||
    resolved.day !== parts.day ||
    resolved.hour !== parts.hour ||
    resolved.minute !== parts.minute
  ) {
    throw new RangeError("This local time does not exist in the event time zone.");
  }
  return instant;
}

function zonedPartsAsUtc(value: Date, timeZone: string) {
  const parts = zonedParts(value, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function zonedParts(value: Date, timeZone: string) {
  const raw = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(value);
  const values = Object.fromEntries(
    raw.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute", number>;
  return values;
}

/**
 * How long a volunteer worked a shift, from the two stamps on their assignment.
 *
 * Null until both exist: "joined but not arrived" and "arrived but still
 * working" are both normal states, and neither is zero hours.
 */
export function shiftDuration(checkedInAt: string | null, checkedOutAt: string | null) {
  if (!checkedInAt || !checkedOutAt) return null;
  return formatMinutes(Math.max(0, (Date.parse(checkedOutAt) - Date.parse(checkedInAt)) / 60000));
}

/** Volunteered time, the way a person would say it: "3h", "2h 30m", "45 min". */
export function formatMinutes(total: number) {
  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** A calendar date in the event's zone — no time, for list columns. */
export function formatEventDate(value: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timeZone || fallbackTimeZone,
  }).format(new Date(value));
}
