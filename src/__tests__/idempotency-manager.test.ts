import { IdempotencyManager } from '../utils/idempotency-manager';

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
