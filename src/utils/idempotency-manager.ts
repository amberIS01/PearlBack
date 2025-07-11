import { Logger } from '../utils/logger';

interface IdempotencyRecord {
  emailId: string;
  timestamp: Date;
  result?: any;
  completed: boolean;
}

/**
 * Manages idempotency to prevent duplicate email sends
 */
export class IdempotencyManager {
  private records = new Map<string, IdempotencyRecord>();
  private ttlMs: number;
  private logger: Logger;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
    this.logger = new Logger('IdempotencyManager');
    
    // Clean up expired records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an email with this ID has already been processed
   */
  isDuplicate(emailId: string): boolean {
    const record = this.records.get(emailId);
    
    if (!record) {
      return false;
    }
    
    // Check if record has expired
    if (this.isExpired(record)) {
      this.records.delete(emailId);
      return false;
    }
    
    return true;
  }

  /**
   * Get the result of a previously processed email
   */
  getResult(emailId: string): any | undefined {
    const record = this.records.get(emailId);
    
    if (!record || this.isExpired(record) || !record.completed) {
      return undefined;
    }
    
    return record.result;
  }

  /**
   * Mark an email as being processed
   */
  markInProgress(emailId: string): void {
    this.records.set(emailId, {
      emailId,
      timestamp: new Date(),
      completed: false
    });
    
    this.logger.debug(`Marked email ${emailId} as in progress`);
  }

  /**
   * Mark an email as completed with its result
   */
  markCompleted(emailId: string, result: any): void {
    const record = this.records.get(emailId);
    
    if (record) {
      record.completed = true;
      record.result = result;
      this.logger.debug(`Marked email ${emailId} as completed`);
    }
  }

  /**
   * Remove a record (useful for failed attempts that should be retryable)
   */
  remove(emailId: string): void {
    this.records.delete(emailId);
    this.logger.debug(`Removed idempotency record for email ${emailId}`);
  }

  private isExpired(record: IdempotencyRecord): boolean {
    return Date.now() - record.timestamp.getTime() > this.ttlMs;
  }

  private cleanup(): void {
    const beforeCount = this.records.size;
    const now = Date.now();
    
    for (const [emailId, record] of this.records.entries()) {
      if (now - record.timestamp.getTime() > this.ttlMs) {
        this.records.delete(emailId);
      }
    }
    
    const removedCount = beforeCount - this.records.size;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired idempotency records`);
    }
  }

  public getRecordCount(): number {
    return this.records.size;
  }

  public clear(): void {
    this.records.clear();
    this.logger.info('Idempotency manager cleared');
  }
}
