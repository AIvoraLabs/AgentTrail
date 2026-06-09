import { describe, it, expect } from 'vitest';
import {
  ComplianceError,
  SignatureError,
  ChainError,
  ClockError,
} from '../src/errors';

describe('errors', () => {
  describe('ComplianceError', () => {
    it('should be an instance of ComplianceError and Error', () => {
      const err = new ComplianceError('compliance violation');
      expect(err).toBeInstanceOf(ComplianceError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should have the correct name', () => {
      const err = new ComplianceError('test');
      expect(err.name).toBe('ComplianceError');
    });

    it('should have the correct error code', () => {
      const err = new ComplianceError('test');
      expect(err.code).toBe('COMPLIANCE_ERROR');
    });

    it('should carry the message', () => {
      const err = new ComplianceError('something went wrong');
      expect(err.message).toBe('something went wrong');
    });

    it('should support cause chaining', () => {
      const inner = new Error('inner failure');
      const err = new ComplianceError('outer failure', { cause: inner });
      expect(err.cause).toBe(inner);
    });

    it('should be throwable and catchable via AgentTrailError', () => {
      expect(() => {
        throw new ComplianceError('fail');
      }).toThrow(ComplianceError);
    });
  });

  describe('SignatureError', () => {
    it('should be an instance of SignatureError and Error', () => {
      const err = new SignatureError('signature mismatch');
      expect(err).toBeInstanceOf(SignatureError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should have the correct name', () => {
      const err = new SignatureError('test');
      expect(err.name).toBe('SignatureError');
    });

    it('should have the correct error code', () => {
      const err = new SignatureError('test');
      expect(err.code).toBe('SIGNATURE_ERROR');
    });

    it('should support cause chaining', () => {
      const inner = new Error('inner failure');
      const err = new SignatureError('outer failure', { cause: inner });
      expect(err.cause).toBe(inner);
    });
  });

  describe('ChainError', () => {
    it('should be an instance of ChainError and Error', () => {
      const err = new ChainError('chain broken');
      expect(err).toBeInstanceOf(ChainError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should have the correct name', () => {
      const err = new ChainError('test');
      expect(err.name).toBe('ChainError');
    });

    it('should have the correct error code', () => {
      const err = new ChainError('test');
      expect(err.code).toBe('CHAIN_ERROR');
    });

    it('should support cause chaining', () => {
      const inner = new Error('inner failure');
      const err = new ChainError('outer failure', { cause: inner });
      expect(err.cause).toBe(inner);
    });
  });

  describe('ClockError', () => {
    it('should be an instance of ClockError and Error', () => {
      const err = new ClockError('clock drift detected');
      expect(err).toBeInstanceOf(ClockError);
      expect(err).toBeInstanceOf(Error);
    });

    it('should have the correct name', () => {
      const err = new ClockError('test');
      expect(err.name).toBe('ClockError');
    });

    it('should have the correct error code', () => {
      const err = new ClockError('test');
      expect(err.code).toBe('CLOCK_ERROR');
    });

    it('should support cause chaining', () => {
      const inner = new Error('inner failure');
      const err = new ClockError('outer failure', { cause: inner });
      expect(err.cause).toBe(inner);
    });
  });
});
