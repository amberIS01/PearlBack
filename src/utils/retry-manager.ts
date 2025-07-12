import { RetryConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * Utility for implementing retry logic with exponential backoff
 */
export class RetryManager {
  private config: RetryConfig;
  private logger: Logger;

  constructor(config: RetryConfig) {
    this.config = config;
    this.logger = new Logger('RetryManager');
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        this.logger.debug(`${context} - Attempt ${attempt}/${this.config.maxRetries + 1}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt > this.config.maxRetries) {
          this.logger.error(`${context} - Failed after ${attempt} attempts: ${lastError.message}`);
          throw lastError;
        }
        
        const delay = this.calculateDelay(attempt);
        this.logger.warn(`${context} - Attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms`);
        
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add 50% jitter
    return Math.min(jitteredDelay, this.config.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      timer.unref(); // Don't keep the process alive
    });
  }

  public getConfig(): RetryConfig {
    return { ...this.config };
  }
}
