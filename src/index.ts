import { EmailService } from './email-service';
import { MockSendGridProvider } from './providers/mock-sendgrid.provider';
import { MockMailgunProvider } from './providers/mock-mailgun.provider';
import { EmailServiceConfig } from './types';

// Export all types and classes
export * from './types';
export * from './email-service';
export * from './providers/mock-sendgrid.provider';
export * from './providers/mock-mailgun.provider';
export * from './utils/logger';
export * from './utils/circuit-breaker';
export * from './utils/rate-limiter';
export * from './utils/idempotency-manager';
export * from './utils/retry-manager';
export * from './utils/email-queue';

/**
 * Create a default email service configuration
 */
export function createDefaultConfig(): EmailServiceConfig {
  return {
    retry: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    },
    rateLimit: {
      maxRequestsPerMinute: 10,
      windowSizeMs: 60000
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 10000
    },
    enableIdempotency: true,
    idempotencyTtlMs: 24 * 60 * 60 * 1000 // 24 hours
  };
}

/**
 * Create a default email service with mock providers
 */
export function createEmailService(config?: Partial<EmailServiceConfig>): EmailService {
  const fullConfig = { ...createDefaultConfig(), ...config };
  
  const providers = [
    new MockSendGridProvider(),
    new MockMailgunProvider()
  ];
  
  return new EmailService(providers, fullConfig);
}

// Example usage
if (require.main === module) {
  async function example() {
    const emailService = createEmailService();
    
    const message = {
      id: 'test-email-1',
      to: 'user@example.com',
      from: 'noreply@myapp.com',
      subject: 'Test Email',
      body: 'This is a test email from the resilient email service.'
    };
    
    try {
      console.log('Sending email...');
      const result = await emailService.sendEmail(message);
      console.log('Email sent:', result);
      
      console.log('Service stats:', emailService.getStats());
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }
  
  example().catch(console.error);
}
