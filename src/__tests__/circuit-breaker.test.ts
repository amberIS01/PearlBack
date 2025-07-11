import { CircuitBreaker } from '../utils/circuit-breaker';
import { CircuitBreakerConfig, CircuitBreakerState } from '../types';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let config: CircuitBreakerConfig;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      monitoringPeriodMs: 500
    };
    circuitBreaker = new CircuitBreaker(config, 'test');
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should open after reaching failure threshold', async () => {
    const failingOperation = () => Promise.reject(new Error('Test failure'));

    // Execute failing operations
    for (let i = 0; i < config.failureThreshold; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should reject operations when OPEN', async () => {
    // Trip the circuit breaker
    const failingOperation = () => Promise.reject(new Error('Test failure'));
    for (let i = 0; i < config.failureThreshold; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
    }

    // Now it should reject immediately
    await expect(
      circuitBreaker.execute(() => Promise.resolve('success'))
    ).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    // Trip the circuit breaker
    const failingOperation = () => Promise.reject(new Error('Test failure'));
    for (let i = 0; i < config.failureThreshold; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, config.resetTimeoutMs + 100));

    // Next operation should transition to HALF_OPEN
    try {
      await circuitBreaker.execute(() => Promise.resolve('success'));
    } catch (error) {
      // This might fail, but state should change
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should reset manually', () => {
    // Trip the circuit breaker
    circuitBreaker['failureCount'] = config.failureThreshold;
    circuitBreaker['state'] = CircuitBreakerState.OPEN;

    circuitBreaker.reset();

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
});
