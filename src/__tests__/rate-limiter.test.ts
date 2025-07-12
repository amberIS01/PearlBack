import { RateLimiter } from '../utils/rate-limiter';
import { RateLimitConfig } from '../types';

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

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let config: RateLimitConfig;

  beforeEach(() => {
    config = {
      maxRequestsPerMinute: 3,
      windowSizeMs: 1000
    };
    rateLimiter = new RateLimiter(config);
  });

  it('should allow requests under the limit', async () => {
    await rateLimiter.checkRateLimit();
    await rateLimiter.checkRateLimit();
    
    expect(rateLimiter.getCurrentRequestCount()).toBe(2);
  });

  it('should delay requests over the limit', async () => {
    // Fill up the rate limit
    await rateLimiter.checkRateLimit();
    await rateLimiter.checkRateLimit();
    await rateLimiter.checkRateLimit();

    const startTime = Date.now();
    await rateLimiter.checkRateLimit(); // Should be delayed
    const endTime = Date.now();

    const duration = endTime - startTime;
    expect(duration).toBeGreaterThan(900); // Should wait ~1 second
  });

  it('should reset request count', () => {
    rateLimiter.reset();
    expect(rateLimiter.getCurrentRequestCount()).toBe(0);
  });

  it('should handle sliding window correctly', async () => {
    // Make 3 requests
    await rateLimiter.checkRateLimit();
    await rateLimiter.checkRateLimit();
    await rateLimiter.checkRateLimit();

    // Wait for window to slide
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be able to make requests again
    await rateLimiter.checkRateLimit();
    expect(rateLimiter.getCurrentRequestCount()).toBe(1);
  });
});
