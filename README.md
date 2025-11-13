# KaasBot - Discord Bot Interface

A clean, modern Discord bot interface with clear frontend/backend separation.

## Project Structure

```
kaasbot/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── contexts/      # React contexts
│   └── package.json
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── api/          # API routes and controllers
│   │   ├── bot/          # Discord bot logic
│   │   ├── database/     # Database setup and repositories
│   │   └── services/     # Business logic services
│   └── package.json
└── package.json       # Root workspace config
```

## Features

- Clean separation: Frontend and backend in separate folders
- Theme settings stored in database
- Discord bot integration
- Reusable components and services
- Local development ready

## Setup

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up PostgreSQL database:**
   - Make sure PostgreSQL is running locally
   - Default settings: host=localhost, port=5432, database=postgres, user=postgres, password=1

3. **Configure backend:**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env if you need to change database settings or add your Discord bot token
   ```

4. **Run development servers:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## Development

- **Frontend only:** `npm run dev:frontend`
- **Backend only:** `npm run dev:backend`
- **Both:** `npm run dev`

## Building

```bash
npm run build
```

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (pg)
- **Bot:** discord.js

