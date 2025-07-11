import { EmailMessage, EmailStatus } from '../types';
import { Logger } from '../utils/logger';

interface QueueItem {
  email: EmailMessage;
  priority: number;
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  status: EmailStatus;
}

/**
 * Simple priority queue for email processing
 */
export class EmailQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private logger: Logger;
  private processor?: (email: EmailMessage) => Promise<void>;

  constructor() {
    this.logger = new Logger('EmailQueue');
  }

  /**
   * Add an email to the queue
   */
  enqueue(email: EmailMessage, priority: number = 0): void {
    const item: QueueItem = {
      email,
      priority,
      attempts: 0,
      status: EmailStatus.PENDING
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(queueItem => queueItem.priority < priority);
    
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    this.logger.info(`Enqueued email ${email.id} with priority ${priority}. Queue size: ${this.queue.length}`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  /**
   * Set the processor function for emails
   */
  setProcessor(processor: (email: EmailMessage) => Promise<void>): void {
    this.processor = processor;
  }

  /**
   * Start processing the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.processing || !this.processor) {
      return;
    }

    this.processing = true;
    this.logger.info('Started processing email queue');

    while (this.queue.length > 0) {
      const item = this.getNextItem();
      
      if (!item) {
        // No items ready to process, wait a bit
        await this.delay(1000);
        continue;
      }

      try {
        item.status = EmailStatus.SENDING;
        item.attempts++;
        item.lastAttempt = new Date();

        this.logger.info(`Processing email ${item.email.id} (attempt ${item.attempts})`);
        
        await this.processor(item.email);
        
        // Remove successful item from queue
        this.removeItem(item.email.id);
        
        this.logger.info(`Successfully processed email ${item.email.id}`);
        
      } catch (error) {
        this.logger.error(`Failed to process email ${item.email.id}: ${(error as Error).message}`);
        
        if (item.attempts >= 3) {
          // Max attempts reached, remove from queue
          item.status = EmailStatus.FAILED;
          this.removeItem(item.email.id);
          this.logger.error(`Email ${item.email.id} failed after ${item.attempts} attempts`);
        } else {
          // Schedule for retry
          item.status = EmailStatus.RETRYING;
          item.nextAttempt = new Date(Date.now() + Math.pow(2, item.attempts) * 1000);
          this.logger.info(`Email ${item.email.id} scheduled for retry at ${item.nextAttempt}`);
        }
      }
      
      // Small delay between processing items
      await this.delay(100);
    }

    this.processing = false;
    this.logger.info('Finished processing email queue');
  }

  private getNextItem(): QueueItem | undefined {
    const now = new Date();
    
    // Find the highest priority item that's ready to process
    return this.queue.find(item => 
      item.status === EmailStatus.PENDING || 
      (item.status === EmailStatus.RETRYING && item.nextAttempt && item.nextAttempt <= now)
    );
  }

  private removeItem(emailId: string): void {
    const index = this.queue.findIndex(item => item.email.id === emailId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    sending: number;
    retrying: number;
    failed: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      sending: 0,
      retrying: 0,
      failed: 0
    };

    this.queue.forEach(item => {
      switch (item.status) {
        case EmailStatus.PENDING:
          stats.pending++;
          break;
        case EmailStatus.SENDING:
          stats.sending++;
          break;
        case EmailStatus.RETRYING:
          stats.retrying++;
          break;
        case EmailStatus.FAILED:
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.logger.info('Email queue cleared');
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}
