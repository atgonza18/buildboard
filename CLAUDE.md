# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildBoard is a construction project dashboard application for tracking daily forecasts vs actuals with leaderboard rankings. Built with Convex (backend) + React 19 + Vite (frontend) + Tailwind CSS v4 + shadcn/ui + Recharts.

## Development Commands

**Important: All commands must be run from the `buildboard/` directory.**

```bash
cd buildboard

# Start development (runs frontend and backend concurrently)
npm run dev

# Run frontend only
npm run dev:frontend

# Run backend only (pushes schema and functions to Convex)
npm run dev:backend

# Build for production
npm run build

# Lint (TypeScript check + ESLint)
npm run lint
```

First-time setup runs automatically via the `predev` script, which initializes the Convex backend and opens the dashboard.

## Architecture

### Directory Structure
- `buildboard/src/` - React frontend
- `buildboard/convex/` - Convex backend (serverless functions + schema)

### Backend (Convex) - `convex/`
- `schema.ts` - Database schema with tables: userProfiles, projectAssignments, projects, scopes, activities, dailyEntries
- `projects.ts` - Project CRUD with role-based access
- `scopes.ts` - Scope CRUD (Mechanical, Electrical, Civil)
- `activities.ts` - Activity CRUD within scopes
- `dailyEntries.ts` - Daily forecast/actuals entry mutations
- `dashboard.ts` - KPI aggregation queries
- `leaderboard.ts` - Production ranking queries
- `userProfiles.ts` - User profile management
- `seed.ts` - Demo data seeding
- `auth.ts` / `auth.config.ts` - Convex Auth with Password provider

### Frontend (React) - `src/`
- `main.tsx` - Entry point with BrowserRouter + ConvexAuthProvider
- `App.tsx` - Main app with routing and auth state
- `components/ui/` - shadcn/ui components
- `components/layout/` - Sidebar, Header, MainLayout
- `components/dashboard/` - KPICard, ScopeCard
- `components/charts/` - ForecastVsActualsChart, TrendChart, LeaderboardChart (Recharts)
- `components/forms/` - DailyEntryForm, ProjectForm, ScopeForm, ActivityForm
- `pages/` - DashboardPage, ProjectsPage, LeaderboardPage, EntryPage, ScopePage, SettingsPage

### User Roles
1. **Control Center** - Full access: create projects, manage all data, assign users
2. **Construction Manager** - Access assigned projects only: create scopes/activities, enter daily data

### Key Patterns
- Convex queries: `useQuery(api.module.functionName, args)`
- Convex mutations: `useMutation(api.module.functionName)`
- Auth: `useConvexAuth()`, `getAuthUserId(ctx)` in backend
- Path alias: `@/*` maps to `./src/*`
- Role checking: Query `userProfiles` table, check `projectAssignments` for CMs

### Data Flow
1. Daily workflow: Forecast (morning) → Actuals (end of day)
2. KPIs: Aggregated from `dailyEntries` by project/scope/activity
3. Leaderboard: Ranked by total actual quantity (production)
