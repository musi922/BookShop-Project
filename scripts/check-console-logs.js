#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Checks for disallowed console statements in staged files
 * Allows console.error() and console.warn()
 */

const errors = [];
const files = process.argv.slice(2);

// ⛔ Block only debugging-related console methods
const blockedMethods = ['log', 'debug', 'info', 'trace', 'table', 'assert', 'dir', 'dirxml'];

function checkConsoleStatements(filePath) {
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
      for (const method of blockedMethods) {
        const pattern = new RegExp(`console\\.${method}\\s*\\(`);

        if (pattern.test(line)) {
          // Check if it's commented inline
          const commentIdx = line.indexOf('//');
          const consoleIdx = line.indexOf(`console.${method}`);

          if (commentIdx === -1 || consoleIdx < commentIdx) {
            fileErrors.push({
              file: filePath,
              line: index + 1,
              method,
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

// Main
if (files.length === 0) {
  console.log('✅ No files to check');
  process.exit(0);
}

console.log('🔍 Checking for console debugging statements...\n');

for (const file of files) {
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

  if (!['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(path.extname(file))) {
    continue;
  }

  const fileErrors = checkConsoleStatements(file);
  errors.push(...fileErrors);
}

// Show results
if (errors.length > 0) {
  console.error('❌ Disallowed console statements found:\n');

  for (const err of errors) {
    console.error(`  ${err.file}:${err.line}`);
    console.error(`    Remove console.${err.method}()`);
    console.error(`    ${err.code}\n`);
  }

  console.error(`\n💡 Allowed: console.error(), console.warn() only\n`);

  process.exit(1);
}

console.log('✅ No blocked console statements found!\n');
process.exit(0);
