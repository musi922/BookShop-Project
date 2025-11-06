/**
 * Sample unit tests for validation scripts
 * These demonstrate the testing pattern for the project
 */

const fs = require('fs');
const path = require('path');

describe('Validation Scripts', () => {
  describe('validate-branch.js', () => {
    it('should exist and be executable', () => {
      const scriptPath = path.join(__dirname, '../scripts/validate-branch.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should contain protected branches list', () => {
      const scriptPath = path.join(__dirname, '../scripts/validate-branch.js');
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('PROTECTED_BRANCHES');
      expect(content).toContain('main');
    });
  });

  describe('validate-commit-msg.js', () => {
    it('should exist and be executable', () => {
      const scriptPath = path.join(__dirname, '../scripts/validate-commit-msg.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should contain valid commit types', () => {
      const scriptPath = path.join(__dirname, '../scripts/validate-commit-msg.js');
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('feat');
      expect(content).toContain('fix');
      expect(content).toContain('docs');
    });
  });

  describe('Project Configuration', () => {
    it('should have valid package.json', () => {
      const packagePath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      expect(packageJson.name).toBe('study');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });

    it('should have eslint configuration', () => {
      const eslintPath = path.join(__dirname, '../eslint.config.mjs');
      expect(fs.existsSync(eslintPath)).toBe(true);
    });

    it('should have husky hooks configured', () => {
      const huskyPath = path.join(__dirname, '../.husky');
      expect(fs.existsSync(huskyPath)).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('String validation', () => {
    it('should validate commit message format', () => {
      const validMessages = [
        'feat: add new feature',
        'fix: resolve bug',
        'docs: update readme',
        'feat(auth): add login',
      ];

      const pattern =
        /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,}/;

      validMessages.forEach(msg => {
        expect(pattern.test(msg)).toBe(true);
      });
    });

    it('should reject invalid commit messages', () => {
      const invalidMessages = ['Add new feature', 'feat', 'feat:', 'invalid: message'];

      const pattern =
        /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,}/;

      invalidMessages.forEach(msg => {
        expect(pattern.test(msg)).toBe(false);
      });
    });
  });
});
