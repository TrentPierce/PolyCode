/**
 * Sandbox Module Tests
 *
 * Tests for code execution sandbox functionality
 */

const {
  executeInSandbox,
  validateCodeForExecution,
  cleanup
} = require('../src/main/core/sandbox');

const path = require('path');

describe('Sandbox', () => {
  describe('validateCodeForExecution', () => {
    test('should detect dangerous eval usage', () => {
      const code = 'const x = eval("1 + 1");';
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('eval'))).toBe(true);
    });

    test('should detect Function constructor', () => {
      const code = 'const fn = new Function("return 1");';
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('Function()'))).toBe(true);
    });

    test('should detect child_process usage', () => {
      const code = 'const cp = require("child_process");';
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('child_process'))).toBe(true);
    });

    test('should detect fs module usage', () => {
      const code = 'const fs = require("fs");';
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('fs module'))).toBe(true);
    });

    test('should allow safe code', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        console.log(add(1, 2));
      `;
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });

    test('should detect http module usage', () => {
      const code = 'const http = require("http");';
      const result = validateCodeForExecution(code, 'javascript');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('http module'))).toBe(true);
    });
  });

  describe('executeInSandbox', () => {
    test('should execute valid JavaScript code', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        console.log(add(1, 2));
      `;

      const result = await executeInSandbox(code, 'javascript', {
        timeout: 5000,
        maxMemory: 128,
        allowNetwork: false,
        allowFS: true
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('3');
      expect(result.exitCode).toBe(0);
    }, 10000);

    test('should timeout after specified duration', async () => {
      const code = `
        while (true) {
          // Infinite loop
        }
      `;

      const result = await executeInSandbox(code, 'javascript', {
        timeout: 2000,
        maxMemory: 128,
        allowNetwork: false,
        allowFS: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(result.duration).toBeLessThan(3000);
    }, 5000);

    test('should reject oversized code', async () => {
      const code = 'a'.repeat(2000000); // 2MB
      const result = await executeInSandbox(code, 'javascript', {
        timeout: 5000,
        maxMemory: 128,
        allowNetwork: false,
        allowFS: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    }, 5000);

    test('should handle syntax errors', async () => {
      const code = 'function test( {'; // Syntax error

      const result = await executeInSandbox(code, 'javascript', {
        timeout: 5000,
        maxMemory: 128,
        allowNetwork: false,
        allowFS: true
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    }, 5000);

    test('should validate non-string code', async () => {
      const result = await executeInSandbox(null, 'javascript', {
        timeout: 5000,
        maxMemory: 128,
        allowNetwork: false,
        allowFS: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });
});
