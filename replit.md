# HRFlow - HR Management System

## Overview

HRFlow is a comprehensive HR management system built with a modern full-stack architecture. It provides essential HR functionalities including employee management, attendance tracking, payroll processing, leave request management, and holiday scheduling. The system supports both HR administrators and employees with role-based access control.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API design
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon database)
- **Session Storage**: PostgreSQL-based session storage with connect-pg-simple

### Database Schema
The system uses a relational database with the following main entities:
- **Users**: Employee and HR user management with role-based access
- **Attendance**: Check-in/check-out tracking with location and overtime support
- **Requests**: Leave, overtime, and attendance adjustment requests with approval workflow
- **Payroll**: Monthly payroll records with salary calculations
- **Holidays**: Company holiday calendar management

## Key Components

### Authentication & Authorization
- Simple username/password authentication
- Role-based access control (HR vs Employee)
- Client-side authentication state management
- Session persistence with localStorage

### Attendance Management
- Daily attendance tracking with check-in/check-out
- Geolocation-based attendance verification
- Overtime hours calculation
- Attendance status tracking (present, absent, late)

### Leave & Request Management
- Multiple request types (leave, overtime, attendance adjustment)
- Approval workflow with reviewer assignment
- Status tracking (pending, approved, rejected)
- Date range support for multi-day requests

### Payroll System
- Monthly payroll processing
- Base salary and overtime calculations
- Deduction management
- PDF payslip generation

### Mobile Support
- Responsive design for mobile devices
- Mobile-first employee portal
- Touch-friendly interface components

## Data Flow

### Client-Server Communication
1. Client makes API requests through a centralized `apiRequest` function
2. Server processes requests with Express middleware
3. Database operations handled through Drizzle ORM
4. Response data flows back through TanStack Query for caching

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates against database
3. User data stored in client-side state and localStorage
4. Subsequent requests include authentication context

### Data Persistence
- PostgreSQL database with structured schema
- Drizzle migrations for schema versioning
- Connection pooling through Neon serverless database

## External Dependencies

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

### Database & Backend
- **@neondatabase/serverless**: PostgreSQL database connection
- **Drizzle ORM**: Type-safe database toolkit
- **Express.js**: Web application framework
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type safety and developer experience
- **esbuild**: Fast JavaScript bundler for production

### PDF & Utilities
- **jsPDF**: Client-side PDF generation
- **date-fns**: Date manipulation utilities
- **zod**: Schema validation library

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend development
- tsx for running TypeScript server code
- Concurrent development with proxy setup

### Production Build
1. Frontend built with Vite to static assets
2. Backend bundled with esbuild for Node.js
3. Single deployment artifact containing both frontend and backend
4. Database migrations run via `drizzle-kit push`

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Separate development and production configurations
- Static file serving in production mode

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 02, 2025. Initial setup