import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeRecurrence,
  expandRecurrenceDates,
  getNextOccurrenceDate,
} from "./recurrence";

describe("expandRecurrenceDates", () => {
  it("expands daily with interval", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-08-01",
      rule: { frequency: "daily", interval: 2 },
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-08",
    });
    assert.deepEqual(dates, [
      "2026-08-01",
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
    ]);
  });

  it("expands weekly on multiple weekdays", () => {
    // 2026-08-10 is Monday
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-08-10",
      rule: {
        frequency: "weekly",
        interval: 1,
        weekdays: [1, 3, 5], // Mon Wed Fri
      },
      rangeStart: "2026-08-10",
      rangeEnd: "2026-08-16",
    });
    assert.deepEqual(dates, ["2026-08-10", "2026-08-12", "2026-08-14"]);
  });

  it("expands every 2 weeks", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-08-10",
      rule: { frequency: "weekly", interval: 2, weekdays: [1] },
      rangeStart: "2026-08-10",
      rangeEnd: "2026-09-07",
    });
    assert.deepEqual(dates, ["2026-08-10", "2026-08-24", "2026-09-07"]);
  });

  it("skips invalid monthly days instead of clamping", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-01-31",
      rule: { frequency: "monthly", interval: 1 },
      rangeStart: "2026-01-01",
      rangeEnd: "2026-05-31",
    });
    assert.deepEqual(dates, ["2026-01-31", "2026-03-31", "2026-05-31"]);
  });

  it("skips non-leap Feb 29 yearly", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2024-02-29",
      rule: { frequency: "yearly", interval: 1 },
      rangeStart: "2024-01-01",
      rangeEnd: "2029-12-31",
    });
    assert.deepEqual(dates, ["2024-02-29", "2028-02-29"]);
  });

  it("respects end date and cancelled exceptions", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-08-10",
      rule: {
        frequency: "weekly",
        interval: 1,
        weekdays: [1],
        endDate: "2026-08-24",
      },
      rangeStart: "2026-08-01",
      rangeEnd: "2026-09-30",
      cancelledDates: ["2026-08-17"],
    });
    assert.deepEqual(dates, ["2026-08-10", "2026-08-24"]);
  });

  it("returns empty for inverted ranges", () => {
    const dates = expandRecurrenceDates({
      seriesStartDate: "2026-08-10",
      rule: { frequency: "daily", interval: 1 },
      rangeStart: "2026-08-20",
      rangeEnd: "2026-08-10",
    });
    assert.deepEqual(dates, []);
  });
});

describe("getNextOccurrenceDate", () => {
  it("finds the next date after a cancelled occurrence", () => {
    const next = getNextOccurrenceDate({
      seriesStartDate: "2026-08-10",
      rule: { frequency: "weekly", interval: 1, weekdays: [1] },
      fromDate: "2026-08-17",
      cancelledDates: ["2026-08-17"],
    });
    assert.equal(next, "2026-08-24");
  });
});

describe("describeRecurrence", () => {
  it("describes weekly multi-day custom rules", () => {
    assert.equal(
      describeRecurrence({
        frequency: "weekly",
        interval: 2,
        weekdays: [1, 3],
      }),
      "Repeats every 2 weeks on Mon & Wed",
    );
  });
});
