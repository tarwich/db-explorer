# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
DB Explorer is an Electron-based desktop application for exploring unknown databases. It features a Next.js frontend with TypeScript, providing an intuitive interface for database navigation and data manipulation.

## Development Commands

### Core Development
- `npm run electron-dev` - Start full Electron app with hot reload (primary development command)
- `npm run dev` - Next.js dev server only (port 3005)
- `npm run build` - Build Next.js for production
- `npm run lint` - ESLint validation
- `npm run seed` - Populate test database with sample data

### Testing
- `npm run test` - Run Vitest tests
- `npm run test:ui` - Vitest UI interface
- `npm run coverage` - Generate test coverage reports

### Database Setup
Start PostgreSQL container: `docker compose up -d postgres`
Check container port: `docker compose ps`
Connection string format: `postgres://postgres:postgres@localhost:[PORT]/postgres`

## Architecture Overview

### Plugin-Based Database Layer
- **Plugin Interface**: `src/db/plugins/plugin.ts` defines `IDatabasePlugin` contract
- **Database Plugins**: `plugin.postgres.ts`, `plugin.sqlite.ts` implement specific database support
- **Plugin Registry**: `src/db/plugins/index.ts` manages available plugins

### Core Components Structure
- **Data Browser**: `src/components/data-browser/` - Main database browsing interface with grid/list views
- **Explorer**: `src/components/explorer/` - Tree navigation for database schema with context system
- **Connection Management**: `src/components/connection-modal/` - Database connection configuration
- **Field Components**: `src/components/fields/` - Type-specific input components for different data types
- **Record Editing**: `record-editor-modal.tsx`, `record-editor-sidebar.tsx` - Data manipulation interfaces

### State Management
- **TanStack Query**: Server state with global error handling in `providers.tsx`
- **Zustand**: Client state management
- **React Hook Form**: Form validation and management
- **Context System**: Explorer context in `src/context/` for component communication

### Key Utilities
- **Column Intelligence**: `src/utils/column-utils.ts` - Column type detection and normalization
- **Foreign Key Detection**: `src/utils/foreign-key-guesser.ts` - Automatic relationship discovery
- **Icon System**: `src/utils/best-icon.ts` with `icon-database.json` for visual representation
- **Name Normalization**: `src/utils/normalize-name.ts` - Intelligent name processing

### Database Integration
- **Query Builder**: Uses Kysely for type-safe SQL generation
- **Connection State**: Persisted locally with `src/db/state-db.ts`
- **Schema Introspection**: Plugin-based schema discovery and metadata extraction

### Testing Setup
- **Vitest**: Test runner with jsdom environment
- **React Testing Library**: Component testing utilities
- **Path Aliases**: `@/` resolves to `src/`
- **Test Files**: Located in `src/**/*.{test,spec}.{ts,tsx}`

## Key Design Patterns
- Component composition with shadcn/ui components
- Plugin architecture for database drivers
- Context-based state sharing for complex component trees
- Type-safe database operations with schema introspection
- Intelligent column/table analysis using natural language processing