import { RetryManager } from '../utils/retry-manager';
import { RetryConfig } from '../types';

describe('RetryManager', () => {
  let retryManager: RetryManager;
  let config: RetryConfig;

  beforeEach(() => {
    config = {
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    };
    retryManager = new RetryManager(config);
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retryManager.executeWithRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success');
    
    const result = await retryManager.executeWithRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(retryManager.executeWithRetry(operation)).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it('should calculate exponential backoff delays', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Fail'));
    const startTime = Date.now();
    
    try {
      await retryManager.executeWithRetry(operation);
    } catch (error) {
      // Expected to fail
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should take at least some time due to delays
    // Base delay: 100ms, with backoff: 100, 200, 400ms (with jitter)
    expect(duration).toBeGreaterThan(300);
  });

  it('should respect max delay', () => {
    const shortConfig = {
      ...config,
      maxDelay: 50
    };
    const shortRetryManager = new RetryManager(shortConfig);
    
    // Calculate delay for a high attempt number
    const delay = shortRetryManager['calculateDelay'](10);
    expect(delay).toBeLessThanOrEqual(shortConfig.maxDelay);
  });
});
