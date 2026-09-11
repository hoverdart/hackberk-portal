import { describe, expect, it } from "vitest";

import { formatEventDateTime, formatShiftRange, parseEventDateTime } from "@/lib/formatters/event-time";

describe("event-time formatting", () => {
  it("renders an audit timestamp in Pacific daylight time instead of UTC", () => {
    expect(formatEventDateTime("2026-09-11T05:06:00.000Z")).toContain("Sep 10, 2026, 10:06 PM PDT");
  });

  it("keeps a single-day shift's local date, hours, and zone together", () => {
    expect(formatShiftRange("2027-03-06T23:00:00.000Z", "2027-03-07T03:00:00.000Z")).toContain(
      "Sat, Mar 6 · 3:00 PM–7:00 PM PST",
    );
  });

  it("stores a datetime-local shift value as the event's Pacific instant", () => {
    expect(parseEventDateTime("2026-09-10T22:06").toISOString()).toBe("2026-09-11T05:06:00.000Z");
  });

  it("rejects a wall-clock time skipped by the spring daylight-saving transition", () => {
    expect(() => parseEventDateTime("2027-03-14T02:30")).toThrow("does not exist");
  });
});
