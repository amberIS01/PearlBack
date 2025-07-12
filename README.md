# Resilient Email Service

A robust, production-ready email sending service built with TypeScript that implements multiple resilience patterns including retry logic, fallback mechanisms, circuit breakers, rate limiting, and idempotency.

## Features

### Core Features
- ✅ **Multiple Provider Support**: Works with multiple email providers with automatic fallback
- ✅ **Retry Logic**: Exponential backoff with jitter for failed sends
- ✅ **Circuit Breaker**: Prevents cascading failures by temporarily disabling failing providers
- ✅ **Rate Limiting**: Sliding window rate limiter to respect API limits
- ✅ **Idempotency**: Prevents duplicate email sends using configurable TTL
- ✅ **Status Tracking**: Comprehensive tracking of all email sending attempts

### Bonus Features
- ✅ **Queue System**: Asynchronous email processing with priority support
- ✅ **Logging**: Structured logging with configurable levels
- ✅ **Statistics**: Real-time service health and performance metrics
- ✅ **Mock Providers**: Realistic mock providers for testing and development

## Project Structure

```
src/
├── email-service.ts          # Main service implementation
├── types.ts                  # TypeScript interfaces and types
├── index.ts                  # Main entry point and configuration
├── providers/                # Email provider implementations
│   ├── mock-sendgrid.provider.ts
│   └── mock-mailgun.provider.ts
├── utils/                    # Utility classes for resilience patterns
│   ├── circuit-breaker.ts
│   ├── rate-limiter.ts
│   ├── idempotency-manager.ts
│   ├── retry-manager.ts
│   ├── email-queue.ts
│   └── logger.ts
└── __tests__/                # Comprehensive test suite
    ├── email-service.test.ts
    ├── providers.test.ts
    ├── circuit-breaker.test.ts
    ├── rate-limiter.test.ts
    ├── retry-manager.test.ts
    └── idempotency-manager.test.ts
```

## Installation & Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Usage

### Basic Email Sending

```typescript
import { createEmailService } from './src';

// Create service with default configuration
const emailService = createEmailService();

// Send an email
const result = await emailService.sendEmail({
  id: 'unique-email-id',
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Hello World',
  body: 'This is a test email'
});

console.log('Email sent:', result.success);
```

### Asynchronous Queue Processing

```typescript
// Add email to queue for background processing
await emailService.sendEmailAsync({
  id: 'queue-email-1',
  to: 'user@example.com',
  from: 'noreply@example.com',
  subject: 'Welcome!',
  body: 'Welcome to our service!'
}, 1); // Priority level

// Check queue statistics
const stats = emailService.getStats();
console.log('Queue status:', stats.queue);
```

### Configuration

```typescript
import { EmailService } from './src/email-service';
import { MockSendGridProvider, MockMailgunProvider } from './src/providers';

const customConfig = {
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: 5,      // Open after 5 failures
    resetTimeoutMs: 30000,    // Try again after 30 seconds
    monitoringPeriodMs: 60000 // Monitor failures over 1 minute
  },
  
  // Retry settings
  retry: {
    maxRetries: 3,
    baseDelay: 1000,          // Start with 1 second
    maxDelay: 30000,          // Max 30 seconds
    backoffMultiplier: 2      // Double delay each retry
  },
  
  // Rate limiting
  rateLimit: {
    maxRequestsPerMinute: 100,
    windowSizeMs: 60000
  },
  
  // Other settings
  idempotencyTtlMs: 3600000,  // 1 hour
  enableIdempotency: true,
  logLevel: 'info'
};

const providers = [
  new MockSendGridProvider(0.1, 100), // 10% failure rate, 100ms latency
  new MockMailgunProvider(0.1, 150)   // 10% failure rate, 150ms latency
];

const emailService = new EmailService(providers, customConfig);
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Test email service
npx jest src/__tests__/email-service.test.ts

# Test circuit breaker
npx jest src/__tests__/circuit-breaker.test.ts

# Test providers
npx jest src/__tests__/providers.test.ts

# Test rate limiter
npx jest src/__tests__/rate-limiter.test.ts

# Test retry manager
npx jest src/__tests__/retry-manager.test.ts

# Test idempotency
npx jest src/__tests__/idempotency-manager.test.ts
```

### Test Coverage
```bash
npm run test:coverage
```

### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

## Understanding the Resilience Patterns

### Circuit Breaker
- Opens after configured failure threshold
- Prevents requests to failing providers
- Automatically tries to recover after timeout
- Provides fast-fail behavior

### Retry Logic
- Exponential backoff with jitter
- Configurable max retries and delays
- Prevents thundering herd problems
- Logs all retry attempts

### Rate Limiting
- Sliding window algorithm
- Configurable requests per minute
- Automatic backoff when limits hit
- Prevents API quota exhaustion

### Idempotency
- Prevents duplicate sends using unique IDs
- Configurable TTL for cache entries
- Returns cached results for duplicates
- Handles concurrent requests safely

### Provider Fallback
- Automatic failover to backup providers
- Intelligent provider selection
- Health tracking per provider
- Graceful degradation

## API Reference

### EmailService Methods

#### `sendEmail(message: EmailMessage): Promise<EmailSendResult>`
Send an email synchronously with full resilience features.

#### `sendEmailAsync(message: EmailMessage, priority?: number): Promise<void>`
Add email to queue for asynchronous processing.

#### `getStats(): ServiceStats`
Get comprehensive service statistics including:
- Provider health and circuit breaker states
- Rate limiter status
- Idempotency cache size
- Queue statistics

#### `destroy(): void`
Clean up resources and stop background processes.

### Configuration Options

All configuration options are optional and have sensible defaults:

```typescript
interface EmailServiceConfig {
  circuitBreaker: {
    failureThreshold: number;     // Default: 3
    resetTimeoutMs: number;       // Default: 60000 (1 minute)
    monitoringPeriodMs: number;   // Default: 300000 (5 minutes)
  };
  retry: {
    maxRetries: number;           // Default: 3
    baseDelay: number;            // Default: 1000ms
    maxDelay: number;             // Default: 30000ms
    backoffMultiplier: number;    // Default: 2
  };
  rateLimit: {
    maxRequestsPerMinute: number; // Default: 60
    windowSizeMs: number;         // Default: 60000ms
  };
  idempotencyTtlMs: number;       // Default: 3600000 (1 hour)
  enableIdempotency: boolean;     // Default: true
  logLevel: 'error' | 'warn' | 'info' | 'debug'; // Default: 'info'
}
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run build:watch
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Troubleshooting

### Common Issues

1. **Tests failing with "Cannot log after tests are done"**
   - This is fixed - all tests properly clean up resources

2. **Circuit breaker not opening**
   - Check that providers are throwing errors (not returning failure objects)
   - Verify failure threshold configuration

3. **Rate limiting not working**
   - Check windowSizeMs and maxRequestsPerMinute settings
   - Ensure time-based tests account for actual delays

4. **Memory leaks in tests**
   - All services have proper cleanup via `destroy()` method
   - Tests use `afterEach` hooks to clean up

### Debug Logging

Set log level to 'debug' for detailed operation logs:

```typescript
const config = {
  // ... other config
  logLevel: 'debug'
};
```

## License

MIT License - see LICENSE file for details.

// Send an email
const message = {
  id: 'unique-email-id',
  to: 'user@example.com',
  from: 'noreply@myapp.com',
  subject: 'Welcome!',
  body: 'Welcome to our service!'
};

try {
  const result = await emailService.sendEmail(message);
  console.log('Email sent:', result);
} catch (error) {
  console.error('Failed to send:', error);
}
```

### Advanced Configuration

```typescript
import { EmailService } from './src/email-service';
import { MockSendGridProvider, MockMailgunProvider } from './src';

const config = {
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  rateLimit: {
    maxRequestsPerMinute: 10,
    windowSizeMs: 60000
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringPeriodMs: 10000
  },
  enableIdempotency: true,
  idempotencyTtlMs: 24 * 60 * 60 * 1000 // 24 hours
};

const providers = [
  new MockSendGridProvider(),
  new MockMailgunProvider()
];

const emailService = new EmailService(providers, config);
```

## API Reference

### EmailService

#### Methods

##### `sendEmail(message: EmailMessage): Promise<EmailSendResult>`
Send an email synchronously with full resilience features.

##### `sendEmailAsync(message: EmailMessage, priority?: number): Promise<void>`
Queue an email for asynchronous processing.

##### `getEmailAttempts(emailId: string): EmailAttempt[]`
Get all sending attempts for a specific email.

##### `getStats(): ServiceStats`
Get comprehensive service statistics.

##### Reset Methods
- `resetCircuitBreakers()`: Reset all circuit breakers
- `resetRateLimiter()`: Reset rate limiter
- `clearIdempotencyCache()`: Clear idempotency cache
- `clearQueue()`: Clear email queue

### Types

```typescript
interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  duration: number;
}
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Coverage
The test suite includes comprehensive coverage of:
- Email sending scenarios (success, failure, fallback)
- Circuit breaker behavior
- Rate limiting
- Idempotency
- Retry logic
- Queue processing
- Mock provider behavior

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
```

## Configuration Reference

### RetryConfig
```typescript
{
  maxRetries: number;        // Maximum retry attempts (default: 3)
  baseDelay: number;         // Base delay in ms (default: 1000)
  maxDelay: number;          // Maximum delay in ms (default: 30000)
  backoffMultiplier: number; // Exponential backoff multiplier (default: 2)
}
```

### RateLimitConfig
```typescript
{
  maxRequestsPerMinute: number; // Max requests per window (default: 10)
  windowSizeMs: number;         // Window size in ms (default: 60000)
}
```

### CircuitBreakerConfig
```typescript
{
  failureThreshold: number;   // Failures before opening (default: 5)
  resetTimeoutMs: number;     // Reset timeout in ms (default: 60000)
  monitoringPeriodMs: number; // Monitoring period in ms (default: 10000)
}
```

## Implementation Details

### Resilience Patterns

#### 1. Retry with Exponential Backoff
- Configurable retry attempts with exponential backoff
- Jitter added to prevent thundering herd
- Maximum delay cap to prevent excessive waits

#### 2. Circuit Breaker
- Per-provider circuit breakers
- Three states: CLOSED, OPEN, HALF_OPEN
- Automatic recovery with success threshold

#### 3. Fallback Mechanism
- Automatic failover between providers
- Primary provider preference with dynamic switching
- Health-based provider selection

#### 4. Rate Limiting
- Sliding window rate limiter
- Configurable limits per time window
- Automatic queuing when limits exceeded

#### 5. Idempotency
- Configurable TTL for duplicate detection
- Automatic cleanup of expired records
- Result caching for duplicate requests

### Provider Implementation

Mock providers simulate real-world behavior:
- Configurable failure rates
- Realistic latency simulation
- Provider-specific message ID formats
- Health monitoring capabilities

### Queue System

The async queue provides:
- Priority-based ordering
- Automatic retry for failed items
- Comprehensive statistics
- Background processing

## Assumptions and Design Decisions

### Assumptions
1. Email IDs are provided by the client and are unique
2. Providers are stateless and can be called concurrently
3. Network failures are transient and worth retrying
4. Rate limits are per-service, not per-provider
5. Circuit breaker state is not persisted across restarts

### Design Decisions
1. **TypeScript**: Chosen for type safety and better development experience
2. **Zero External Dependencies**: Only dev dependencies for testing and building
3. **In-Memory Storage**: For simplicity, all state is kept in memory
4. **Mock Providers**: Realistic simulation without external dependencies
5. **Configurable Everything**: All thresholds and timeouts are configurable
6. **Comprehensive Logging**: Structured logging for observability
7. **SOLID Principles**: Clear separation of concerns and dependency injection

### Trade-offs
1. **Memory vs Persistence**: In-memory storage is simple but not persistent
2. **Complexity vs Features**: Rich feature set adds complexity
3. **Performance vs Reliability**: Multiple resilience patterns add latency
4. **Flexibility vs Simplicity**: Highly configurable but requires understanding

## Monitoring and Observability

### Service Statistics
The service provides real-time statistics:
- Provider health and circuit breaker states
- Rate limiter usage
- Queue status and processing metrics
- Idempotency cache statistics

### Logging
Structured logging with configurable levels:
- DEBUG: Detailed operation information
- INFO: General operational messages
- WARN: Recoverable issues and fallbacks
- ERROR: Actual failures and circuit breaker events

## Production Considerations

### Deployment
1. Configure appropriate timeouts based on your SLA
2. Set up monitoring for circuit breaker state changes
3. Monitor rate limiter to avoid unnecessary delays
4. Tune retry configuration based on provider SLAs

### Scaling
1. Consider distributed circuit breaker state for multiple instances
2. Use external queue system for high-volume scenarios
3. Implement persistent idempotency store for multi-instance deployments
4. Add metrics export for monitoring systems

### Security
1. Validate email content and headers
2. Implement authentication for queue access
3. Consider rate limiting per tenant/user
4. Add audit logging for compliance

## License

MIT License - see LICENSE file for details.
