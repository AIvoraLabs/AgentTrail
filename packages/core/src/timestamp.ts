import type { TimestampResult } from './types.js';

/**
 * SecureClock provides monotonic wall-clock timestamps with drift detection.
 *
 * It combines `process.hrtime.bigint()` (monotonic, high-resolution) with
 * `Date.now()` (wall clock) to detect if the system clock has drifted beyond
 * a configurable threshold between calls.
 *
 * **Thread-safe**: `now()` is a pure read — it never mutates instance state.
 *
 * @example
 * ```typescript
 * const clock = new SecureClock();
 * const ts = clock.now();
 * // ts.iso           -> "2026-06-09T12:00:00.000Z"
 * // ts.monotonic_ns  -> "1234567890123456"
 * // ts.drift_detected -> false
 * ```
 */
export class SecureClock {
  private readonly driftThresholdMs: number;
  private readonly startMonotonic: bigint;
  private readonly startWall: number;

  constructor(driftThresholdMs = 1000) {
    this.driftThresholdMs = driftThresholdMs;
    this.startMonotonic = process.hrtime.bigint();
    this.startWall = Date.now();
  }

  /**
   * Return the current timestamp with drift detection.
   *
   * The `monotonic_ns` field is the raw monotonic clock value (not elapsed),
   * which ensures strict ordering across calls. The `drift_detected` flag
   * indicates whether the wall clock differed from the expected value by
   * more than `driftThresholdMs`.
   */
  now(): TimestampResult {
    const currentMonotonic = process.hrtime.bigint();
    const elapsedMs = Number(currentMonotonic - this.startMonotonic) / 1_000_000;
    const expectedWall = this.startWall + elapsedMs;
    const actualWall = Date.now();
    const drift = Math.abs(actualWall - expectedWall);

    return {
      iso: new Date(actualWall).toISOString(),
      monotonic_ns: currentMonotonic.toString(),
      drift_detected: drift > this.driftThresholdMs,
    };
  }
}
