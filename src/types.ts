/**
 * Core types and interfaces for the email service
 */

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export enum EmailStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface EmailAttempt {
  id: string;
  emailId: string;
  provider: string;
  status: EmailStatus;
  attempt: number;
  timestamp: Date;
  error?: string;
  duration?: number;
}

export interface EmailProvider {
  name: string;
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  duration: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  windowSizeMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export interface EmailServiceConfig {
  retry: RetryConfig;
  rateLimit: RateLimitConfig;
  circuitBreaker: CircuitBreakerConfig;
  enableIdempotency: boolean;
  idempotencyTtlMs: number;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}
