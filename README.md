# Langafy

A language learning platform with CEFR-aligned lessons, conversational AI practice, and mini-games. The MVP targets Spanish, but the architecture supports multiple target languages across web, mobile, and cloud deployment.

## Project Overview

Langafy helps users learn languages through:

- **Structured CEFR Lessons**: Content organized by the Common European Framework of Reference (A1–C2), ensuring learners progress systematically
- **Interactive Exercises**: Multiple-choice, fill-in-the-blank, word scramble, flashcard matching, and more
- **AI Conversation Practice**: Real-time conversation with AI-powered tutors adapted to your CEFR level
- **Vocabulary Bank**: Spaced repetition learning for vocabulary retention
- **Mini-Games**: Gamified exercises to make learning engaging (flashcard matching, word scramble)

The platform is planned available on **web** (Next.js), **mobile** (React Native/Expo), with a **REST API** (ASP.NET Core) backed by PostgreSQL.

## Prerequisites

To run Langafy locally, you'll need:

- **Node.js 22+** and npm 10+ — for web and mobile apps
- **.NET 8 SDK** — for the API
- **Docker** and **Docker Compose** — for local database and service orchestration
- **Expo CLI** (optional) — if developing the mobile app: `npm install -g expo-cli`

## Getting Started

### Option 1: With Docker (Recommended)

The easiest way to run all services locally:

```bash
npm run docker:up
```

This starts:

- **PostgreSQL** on `http://localhost:5432`
- **API** on `http://localhost:5000` (Swagger UI at `/swagger`)
- **Web App** on `http://localhost:3000`

To stop all services:

```bash
npm run docker:down
```

### Option 2: Without Docker (Manual Setup)

Run each service independently:

**Install dependencies:**

```bash
npm install
```

**Terminal 1 — Database:**
Set up PostgreSQL 16 manually (or use Docker for just the database):

```bash
docker run -d --name langafy-db \
  -e POSTGRES_USER=langafy \
  -e POSTGRES_PASSWORD=langafy_dev \
  -e POSTGRES_DB=langafy \
  -p 5432:5432 \
  postgres:16-alpine
```

**Terminal 2 — API:**

```bash
npm run dev:api
```

API runs on `http://localhost:5000`

**Terminal 3 — Web:**

```bash
npm run dev:web
```

Web app runs on `http://localhost:3000`

**Terminal 4 — Mobile (optional):**

```bash
npx expo start --web
```

Or on a physical device:

```bash
npx expo start
```

## Project Structure

```
langafy/
├── apps/
│   ├── web/              # Next.js 16 + React 19 web app
│   ├── mobile/           # Expo + React Native mobile app
│   └── api/
│       └── LangafyApi/   # ASP.NET Core 8 API
├── packages/
│   └── shared-types/     # Shared TypeScript types for API contracts
├── docker/
│   └── docker-compose.yml # Local development orchestration
└── README.md
```

## Environment Variables

Copy the example file to create a local `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (defaults work for local development):

```env
POSTGRES_USER=langafy
POSTGRES_PASSWORD=langafy_dev
POSTGRES_DB=langafy
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Scripts

**Root-level convenience scripts:**

- `npm run dev:web` — Start Next.js dev server
- `npm run dev:mobile` — Start Expo dev server
- `npm run dev:api` — Start .NET API
- `npm run docker:up` — Start all services with Docker Compose
- `npm run docker:down` — Stop all services
- `npm run lint` — Lint web and mobile apps
- `npm run format` — Format code across the monorepo

## Technology Stack

| Layer                | Technology                               |
| -------------------- | ---------------------------------------- |
| **Web**              | Next.js 16 + React 19 + Tailwind CSS 4   |
| **Mobile**           | Expo 54 + React Native 0.81 + Nativewind |
| **API**              | ASP.NET Core 8 / C#                      |
| **Database**         | PostgreSQL 16                            |
| **Auth**             | Firebase Authentication                  |
| **AI**               | Open Router                              |
| **Containerization** | Docker + docker-compose                  |

## Development Workflow

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/ijshd7/langafy
   cd langafy
   npm install
   ```

2. Start the development environment:

   ```bash
   npm run docker:up
   ```

   Or run services individually (see Getting Started).

3. Open the web app at `http://localhost:3000`

4. API Swagger documentation at `http://localhost:5000/swagger`

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
