#!/usr/bin/env node
// scripts/bump.js — Semver version bump for the Langafy monorepo
//
// Usage:
//   node scripts/bump.js patch   # 0.1.0 → 0.1.1
//   node scripts/bump.js minor   # 0.1.0 → 0.2.0
//   node scripts/bump.js major   # 0.1.0 → 1.0.0
//
// Updates all package.json files (lockstep versioning) and the .csproj <Version>.

'use strict';

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

/** All JS/TS package.json files that carry a version. */
const PACKAGE_JSON_PATHS = [
  'package.json',
  'apps/web/package.json',
  'apps/mobile/package.json',
  'packages/shared-types/package.json',
  'packages/shared-game-logic/package.json',
];

/** .NET project file — version is stored as a <Version> XML element. */
const CSPROJ_PATH = 'apps/api/LangafyApi/LangafyApi.csproj';

// ── Helpers ───────────────────────────────────────────────────────────────────

function bumpVersion(version, type) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Cannot parse version "${version}" — expected "MAJOR.MINOR.PATCH".`);
  }
  const [major, minor, patch] = parts;
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type "${type}". Expected: patch | minor | major`);
  }
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function writeJson(absPath, data) {
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function updateCsproj(absPath, newVersion) {
  let content = fs.readFileSync(absPath, 'utf8');
  if (/<Version>[^<]*<\/Version>/.test(content)) {
    // Replace existing <Version> element
    content = content.replace(/<Version>[^<]*<\/Version>/, `<Version>${newVersion}</Version>`);
  } else {
    // Insert <Version> after the first <TargetFramework> element
    content = content.replace(
      /(<TargetFramework>[^<]+<\/TargetFramework>)/,
      `$1\n    <Version>${newVersion}</Version>`,
    );
  }
  fs.writeFileSync(absPath, content, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const bumpType = process.argv[2];

if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/bump.js <patch|minor|major>');
  process.exit(1);
}

// Read current version from root package.json (single source of truth)
const rootPkgPath = path.join(ROOT, 'package.json');
const rootPkg = readJson(rootPkgPath);
const currentVersion = rootPkg.version;

if (!currentVersion) {
  console.error('No "version" field found in root package.json.');
  process.exit(1);
}

const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`\nBumping ${bumpType}: ${currentVersion} → ${newVersion}\n`);

// Update all package.json files (lockstep — all get the same new version)
for (const relPath of PACKAGE_JSON_PATHS) {
  const absPath = path.join(ROOT, relPath);
  const pkg = readJson(absPath);
  const oldVersion = pkg.version ?? '(none)';
  pkg.version = newVersion;
  writeJson(absPath, pkg);
  console.log(`  ✓  ${relPath.padEnd(45)}  ${oldVersion} → ${newVersion}`);
}

// Update the .csproj <Version> element
const csprojAbsPath = path.join(ROOT, CSPROJ_PATH);
updateCsproj(csprojAbsPath, newVersion);
console.log(`  ✓  ${CSPROJ_PATH.padEnd(45)}  ${currentVersion} → ${newVersion}`);

console.log(`\nDone. Version is now ${newVersion}.\n`);
console.log('Suggested next steps:');
console.log(`  git add package.json apps/web/package.json apps/mobile/package.json \\`);
console.log(
  `        packages/shared-types/package.json packages/shared-game-logic/package.json \\`,
);
console.log(`        ${CSPROJ_PATH}`);
console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}\n`);
