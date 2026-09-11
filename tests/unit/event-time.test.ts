import { describe, expect, it } from "vitest";

import { formatEventDateTime, formatShiftRange, parseEventDateTime, shiftDuration } from "@/lib/formatters/event-time";

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

describe("shiftDuration", () => {
  it("is null until a volunteer has both checked in and checked out", () => {
    expect(shiftDuration(null, null)).toBeNull();
    // Joined but not arrived, and arrived but still working, are both normal
    // states — and neither of them is zero hours.
    expect(shiftDuration("2027-03-06T17:00:00Z", null)).toBeNull();
    expect(shiftDuration(null, "2027-03-06T19:00:00Z")).toBeNull();
  });

  it("reads back the way a person would say it", () => {
    expect(shiftDuration("2027-03-06T17:00:00Z", "2027-03-06T20:00:00Z")).toBe("3h");
    expect(shiftDuration("2027-03-06T17:00:00Z", "2027-03-06T19:30:00Z")).toBe("2h 30m");
    expect(shiftDuration("2027-03-06T17:00:00Z", "2027-03-06T17:45:00Z")).toBe("45 min");
  });

  it("never reports negative time, whatever the stamps say", () => {
    expect(shiftDuration("2027-03-06T20:00:00Z", "2027-03-06T17:00:00Z")).toBe("0 min");
  });
});
