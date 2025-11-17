import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/crypto';

describe('Crypto Utils', () => {
  describe('Password Hashing (PBKDF2)', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Due to random salt, hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });
  });

  describe('JWT Token', () => {
    const secret = 'test-secret-key';

    it('should generate valid JWT token', async () => {
      const userId = 'user-001';
      const role = 'ADMIN';
      const token = await generateToken(userId, role, secret);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should verify valid JWT token', async () => {
      const userId = 'user-001';
      const role = 'ADMIN';
      const token = await generateToken(userId, role, secret);
      const decoded = await verifyToken(token, secret);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(decoded?.role).toBe(role);
    });

    it('should reject token with wrong secret', async () => {
      const userId = 'user-001';
      const role = 'ADMIN';
      const token = await generateToken(userId, role, secret);
      const decoded = await verifyToken(token, 'wrong-secret');
      
      expect(decoded).toBeNull();
    });

    it('should reject malformed token', async () => {
      const malformedToken = 'invalid.token.here';
      const decoded = await verifyToken(malformedToken, secret);
      
      expect(decoded).toBeNull();
    });

    it('should reject expired token', async () => {
      // Create a token with past expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTAwMSIsInJvbGUiOiJBRE1JTiIsImV4cCI6MTAwMDAwMDAwMH0.signature';
      const decoded = await verifyToken(expiredToken, secret);
      
      expect(decoded).toBeNull();
    });
  });
});
