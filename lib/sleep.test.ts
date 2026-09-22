import assert from "node:assert/strict";
import { clockDiff, metrics, type SleepEntry } from "./sleep.ts";

assert.equal(clockDiff("23:30", "07:30"), 480);
assert.equal(clockDiff("00:30", "01:00"), 30);

const night: SleepEntry = {
  id: "test",
  date: "2026-09-22",
  bedTime: "00:30",
  sleepTime: "01:00",
  wakeTime: "08:30",
  outOfBedTime: "08:40",
  rememberedAwakenings: 4,
  awakeDuration: "30-60",
  quality: 6,
  morningEnergy: 6,
  concentration: 6,
  phoneUse: "30-60",
  company: "alone",
  sport: false,
  dream: "unknown",
  sleepThoughts: false,
  product: "none",
  createdAt: "2026-09-22T08:30:00Z",
};
assert.deepEqual(metrics(night), {
  latency: 30,
  awake: 45,
  duration: 405,
  score: 70,
});
console.log("Sleep calculations: OK");
