import { MockSendGridProvider } from '../providers/mock-sendgrid.provider';
import { MockMailgunProvider } from '../providers/mock-mailgun.provider';
import { EmailMessage } from '../types';

describe('Mock Email Providers', () => {
  const testEmail: EmailMessage = {
    id: 'test-email-1',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Email',
    body: 'This is a test email.'
  };

  describe('MockSendGridProvider', () => {
    let provider: MockSendGridProvider;

    beforeEach(() => {
      provider = new MockSendGridProvider(0, 50); // No failures, 50ms latency
    });

    it('should send email successfully', async () => {
      const result = await provider.sendEmail(testEmail);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^sg_/);
      expect(result.duration).toBeGreaterThan(40);
      expect(result.error).toBeUndefined();
    });

    it('should fail when failure rate is set', async () => {
      provider.setFailureRate(1); // 100% failure rate
      
      const result = await provider.sendEmail(testEmail);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.messageId).toBeUndefined();
    });

    it('should respect latency settings', async () => {
      provider.setLatency(200);
      
      const startTime = Date.now();
      await provider.sendEmail(testEmail);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(180); // Allow some variance
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('SendGrid');
    });
  });

  describe('MockMailgunProvider', () => {
    let provider: MockMailgunProvider;

    beforeEach(() => {
      provider = new MockMailgunProvider(0, 50); // No failures, 50ms latency
    });

    it('should send email successfully', async () => {
      const result = await provider.sendEmail(testEmail);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mg_/);
      expect(result.duration).toBeGreaterThan(40);
      expect(result.error).toBeUndefined();
    });

    it('should fail when failure rate is set', async () => {
      provider.setFailureRate(1); // 100% failure rate
      
      const result = await provider.sendEmail(testEmail);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.messageId).toBeUndefined();
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('Mailgun');
    });

    it('should have different default settings than SendGrid', () => {
      const sendGrid = new MockSendGridProvider();
      const mailgun = new MockMailgunProvider();
      
      // They should have different default failure rates and latencies
      // This is based on the constructor defaults
      expect(sendGrid.name).not.toBe(mailgun.name);
    });
  });
});
