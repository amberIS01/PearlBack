import { RateLimitConfig } from '../types';
import { Logger } from '../utils/logger';

/**
 * Simple sliding window rate limiter
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;
  private logger: Logger;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.logger = new Logger('RateLimiter');
  }

  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);
    
    if (this.requests.length >= this.config.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + this.config.windowSizeMs - now;
      
      this.logger.warn(`Rate limit exceeded. Waiting ${waitTime}ms`);
      
      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.checkRateLimit(); // Re-check after waiting
      }
    }
    
    // Add current request to the window
    this.requests.push(now);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      timer.unref(); // Don't keep the process alive
    });
  }

  public getCurrentRequestCount(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;
    return this.requests.filter(timestamp => timestamp > windowStart).length;
  }

  public reset(): void {
    this.requests = [];
    this.logger.info('Rate limiter reset');
  }
}
