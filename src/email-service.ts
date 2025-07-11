import {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  EmailServiceConfig,
  EmailStatus,
  EmailAttempt,
  CircuitBreakerState
} from './types';
import { CircuitBreaker } from './utils/circuit-breaker';
import { RateLimiter } from './utils/rate-limiter';
import { IdempotencyManager } from './utils/idempotency-manager';
import { RetryManager } from './utils/retry-manager';
import { EmailQueue } from './utils/email-queue';
import { Logger } from './utils/logger';

/**
 * Resilient email service with retry logic, fallback, rate limiting, and idempotency
 */
export class EmailService {
  private providers: EmailProvider[];
  private primaryProviderIndex = 0;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private rateLimiter: RateLimiter;
  private idempotencyManager: IdempotencyManager;
  private retryManager: RetryManager;
  private emailQueue: EmailQueue;
  private attempts: Map<string, EmailAttempt[]>;
  private config: EmailServiceConfig;
  private logger: Logger;

  constructor(providers: EmailProvider[], config: EmailServiceConfig) {
    if (providers.length === 0) {
      throw new Error('At least one email provider is required');
    }

    this.providers = providers;
    this.config = config;
    this.logger = new Logger('EmailService');
    
    // Initialize components
    this.circuitBreakers = new Map();
    providers.forEach(provider => {
      this.circuitBreakers.set(
        provider.name,
        new CircuitBreaker(config.circuitBreaker, provider.name)
      );
    });

    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.idempotencyManager = new IdempotencyManager(config.idempotencyTtlMs);
    this.retryManager = new RetryManager(config.retry);
    this.emailQueue = new EmailQueue();
    this.attempts = new Map();

    // Set up queue processor
    this.emailQueue.setProcessor(this.processEmailFromQueue.bind(this));
  }

  /**
   * Send an email with full resilience features
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.info(`Sending email ${message.id} to ${message.to}`);

    // Check idempotency
    if (this.config.enableIdempotency && this.idempotencyManager.isDuplicate(message.id)) {
      const cachedResult = this.idempotencyManager.getResult(message.id);
      if (cachedResult) {
        this.logger.info(`Email ${message.id} already sent (idempotent)`);
        return cachedResult;
      }
    }

    // Mark as in progress for idempotency
    if (this.config.enableIdempotency) {
      this.idempotencyManager.markInProgress(message.id);
    }

    try {
      // Apply rate limiting
      await this.rateLimiter.checkRateLimit();

      // Execute with retry logic
      const result = await this.retryManager.executeWithRetry(
        () => this.sendWithFallback(message),
        `email-${message.id}`
      );

      // Mark as completed for idempotency
      if (this.config.enableIdempotency) {
        this.idempotencyManager.markCompleted(message.id, result);
      }

      return result;

    } catch (error) {
      this.logger.error(`Failed to send email ${message.id}: ${(error as Error).message}`);
      
      // Remove from idempotency cache on failure to allow retry
      if (this.config.enableIdempotency) {
        this.idempotencyManager.remove(message.id);
      }

      return {
        success: false,
        error: (error as Error).message,
        duration: 0
      };
    }
  }

  /**
   * Send email through queue (asynchronous processing)
   */
  async sendEmailAsync(message: EmailMessage, priority: number = 0): Promise<void> {
    this.logger.info(`Queuing email ${message.id} for asynchronous processing`);
    this.emailQueue.enqueue(message, priority);
  }

  /**
   * Process email from queue
   */
  private async processEmailFromQueue(message: EmailMessage): Promise<void> {
    const result = await this.sendEmail(message);
    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  }

  /**
   * Send email with provider fallback
   */
  private async sendWithFallback(message: EmailMessage): Promise<EmailSendResult> {
    let lastError: Error | undefined;

    // Try each provider in order
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.primaryProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];
      const circuitBreaker = this.circuitBreakers.get(provider.name)!;

      try {
        // Skip if circuit breaker is open
        if (circuitBreaker.getState() === CircuitBreakerState.OPEN) {
          this.logger.warn(`Skipping provider ${provider.name} - circuit breaker is OPEN`);
          continue;
        }

        // Execute through circuit breaker
        const result = await circuitBreaker.execute(async () => {
          const attempt = this.recordAttempt(message.id, provider.name);
          
          try {
            const sendResult = await provider.sendEmail(message);
            this.updateAttempt(attempt, EmailStatus.SENT, undefined, sendResult.duration);
            return sendResult;
          } catch (error) {
            this.updateAttempt(attempt, EmailStatus.FAILED, (error as Error).message);
            throw error;
          }
        });

        if (result.success) {
          // Success! Update primary provider if this wasn't the primary
          if (providerIndex !== this.primaryProviderIndex) {
            this.logger.info(`Switching primary provider to ${provider.name}`);
            this.primaryProviderIndex = providerIndex;
          }
          
          return result;
        }

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Provider ${provider.name} failed: ${lastError.message}`);
        continue;
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Record an email sending attempt
   */
  private recordAttempt(emailId: string, provider: string): EmailAttempt {
    if (!this.attempts.has(emailId)) {
      this.attempts.set(emailId, []);
    }

    const attempts = this.attempts.get(emailId)!;
    const attemptNumber = attempts.filter(a => a.provider === provider).length + 1;

    const attempt: EmailAttempt = {
      id: `${emailId}-${provider}-${attemptNumber}`,
      emailId,
      provider,
      status: EmailStatus.SENDING,
      attempt: attemptNumber,
      timestamp: new Date()
    };

    attempts.push(attempt);
    return attempt;
  }

  /**
   * Update an email sending attempt
   */
  private updateAttempt(
    attempt: EmailAttempt,
    status: EmailStatus,
    error?: string,
    duration?: number
  ): void {
    attempt.status = status;
    attempt.error = error;
    attempt.duration = duration;
  }

  /**
   * Get sending attempts for an email
   */
  getEmailAttempts(emailId: string): EmailAttempt[] {
    return this.attempts.get(emailId) || [];
  }

  /**
   * Get service statistics
   */
  getStats(): {
    providers: Array<{
      name: string;
      circuitBreakerState: CircuitBreakerState;
      failureCount: number;
    }>;
    rateLimiter: {
      currentRequests: number;
      maxRequests: number;
    };
    idempotency: {
      recordCount: number;
    };
    queue: {
      total: number;
      pending: number;
      sending: number;
      retrying: number;
      failed: number;
    };
  } {
    return {
      providers: this.providers.map(provider => {
        const circuitBreaker = this.circuitBreakers.get(provider.name)!;
        return {
          name: provider.name,
          circuitBreakerState: circuitBreaker.getState(),
          failureCount: circuitBreaker.getFailureCount()
        };
      }),
      rateLimiter: {
        currentRequests: this.rateLimiter.getCurrentRequestCount(),
        maxRequests: this.config.rateLimit.maxRequestsPerMinute
      },
      idempotency: {
        recordCount: this.idempotencyManager.getRecordCount()
      },
      queue: this.emailQueue.getStats()
    };
  }

  /**
   * Reset circuit breakers for all providers
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
    this.logger.info('All circuit breakers reset');
  }

  /**
   * Clear rate limiter
   */
  resetRateLimiter(): void {
    this.rateLimiter.reset();
    this.logger.info('Rate limiter reset');
  }

  /**
   * Clear idempotency cache
   */
  clearIdempotencyCache(): void {
    this.idempotencyManager.clear();
    this.logger.info('Idempotency cache cleared');
  }

  /**
   * Clear email queue
   */
  clearQueue(): void {
    this.emailQueue.clear();
    this.logger.info('Email queue cleared');
  }
}
