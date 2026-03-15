#!/usr/bin/env node

/**
 * Database seeding utility script
 *
 * Usage:
 *   node scripts/seed.js              # Start API (auto-seeds if DB is empty)
 *   node scripts/seed.js --reset      # Drop DB and reseed
 *   node scripts/seed.js --help       # Show this help message
 */

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const apiPath = path.join(projectRoot, 'apps/api/LangafyApi');

const args = process.argv.slice(2);
const command = args[0];

const log = (msg, color = 'reset') => {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
  };
  console.log(`${colors[color]}${msg}${colors.reset}`);
};

const runCommand = (cmd, cwd = apiPath) => {
  try {
    log(`\n→ Running: ${cmd}`, 'blue');
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
  } catch (error) {
    log(`\n✗ Command failed: ${cmd}`, 'red');
    process.exit(1);
  }
};

const help = () => {
  log(
    `
Database Seeding Utility
========================

Usage:
  npm run seed              Start API and auto-seed database (if empty)
  npm run seed:reset       Drop database and reseed from scratch
  npm run seed:help        Show this help message

Commands:
  seed                     Starts the API in development mode.
                          The database will be seeded automatically
                          on first run if it's empty.

  seed:reset              Completely resets the database and reseeds
                          from the seed data files located in:
                          apps/api/LangafyApi/Data/SeedData/

Seed Data Files:
  - languages.json          Lists all available languages
  - cefr-levels.json       CEFR proficiency levels (A1-C2)
  - [language]/units.json      Units for each language
  - [language]/lessons.json    Lessons for each unit
  - [language]/exercises.json  Exercises for each lesson
  - [language]/vocabulary.json Vocabulary words by level

Example Workflow:
  1. npm run seed           # Start API, auto-seeds on first run
  2. Make changes to seed data files
  3. npm run seed:reset     # Drop DB and reload seed data
  4. npm run seed           # Restart API

Note: The seed command requires:
  - .NET 8 or higher
  - Entity Framework Core tools installed
  - A running PostgreSQL database (check docker-compose setup)
`,
    'green'
  );
};

if (command === '--help' || command === '-h') {
  help();
  process.exit(0);
}

if (command === '--reset') {
  log('🔄 Resetting database...', 'yellow');

  log('\nStep 1: Dropping database...', 'blue');
  runCommand('dotnet ef database drop --force');

  log('\nStep 2: Starting API (will reseed automatically)...', 'blue');
  runCommand('dotnet run');

  process.exit(0);
}

// Default: just start the API (which auto-seeds if DB is empty)
log('🌱 Starting API with auto-seeding...', 'green');
log('ℹ️  Database will seed automatically if empty', 'blue');
log('ℹ️  Seed data location: apps/api/LangafyApi/Data/SeedData/', 'blue');
runCommand('dotnet run');
