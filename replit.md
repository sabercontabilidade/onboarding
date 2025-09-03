# Overview

This is a client onboarding management system called "SABER" built with a modern full-stack architecture. The application helps accounting firms manage their client onboarding process, track appointments, monitor pipeline stages, and maintain client relationships. It features a comprehensive dashboard with metrics, client management capabilities, appointment scheduling, and activity tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with CSS custom properties for theming (supports light/dark modes)
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging
- **Development**: Hot module replacement via Vite integration in development mode

## Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Configured for PostgreSQL (Neon Database support)
- **Schema**: Strongly typed schema definitions with Zod integration
- **Migrations**: Drizzle Kit for database migrations and schema management

## Data Models
The system manages several core entities:
- **Users**: Authentication and role-based access (contador role)
- **Clients**: Company information, contact details, and status tracking
- **Onboarding Stages**: Multi-step onboarding process (initial_meeting, documentation, review, completed)
- **Appointments**: Scheduled meetings, visits, and calls with clients
- **Activities**: Audit trail of user actions and system events
- **Integrations**: External service configurations

## Authentication & Storage
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple
- **Storage Pattern**: Interface-driven storage abstraction with in-memory implementation for development
- **Data Access**: Repository pattern with comprehensive CRUD operations and business logic methods

## Project Structure
- **Monorepo**: Shared TypeScript types and schemas between client and server
- **Client**: React application in `/client` directory
- **Server**: Express API in `/server` directory  
- **Shared**: Common schemas and types in `/shared` directory
- **Component Organization**: Feature-based component structure with reusable UI components

## Development Workflow
- **Build Process**: Vite for frontend, esbuild for backend production builds
- **Type Safety**: Strict TypeScript configuration with path mapping
- **Code Quality**: Comprehensive error boundaries and logging middleware

# External Dependencies

## Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm** & **drizzle-kit**: Type-safe database ORM and migrations
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **wouter**: Lightweight React routing

## UI & Styling
- **@radix-ui/***: Accessible UI primitives (40+ components)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

## Form & Validation
- **react-hook-form**: Performant form management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation and schema generation

## Development Tools
- **tsx**: TypeScript execution for development
- **vite**: Frontend build tool and development server
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

## Database & Session Management
- **connect-pg-simple**: PostgreSQL session store for Express
- **pg**: PostgreSQL client library (via Neon serverless)

## Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx** & **tailwind-merge**: Conditional CSS class management
- **nanoid**: Unique ID generation