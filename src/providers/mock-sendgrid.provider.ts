import { EmailMessage, EmailProvider, EmailSendResult } from '../types';
import { Logger } from '../utils/logger';

/**
 * Mock email provider that simulates SendGrid behavior
 */
export class MockSendGridProvider implements EmailProvider {
  public name = 'SendGrid';
  private failureRate: number;
  private latencyMs: number;
  private logger: Logger;

  constructor(failureRate = 0.1, latencyMs = 100) {
    this.failureRate = failureRate;
    this.latencyMs = latencyMs;
    this.logger = new Logger('MockSendGridProvider');
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const startTime = Date.now();
    
    this.logger.info(`Attempting to send email ${message.id} to ${message.to}`);
    
    // Simulate network latency
    await this.delay(this.latencyMs + Math.random() * 50);
    
    // Simulate random failures
    if (Math.random() < this.failureRate) {
      const duration = Date.now() - startTime;
      const error = 'SendGrid API temporarily unavailable';
      
      this.logger.error(`Failed to send email ${message.id}: ${error}`);
      
      throw new Error(error);
    }
    
    const duration = Date.now() - startTime;
    const messageId = `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`Successfully sent email ${message.id} via SendGrid (messageId: ${messageId})`);
    
    return {
      success: true,
      messageId,
      duration
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      timer.unref(); // Don't keep the process alive
    });
  }

  // Method to simulate provider health changes for testing
  public setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  public setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }
}
