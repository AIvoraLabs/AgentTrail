/**
 * Typed error classes for the AgentTrail SDK.
 * Each error carries a `code` property and optional `cause` for error chaining.
 */

export class ComplianceError extends Error {
  readonly code: string = 'COMPLIANCE_ERROR';
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ComplianceError';
    this.cause = options?.cause;
  }
}

export class SignatureError extends Error {
  readonly code: string = 'SIGNATURE_ERROR';
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'SignatureError';
    this.cause = options?.cause;
  }
}

export class ChainError extends Error {
  readonly code: string = 'CHAIN_ERROR';
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ChainError';
    this.cause = options?.cause;
  }
}

export class ClockError extends Error {
  readonly code: string = 'CLOCK_ERROR';
  cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ClockError';
    this.cause = options?.cause;
  }
}

/** Union type of all AgentTrail error classes. */
export type AgentTrailError =
  | ComplianceError
  | SignatureError
  | ChainError
  | ClockError;
