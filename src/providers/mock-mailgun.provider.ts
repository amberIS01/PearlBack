import { EmailMessage, EmailProvider, EmailSendResult } from '../types';
import { Logger } from '../utils/logger';

/**
 * Mock email provider that simulates Mailgun behavior
 */
export class MockMailgunProvider implements EmailProvider {
  public name = 'Mailgun';
  private failureRate: number;
  private latencyMs: number;
  private logger: Logger;

  constructor(failureRate = 0.15, latencyMs = 150) {
    this.failureRate = failureRate;
    this.latencyMs = latencyMs;
    this.logger = new Logger('MockMailgunProvider');
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    const startTime = Date.now();
    
    this.logger.info(`Attempting to send email ${message.id} to ${message.to}`);
    
    // Simulate network latency
    await this.delay(this.latencyMs + Math.random() * 100);
    
    // Simulate random failures
    if (Math.random() < this.failureRate) {
      const duration = Date.now() - startTime;
      const error = 'Mailgun service temporarily overloaded';
      
      this.logger.error(`Failed to send email ${message.id}: ${error}`);
      
      return {
        success: false,
        error,
        duration
      };
    }
    
    const duration = Date.now() - startTime;
    const messageId = `mg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`Successfully sent email ${message.id} via Mailgun (messageId: ${messageId})`);
    
    return {
      success: true,
      messageId,
      duration
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to simulate provider health changes for testing
  public setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  public setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }
}
