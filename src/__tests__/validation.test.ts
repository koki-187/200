import { 
  validateData, 
  loginSchema, 
  registerSchema, 
  dealSchema,
  messageSchema,
  escapeHtml,
  sanitizeFilename,
  isValidPath
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = validateData(loginSchema, {
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject invalid email', () => {
      const result = validateData(loginSchema, {
        email: 'invalid-email',
        password: 'password123'
      });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject short password', () => {
      const result = validateData(loginSchema, {
        email: 'test@example.com',
        password: '12345'
      });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const result = validateData(registerSchema, {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'AGENT'
      });
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = validateData(registerSchema, {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
        role: 'AGENT'
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = validateData(registerSchema, {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'INVALID'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('dealSchema', () => {
    it('should validate correct deal data', () => {
      const result = validateData(dealSchema, {
        title: 'Test Deal',
        seller_id: 'seller-001'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = validateData(dealSchema, {
        title: '',
        seller_id: 'seller-001'
      });
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding max length', () => {
      const result = validateData(dealSchema, {
        title: 'a'.repeat(201),
        seller_id: 'seller-001'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('messageSchema', () => {
    it('should validate correct message data', () => {
      const result = validateData(messageSchema, {
        deal_id: 'deal-001',
        content: 'Test message'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = validateData(messageSchema, {
        deal_id: 'deal-001',
        content: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding max length', () => {
      const result = validateData(messageSchema, {
        deal_id: 'deal-001',
        content: 'a'.repeat(5001)
      });
      expect(result.success).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = escapeHtml(input);
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's")).toBe('It&#039;s');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = 'file<name>:test.pdf';
      const output = sanitizeFilename(input);
      expect(output).toBe('file_name__test.pdf');
    });

    it('should handle normal filenames', () => {
      const input = 'document.pdf';
      const output = sanitizeFilename(input);
      expect(output).toBe('document.pdf');
    });
  });

  describe('isValidPath', () => {
    it('should accept valid paths', () => {
      expect(isValidPath('folder/file.txt')).toBe(true);
      expect(isValidPath('/absolute/path.txt')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(isValidPath('../../../etc/passwd')).toBe(false);
      expect(isValidPath('folder/..\\file.txt')).toBe(false);
    });
  });
});
