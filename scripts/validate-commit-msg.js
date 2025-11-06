#!/usr/bin/env node

const fs = require('fs');

// Read the commit message from the file Git provides
const commitMsgFile = process.argv[2];
const commitMsg = fs.readFileSync(commitMsgFile, 'utf-8').trim();

// Valid commit types
const validTypes = [
  'feat', // New feature
  'fix', // Bug fix
  'docs', // Documentation changes
  'style', // Code style changes (formatting, etc.)
  'refactor', // Code refactoring
  'perf', // Performance improvements
  'test', // Adding or updating tests
  'chore', // Maintenance tasks
  'ci', // CI/CD changes
  'build', // Build system changes
  'revert', // Revert a previous commit
];

// Conventional Commits pattern
// Format: type(scope): subject
// OR: type: subject
const conventionalCommitPattern =
  /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .{1,}/;

// Check if commit message matches pattern
if (!conventionalCommitPattern.test(commitMsg)) {
  console.error('\n❌ Invalid commit message format!\n');
  console.error('Commit message must follow Conventional Commits format:\n');
  console.error('  <type>(<optional-scope>): <subject>\n');
  console.error('Valid types:');
  validTypes.forEach(type => {
    const descriptions = {
      feat: 'A new feature',
      fix: 'A bug fix',
      docs: 'Documentation only changes',
      style: 'Code style changes (formatting, missing semi-colons, etc)',
      refactor: 'Code change that neither fixes a bug nor adds a feature',
      perf: 'Performance improvements',
      test: 'Adding missing tests or correcting existing tests',
      chore: 'Changes to build process or auxiliary tools',
      ci: 'Changes to CI configuration files and scripts',
      build: 'Changes that affect the build system or dependencies',
      revert: 'Reverts a previous commit',
    };
    console.error(`  - ${type.padEnd(10)} ${descriptions[type]}`);
  });
  console.error('\nExamples:');
  console.error('  ✅ feat: add user authentication');
  console.error('  ✅ feat(auth): add login page');
  console.error('  ✅ fix: resolve navigation bug');
  console.error('  ✅ fix(api): handle null response');
  console.error('  ✅ docs: update README');
  console.error('  ✅ chore: update dependencies');
  console.error('\nYour commit message:');
  console.error(`  ❌ "${commitMsg}"\n`);

  process.exit(1);
}

// Additional validation: subject should not be empty
const match = commitMsg.match(conventionalCommitPattern);
if (match) {
  const subject = commitMsg.split(':')[1]?.trim();

  if (!subject || subject.length < 3) {
    console.error('\n❌ Commit subject is too short!\n');
    console.error('Subject should be at least 3 characters long.\n');
    console.error(`Your commit message: "${commitMsg}"\n`);
    process.exit(1);
  }

  // Subject should not end with a period
  if (subject.endsWith('.')) {
    console.error('\n❌ Commit subject should not end with a period!\n');
    console.error(`Your commit message: "${commitMsg}"\n`);
    process.exit(1);
  }

  // Subject should start with lowercase
  if (subject[0] !== subject[0].toLowerCase()) {
    console.error('\n❌ Commit subject should start with a lowercase letter!\n');
    console.error('Correct: "feat: add new feature"');
    console.error(`Wrong:   "feat: Add new feature"\n`);
    console.error(`Your commit message: "${commitMsg}"\n`);
    process.exit(1);
  }
}

console.log('✅ Commit message format is valid!\n');
process.exit(0);
