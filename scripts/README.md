# Database Seeding Scripts

This directory contains utility scripts for managing database seeding in the Langafy API.

## Quick Start

```bash
# Start the API (database seeds automatically on first run)
npm run seed

# Reset and reseed the database from scratch
npm run seed:reset

# View detailed help
npm run seed:help
```

## How Seeding Works

The Langafy API uses automatic database seeding during startup. When the API starts:

1. It checks if the database already has data (by checking if `Languages` table has records)
2. If the database is empty, it automatically loads and inserts seed data from JSON files
3. If the database already has data, seeding is skipped (prevents duplicate data)

### Seed Data Location

All seed data files are located in:

```
apps/api/LangafyApi/Data/SeedData/
```

#### File Structure

```
SeedData/
├── languages.json           # Available languages (e.g., Spanish, French)
├── cefr-levels.json        # CEFR proficiency levels (A1-C2)
└── [language-code]/        # Language-specific content
    ├── units.json          # Learning units for the language
    ├── lessons.json        # Lessons within each unit
    ├── exercises.json      # Exercises within each lesson
    └── vocabulary.json     # Vocabulary words by proficiency level
```

#### Example: Spanish Data

```
SeedData/
└── es/
    ├── units.json          # Units for Spanish (e.g., "Greetings", "Food")
    ├── lessons.json        # Lessons (e.g., "Basic Greetings A1")
    ├── exercises.json      # Exercises (Multiple Choice, Matching, etc.)
    └── vocabulary.json     # Spanish vocabulary with English translations
```

## Scripts

### `npm run seed`

Starts the API in development mode. The database will be seeded automatically if it's empty.

**When to use**: First time setup, or restarting the API after stopping it.

**Requirements**:

- PostgreSQL database running (use `npm run docker:up`)
- .NET 8 SDK installed
- Entity Framework Core tools

### `npm run seed:reset`

Completely resets the database and reseeds from scratch. This will:

1. Drop all database tables
2. Recreate the schema
3. Load all seed data from JSON files
4. Start the API

**When to use**:

- After adding/modifying seed data files
- When testing new seed data content
- To clean up corrupted data

**Warning**: This deletes all data in the database, including user-created data. Only use in development!

### `npm run seed:help`

Displays this help documentation in the terminal.

## Modifying Seed Data

To add or update seed data:

1. **Edit the JSON files** in `apps/api/LangafyApi/Data/SeedData/[language]/`
2. **Run `npm run seed:reset`** to reload the database with new data
3. **Verify changes** by checking the API endpoints

### Example: Adding a New Spanish Unit

Edit `apps/api/LangafyApi/Data/SeedData/es/units.json`:

```json
[
  {
    "code": "ESP_U001",
    "cefrLevel": "A1",
    "title": "Greetings & Introductions",
    "description": "Learn basic greetings and how to introduce yourself",
    "sortOrder": 1
  },
  {
    "code": "ESP_U002",
    "cefrLevel": "A1",
    "title": "Daily Routines",
    "description": "Vocabulary and verbs for daily activities",
    "sortOrder": 2
  }
]
```

Then reseed:

```bash
npm run seed:reset
```

## Adding a New Language

To add a completely new language (e.g., French):

1. **Create a language directory**:

   ```bash
   mkdir apps/api/LangafyApi/Data/SeedData/fr
   ```

2. **Create seed data files** in that directory:
   - `units.json`
   - `lessons.json`
   - `exercises.json`
   - `vocabulary.json`

3. **Update `languages.json`** to include the new language:

   ```json
   [
     {
       "code": "es",
       "name": "Spanish",
       "nativeName": "Español",
       "isActive": true
     },
     {
       "code": "fr",
       "name": "French",
       "nativeName": "Français",
       "isActive": true
     }
   ]
   ```

4. **Reseed the database**:
   ```bash
   npm run seed:reset
   ```

## Troubleshooting

### "Database drop failed"

- Ensure the PostgreSQL database is running: `npm run docker:up`
- Check that no other connections are using the database

### "Seed data file not found"

- Verify the JSON files exist in `apps/api/LangafyApi/Data/SeedData/`
- Check the language code directory matches the language code in `languages.json`

### "CEFR level not found"

- Ensure `cefr-levels.json` contains the level codes used in your seed files (A1, A2, B1, B2, C1, C2)
- Verify the `cefrLevel` fields in units.json match exactly

## See Also

- [API Documentation](../apps/api/README.md)
- [Database Schema](../apps/api/LangafyApi/Data/AppDbContext.cs)
- [CEFR Framework](https://www.coe.int/en/web/common-european-framework-reference-levels)
