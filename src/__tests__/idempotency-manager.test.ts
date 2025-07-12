import { IdempotencyManager } from '../utils/idempotency-manager';

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

describe('IdempotencyManager', () => {
  let idempotencyManager: IdempotencyManager;

  beforeEach(() => {
    idempotencyManager = new IdempotencyManager(5000); // 5 second TTL
  });

  it('should detect duplicates', () => {
    const emailId = 'test-email-1';
    
    idempotencyManager.markInProgress(emailId);
    expect(idempotencyManager.isDuplicate(emailId)).toBe(true);
  });

  it('should not detect non-existent records as duplicates', () => {
    expect(idempotencyManager.isDuplicate('non-existent')).toBe(false);
  });

  it('should store and retrieve results', () => {
    const emailId = 'test-email-1';
    const result = { success: true, messageId: 'msg-123' };
    
    idempotencyManager.markInProgress(emailId);
    idempotencyManager.markCompleted(emailId, result);
    
    expect(idempotencyManager.getResult(emailId)).toEqual(result);
  });

  it('should remove records', () => {
    const emailId = 'test-email-1';
    
    idempotencyManager.markInProgress(emailId);
    expect(idempotencyManager.isDuplicate(emailId)).toBe(true);
    
    idempotencyManager.remove(emailId);
    expect(idempotencyManager.isDuplicate(emailId)).toBe(false);
  });

  it('should clear all records', () => {
    idempotencyManager.markInProgress('email-1');
    idempotencyManager.markInProgress('email-2');
    
    expect(idempotencyManager.getRecordCount()).toBe(2);
    
    idempotencyManager.clear();
    expect(idempotencyManager.getRecordCount()).toBe(0);
  });

  it('should handle expired records', async () => {
    const shortTtlManager = new IdempotencyManager(100); // 100ms TTL
    const emailId = 'test-email-1';
    
    shortTtlManager.markInProgress(emailId);
    expect(shortTtlManager.isDuplicate(emailId)).toBe(true);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(shortTtlManager.isDuplicate(emailId)).toBe(false);
  });
});
