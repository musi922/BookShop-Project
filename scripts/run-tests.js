#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Runs tests related to staged files before commit
 * Only runs tests for changed files to optimize speed
 */

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .filter(Boolean)
      .filter(file => file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'));
  } catch {
    return [];
  }
}

function getTestFiles(stagedFiles) {
  const testFiles = new Set();

  stagedFiles.forEach(file => {
    // If the file itself is a test
    if (file.includes('.test.') || file.includes('.spec.') || file.startsWith('test/')) {
      testFiles.add(file);
    } else {
      // Look for corresponding test file
      const possibleTests = [
        file.replace(/\.js$/, '.test.js'),
        file.replace(/\.js$/, '.spec.js'),
        file.replace(/^srv\//, 'test/').replace(/\.js$/, '.test.js'),
        file.replace(/^app\//, 'test/').replace(/\.js$/, '.test.js'),
      ];

      possibleTests.forEach(testFile => {
        try {
          const fs = require('fs');
          if (fs.existsSync(testFile)) {
            testFiles.add(testFile);
          }
        } catch {
          // File doesn't exist, skip
        }
      });
    }
  });

  return Array.from(testFiles);
}

function runTests(testFiles) {
  console.log('🧪 Running tests for staged changes...\n');

  try {
    let command;

    if (testFiles.length > 0) {
      // Run specific test files
      console.log(`Found ${testFiles.length} test file(s) to run:\n`);
      testFiles.forEach(file => console.log(`  - ${file}`));
      console.log('');

      command = `npx jest ${testFiles.join(' ')} --passWithNoTests`;
    } else {
      // No specific tests found, run all tests
      console.log('No specific test files found for staged changes.');
      console.log('Running all tests...\n');
      command = 'npm test';
    }

    execSync(command, {
      stdio: 'inherit',
      encoding: 'utf-8',
    });

    console.log('\n✅ All tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Tests failed!\n');
    console.error('Please fix the failing tests before committing.\n');
    console.error('Tips:');
    console.error('  - Run "npm test" to see detailed test output');
    console.error('  - Fix the failing tests');
    console.error('  - Stage your changes again: git add .');
    console.error('  - Retry commit\n');
    console.error('To skip tests (not recommended): git commit --no-verify\n');
    return false;
  }
}

function main() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('ℹ️  No JavaScript files staged, skipping tests\n');
    process.exit(0);
  }

  console.log(`📝 Staged files: ${stagedFiles.length}\n`);

  const testFiles = getTestFiles(stagedFiles);
  const success = runTests(testFiles);

  process.exit(success ? 0 : 1);
}

main();
