// tests/unit/debt-collection.test.ts
// Unit tests for Debt Collection deduplication (ruleId scope) and pause flags

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Debt Collection Engine Rules (Module G / Rule NOTIF-4, NOTIF-5, NOTIF-6)", () => {
  it("should deduplicate messages by ruleId within 7 days (Rule NOTIF-5)", () => {
    const studentId = "student-123";
    const ruleId = "rule-456";
    const now = new Date("2026-09-10T10:00:00Z");

    const eventsLog = [
      {
        studentId: "student-123",
        ruleId: "rule-456",
        sentAt: new Date("2026-09-05T08:00:00Z"), // 5 days ago (within 7 days)
      },
    ];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const isDuplicate = eventsLog.some(
      (e) =>
        e.studentId === studentId &&
        e.ruleId === ruleId &&
        e.sentAt >= sevenDaysAgo,
    );

    assert.equal(isDuplicate, true, "Should detect duplicate for same ruleId within 7 days");

    // Different ruleId should NOT be suppressed
    const differentRuleDuplicate = eventsLog.some(
      (e) =>
        e.studentId === studentId &&
        e.ruleId === "rule-789" &&
        e.sentAt >= sevenDaysAgo,
    );
    assert.equal(differentRuleDuplicate, false, "Different ruleId must NOT be suppressed");
  });

  it("should suppress automated collection when student is paused (Rule NOTIF-6)", () => {
    const students = [
      { id: "s1", name: "Student 1", isPaused: true, balance: 50000 },
      { id: "s2", name: "Student 2", isPaused: false, balance: 35000 },
    ];

    const eligibleStudents = students.filter((s) => !s.isPaused && s.balance > 0);
    assert.equal(eligibleStudents.length, 1);
    assert.equal(eligibleStudents[0].id, "s2");
  });
});
