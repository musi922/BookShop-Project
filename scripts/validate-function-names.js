#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validate that exported function names start with a capital letter.
 * UI5 controller lifecycle + event handler functions are allowed to start lowercase.
 */

const errors = [];
const files = process.argv.slice(2);

// ✅ Only detect EXPORTED functions
const patterns = [
  // Exported regular function
  /export\s+function\s+([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g,

  // Exported arrow function
  /export\s+(?:const|let|var)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g,
];

// ✅ UI5 + common allowed lowercase patterns
const allowedLowercasePrefixes = [
  'on', // UI5 event handler: onSave, onInit
  'handle', // handlePress, handleSubmit
  '_', // private functions
  'get',
  'set',
  'is',
  'has',
  'can', // Boolean helpers
  'should',
];

// ✅ Common JS keywords and UI5 lifecycle allowed lowercase
const allowedExactMatches = new Set(['constructor', 'catch', 'render', 'valueOf', 'toString']);

function ShouldCheckFunction(name) {
  if (allowedExactMatches.has(name)) return false;
  if (/^[A-Z]/.test(name)) return true; // ✅ Already valid

  for (const prefix of allowedLowercasePrefixes) {
    if (name.startsWith(prefix)) return false;
  }
  return true;
}

function ValidateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileErrors = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];

        if (!ShouldCheckFunction(functionName)) continue;

        const before = content.substring(0, match.index);
        const lineNumber = before.split('\n').length;
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

// ✅ MAIN EXECUTION
if (files.length === 0) {
  console.log('✅ No files to check');
  process.exit(0);
}

console.log('🔍 Checking exported function naming conventions...\n');

for (const file of files) {
  if (file.includes('node_modules') || file.includes('gen/') || file.includes('scripts/')) {
    continue;
  }

  const ext = path.extname(file);
  if (!['.js', '.mjs', '.cjs', '.ts', '.tsx'].includes(ext)) continue;

  const fileErrors = ValidateFile(file);
  errors.push(...fileErrors);
}

if (errors.length > 0) {
  console.error('❌ Naming violations detected:\n');

  errors.forEach(error => {
    console.error(`  ${error.file}:${error.line}`);
    console.error(`    Exported function "${error.function}" must start with a capital letter`);
    console.error(`    ${error.code}\n`);
  });

  console.error(`\n💡 Exported functions must start uppercase (e.g. "LoadData", "SaveAction")`);
  console.error(
    `✅ Allowed lowercase: onSave, onInit, _private, handleClick, getValue, setData, isValid`
  );

  process.exit(1);
}

console.log('✅ All exported function names follow expected conventions!\n');
process.exit(0);
