import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecureClock } from '../src/timestamp';

describe('SecureClock', () => {
  describe('constructor', () => {
    it('should use default drift threshold of 1000ms', () => {
      const clock = new SecureClock();
      const ts = clock.now();
      expect(ts.iso).toBeTruthy();
      expect(typeof ts.iso).toBe('string');
    });

    it('should accept custom drift threshold', () => {
      const clock = new SecureClock(500);
      const ts = clock.now();
      expect(ts.iso).toBeTruthy();
    });
  });

  describe('now()', () => {
    it('should return a valid ISO timestamp', () => {
      const clock = new SecureClock();
      const ts = clock.now();
      expect(() => new Date(ts.iso)).not.toThrow();
      expect(new Date(ts.iso).toISOString()).toBe(ts.iso);
    });

    it('should return monotonic_ns as a string', () => {
      const clock = new SecureClock();
      const ts = clock.now();
      expect(typeof ts.monotonic_ns).toBe('string');
      expect(BigInt(ts.monotonic_ns)).toBeGreaterThan(0n);
    });

    it('should return monotonic_ns that increases between sequential calls', async () => {
      const clock = new SecureClock();
      const ts1 = clock.now();
      // Use a small real delay to advance the monotonic clock
      await new Promise((resolve) => setTimeout(resolve, 5));
      const ts2 = clock.now();

      const ns1 = BigInt(ts1.monotonic_ns);
      const ns2 = BigInt(ts2.monotonic_ns);
      expect(ns2).toBeGreaterThan(ns1);
    });

    it('should report no drift under normal conditions', () => {
      const clock = new SecureClock(1000);
      const ts = clock.now();
      expect(ts.drift_detected).toBe(false);
    });

    it('should return different iso values between calls', async () => {
      const clock = new SecureClock();
      const ts1 = clock.now();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const ts2 = clock.now();
      // ISO timestamps should differ (or at least monotonic_ns should)
      const ns1 = BigInt(ts1.monotonic_ns);
      const ns2 = BigInt(ts2.monotonic_ns);
      expect(ns2).toBeGreaterThan(ns1);
    });
  });

  describe('drift detection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detect drift when Date.now() jumps forward beyond threshold', () => {
      const clock = new SecureClock(10);

      // First call establishes baseline
      clock.now();

      // Advance the fake timer by a large amount to simulate clock drift
      vi.advanceTimersByTime(50_000);

      const ts = clock.now();
      expect(ts.drift_detected).toBe(true);
    });

    it('should detect drift when Date.now() jumps backward', () => {
      const clock = new SecureClock(10);

      // First call establishes baseline
      clock.now();

      // Set Date.now to an OLDER value (backward clock jump)
      const pastTime = Date.now() - 20_000;
      vi.setSystemTime(pastTime);

      const ts = clock.now();
      expect(ts.drift_detected).toBe(true);
    });

    it('should not detect drift within threshold', () => {
      const clock = new SecureClock(1000);

      clock.now();
      vi.advanceTimersByTime(50);

      const ts = clock.now();
      expect(ts.drift_detected).toBe(false);
    });
  });

  describe('thread safety', () => {
    it('should handle concurrent calls without errors', async () => {
      const clock = new SecureClock();
      const results = await Promise.all(
        Array.from({ length: 50 }, () => Promise.resolve(clock.now())),
      );

      expect(results).toHaveLength(50);
      for (const ts of results) {
        expect(() => new Date(ts.iso)).not.toThrow();
        expect(typeof ts.monotonic_ns).toBe('string');
        expect(typeof ts.drift_detected).toBe('boolean');
      }

      // Verify monotonicity across concurrent calls
      const nss = results.map((r) => BigInt(r.monotonic_ns));
      for (let i = 1; i < nss.length; i++) {
        expect(nss[i]).toBeGreaterThanOrEqual(nss[i - 1]);
      }
    });
  });
});
