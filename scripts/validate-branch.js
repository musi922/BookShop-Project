#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Prevents direct commits to protected branches (main, master)
 * Enforces branch-based workflow for all development
 */

const PROTECTED_BRANCHES = ['main', 'master'];

try {
  // Get current branch name
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
  }).trim();

  // Check if current branch is protected
  if (PROTECTED_BRANCHES.includes(currentBranch)) {
    console.error('\n🚫 Direct commits to protected branches are not allowed!\n');
    console.error(`You are currently on: ${currentBranch}\n`);
    console.error('To make changes:\n');
    console.error('  1. Create a feature branch:');
    console.error('     git checkout -b feat/your-feature-name\n');
    console.error('  2. Make your changes and commit');
    console.error('  3. Push and create a Pull Request\n');
    console.error('Protected branches:', PROTECTED_BRANCHES.join(', '));
    console.error('');

    process.exit(1);
  }

  console.log(`✅ Branch validation passed (${currentBranch})`);
  process.exit(0);
} catch (error) {
  console.error('Error checking branch:', error.message);
  process.exit(1);
}
