# Drawity - Development Guidelines

## Project Description
Drawity is a collaborative drawing web application where friends take turns drawing on a shared canvas. Players alternate adding to the drawing, with each seeing the other's contributions in real-time. Features include turn-based drawing, real-time canvas synchronization, unique game URLs for sharing, and persistent game states.

## Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production (runs prisma generate first)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Update database schema

## Code Style
- **Frontend**: React with Next.js, TypeScript, TailwindCSS
- **Backend**: Next.js API routes, Prisma ORM with PostgreSQL
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Imports**: Group imports - React/Next, then external libs, then internal
- **Components**: Function components with TypeScript interfaces for props
- **Error Handling**: Try/catch for async operations, specific error messages
- **TypeScript**: Use strict mode, explicit return types for functions
- **State Management**: React hooks for local state
- **API Routes**: Centralized error handling with NextResponse.json

## Project Structure
- `/app` - Pages and API routes (Next.js App Router)
- `/lib` - Shared utilities and database connections
- `/prisma` - Database schema and migrations