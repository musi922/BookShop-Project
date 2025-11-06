#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that function names start with a capital letter
 * This enforces the naming convention for the project
 */

const errors = [];
const files = process.argv.slice(2);

// Patterns to match function declarations
const patterns = [
  // Regular function declarations: function myFunction()
  /function\s+([a-z][a-zA-Z0-9_]*)\s*\(/g,

  // Arrow functions assigned to const/let/var: const myFunc = () => {}
  /(?:const|let|var)\s+([a-z][a-zA-Z0-9_]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g,

  // Object method shorthand: myMethod() {}
  /^\s*([a-z][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/gm,

  // Class methods: myMethod() {}
  /(?:async\s+)?([a-z][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{/g,
];

const allowedPrefixes = [
  'on', // Event handlers: onClick, onInit
  'handle', // Event handlers: handleSubmit
  '_', // Private functions
  'get',
  'set', // Getters/setters (can be lowercase)
  'is',
  'has',
  'should',
  'can', // Boolean functions
];

function ShouldCheckFunction(functionName, fileContent, match) {
  // Skip if it's a lifecycle method or standard callback
  const lifecycleMethods = [
    'constructor',
    'render',
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'shouldComponentUpdate',
    'getDerivedStateFromProps',
    'getSnapshotBeforeUpdate',
    'componentDidCatch',
    'toString',
    'valueOf',
    'init',
    'exit',
    'destroy',
    'onInit',
    'onExit',
    'onBeforeRendering',
    'onAfterRendering',
    'test',
    'describe',
    'it',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
  ];

  if (lifecycleMethods.includes(functionName)) {
    return false;
  }

  // Check if function is in an export statement (likely a named export)
  const exportPattern = new RegExp(`export\\s+(?:const|let|var|function)\\s+${functionName}\\b`);
  if (exportPattern.test(fileContent)) {
    return true;
  }

  // Check allowed prefixes
  for (const prefix of allowedPrefixes) {
    if (functionName.startsWith(prefix)) {
      return false;
    }
  }

  return true;
}

function ValidateFunctionNames(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileErrors = [];

    // Get all lines for error reporting
    const lines = content.split('\n');

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];

        // Skip if starts with capital letter
        if (/^[A-Z]/.test(functionName)) {
          continue;
        }

        // Check if we should validate this function
        if (!ShouldCheckFunction(functionName, content, match)) {
          continue;
        }

        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const lineContent = lines[lineNumber - 1].trim();

        fileErrors.push({
          file: filePath,
          line: lineNumber,
          function: functionName,
          code: lineContent,
        });
      }
    }

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

console.log('🔍 Checking function naming conventions...\n');

for (const file of files) {
  // Skip node_modules, generated files, and scripts directory itself
  if (file.includes('node_modules') || file.includes('gen/') || file.includes('scripts/')) {
    continue;
  }

  // Only check JS/TS files
  const ext = path.extname(file);
  if (!['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) {
    continue;
  }

  const fileErrors = ValidateFunctionNames(file);
  errors.push(...fileErrors);
}

// Report results
if (errors.length > 0) {
  console.error('❌ Function naming convention violations found:\n');

  for (const error of errors) {
    console.error(`  ${error.file}:${error.line}`);
    console.error(`    Function "${error.function}" must start with a capital letter`);
    console.error(`    ${error.code}\n`);
  }

  console.error(
    `\n💡 Tip: Function names must start with a capital letter (e.g., MyFunction, HandleClick)`
  );
  console.error(
    `   Exceptions: Event handlers (onClick, handleSubmit), private functions (_private), getters/setters\n`
  );

  process.exit(1);
}

console.log('✅ All function names follow the naming convention!\n');
process.exit(0);
