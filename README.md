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

## Architecture

The service follows SOLID principles and uses a layered architecture:

```
EmailService
├── Providers (SendGrid, Mailgun mocks)
├── CircuitBreaker (per provider)
├── RateLimiter (global)
├── IdempotencyManager (global)
├── RetryManager (per operation)
├── EmailQueue (async processing)
└── Logger (structured logging)
```

## Quick Start

### Installation

```bash
npm install
```

### Basic Usage

```typescript
import { createEmailService } from './src';

// Create service with default configuration
const emailService = createEmailService();

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
