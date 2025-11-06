#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Checks for console.log statements in staged files
 * Prevents debugging code from being committed
 */

const errors = [];
const files = process.argv.slice(2);

// Console methods to check for
const consoleMethods = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'trace',
  'dir',
  'dirxml',
  'table',
  'assert',
];

function CheckConsoleStatements(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileErrors = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip comments
      if (
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.startsWith('/*')
      ) {
        return;
      }

      // Check for console statements
      for (const method of consoleMethods) {
        const pattern = new RegExp(`console\\.${method}\\s*\\(`, 'g');

        if (pattern.test(line)) {
          // Check if it's in a comment (inline)
          const commentIndex = line.indexOf('//');
          const consoleIndex = line.indexOf(`console.${method}`);

          if (commentIndex === -1 || consoleIndex < commentIndex) {
            fileErrors.push({
              file: filePath,
              line: index + 1,
              method: method,
              code: trimmedLine,
            });
          }
        }
      }
    });

    return fileErrors;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

// Main execution
if (files.length === 0) {
  console.log('✅ No files to check');
  process.exit(0);
}

console.log('🔍 Checking for console statements...\n');

for (const file of files) {
  // Skip node_modules, test files, and scripts directory
  if (
    file.includes('node_modules') ||
    file.includes('gen/') ||
    file.includes('.test.') ||
    file.includes('.spec.') ||
    file.includes('__tests__') ||
    file.includes('scripts/')
  ) {
    continue;
  }

  // Only check JS/TS files
  const ext = path.extname(file);
  if (!['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) {
    continue;
  }

  const fileErrors = CheckConsoleStatements(file);
  errors.push(...fileErrors);
}

// Report results
if (errors.length > 0) {
  console.error('❌ Console statements found in staged files:\n');

  for (const error of errors) {
    console.error(`  ${error.file}:${error.line}`);
    console.error(`    Remove console.${error.method}()`);
    console.error(`    ${error.code}\n`);
  }

  console.error(`\n💡 Tip: Use a proper logging library instead of console statements`);
  console.error(`   For debugging, use conditional logging or remove before committing\n`);

  process.exit(1);
}

console.log('✅ No console statements found!\n');
process.exit(0);
