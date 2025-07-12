import { EmailService } from '../email-service';
import { MockSendGridProvider } from '../providers/mock-sendgrid.provider';
import { MockMailgunProvider } from '../providers/mock-mailgun.provider';
import { EmailMessage, EmailServiceConfig, CircuitBreakerState } from '../types';
import { createDefaultConfig } from '../index';

// Mock console methods to suppress output during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('EmailService', () => {
  let emailService: EmailService;
  let sendGridProvider: MockSendGridProvider;
  let mailgunProvider: MockMailgunProvider;
  let config: EmailServiceConfig;

  const testEmail: EmailMessage = {
    id: 'test-email-1',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Email',
    body: 'This is a test email.'
  };

  beforeEach(() => {
    sendGridProvider = new MockSendGridProvider(0, 50); // No failures, fast
    mailgunProvider = new MockMailgunProvider(0, 50);   // No failures, fast
    
    config = {
      ...createDefaultConfig(),
      rateLimit: {
        maxRequestsPerMinute: 100, // High limit for tests
        windowSizeMs: 60000
      }
    };
    
    emailService = new EmailService([sendGridProvider, mailgunProvider], config);
  });

  afterEach(() => {
    if (emailService) {
      emailService.destroy();
    }
  });

  describe('sendEmail', () => {
    it('should send email successfully with primary provider', async () => {
      const result = await emailService.sendEmail(testEmail);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Make SendGrid always fail
      sendGridProvider.setFailureRate(1);
      
      const result = await emailService.sendEmail(testEmail);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mg_/); // Mailgun prefix
    });

    it('should fail when all providers fail', async () => {
      // Create a service with minimal retry config to avoid timeout
      const fastFailConfig = {
        ...config,
        retry: {
          maxRetries: 1,
          baseDelay: 10,
          maxDelay: 50,
          backoffMultiplier: 1.5
        }
      };
      
      const fastFailService = new EmailService([sendGridProvider, mailgunProvider], fastFailConfig);
      
      sendGridProvider.setFailureRate(1);
      mailgunProvider.setFailureRate(1);
      
      const result = await fastFailService.sendEmail(testEmail);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Clean up
      fastFailService.destroy();
    });

    it('should respect idempotency', async () => {
      const result1 = await emailService.sendEmail(testEmail);
      const result2 = await emailService.sendEmail(testEmail);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.messageId).toBe(result2.messageId);
    });

    it('should track email attempts', async () => {
      await emailService.sendEmail(testEmail);
      
      const attempts = emailService.getEmailAttempts(testEmail.id);
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].emailId).toBe(testEmail.id);
      expect(attempts[0].provider).toBe('SendGrid');
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after failures', async () => {
      // Configure for quick circuit breaker opening
      const quickConfig = {
        ...config,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 1000,
          monitoringPeriodMs: 500
        },
        retry: {
          maxRetries: 1,
          baseDelay: 10,
          maxDelay: 100,
          backoffMultiplier: 2
        }
      };
      
      const quickService = new EmailService([sendGridProvider], quickConfig);
      sendGridProvider.setFailureRate(1);
      
      // Send enough emails to trip the circuit breaker
      let failureCount = 0;
      for (let i = 0; i < 3; i++) {
        const result = await quickService.sendEmail({
          ...testEmail,
          id: `test-email-${i}`
        });
        
        if (!result.success) {
          failureCount++;
        }
      }
      
      // Should have failures
      expect(failureCount).toBeGreaterThan(0);
      
      const stats = quickService.getStats();
      const sgStats = stats.providers.find(p => p.name === 'SendGrid');
      
      expect(sgStats?.circuitBreakerState).toBe(CircuitBreakerState.OPEN);
      
      // Clean up
      quickService.destroy();
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const limitedConfig = {
        ...config,
        rateLimit: {
          maxRequestsPerMinute: 2,
          windowSizeMs: 1000
        }
      };
      
      const limitedService = new EmailService([sendGridProvider], limitedConfig);
      
      const startTime = Date.now();
      
      // Send 3 emails (should hit rate limit on 3rd)
      await limitedService.sendEmail({ ...testEmail, id: 'email-1' });
      await limitedService.sendEmail({ ...testEmail, id: 'email-2' });
      await limitedService.sendEmail({ ...testEmail, id: 'email-3' });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThan(900);
      
      // Clean up
      limitedService.destroy();
    });
  });

  describe('async queue', () => {
    it('should process emails through queue', async () => {
      const emails = [
        { ...testEmail, id: 'queue-email-1' },
        { ...testEmail, id: 'queue-email-2' },
        { ...testEmail, id: 'queue-email-3' }
      ];
      
      // Queue emails
      emails.forEach((email, index) => {
        emailService.sendEmailAsync(email, index);
      });
      
      // Wait for processing to complete
      await emailService.waitForQueueCompletion();
      
      const stats = emailService.getStats();
      expect(stats.queue.total).toBe(0); // All processed
    });
  });

  describe('service stats', () => {
    it('should provide comprehensive stats', async () => {
      await emailService.sendEmail(testEmail);
      
      const stats = emailService.getStats();
      
      expect(stats.providers).toHaveLength(2);
      expect(stats.providers[0].name).toBe('SendGrid');
      expect(stats.providers[1].name).toBe('Mailgun');
      expect(stats.rateLimiter).toBeDefined();
      expect(stats.idempotency).toBeDefined();
      expect(stats.queue).toBeDefined();
    });
  });

  describe('reset methods', () => {
    it('should reset circuit breakers', () => {
      emailService.resetCircuitBreakers();
      
      const stats = emailService.getStats();
      stats.providers.forEach(provider => {
        expect(provider.circuitBreakerState).toBe(CircuitBreakerState.CLOSED);
      });
    });

    it('should reset rate limiter', () => {
      emailService.resetRateLimiter();
      
      const stats = emailService.getStats();
      expect(stats.rateLimiter.currentRequests).toBe(0);
    });

    it('should clear idempotency cache', () => {
      emailService.clearIdempotencyCache();
      
      const stats = emailService.getStats();
      expect(stats.idempotency.recordCount).toBe(0);
    });

    it('should clear queue', async () => {
      emailService.sendEmailAsync(testEmail);
      
      // Wait a bit for the queue to start processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      emailService.clearQueue();
      
      const stats = emailService.getStats();
      expect(stats.queue.total).toBe(0);
    });
  });
});
