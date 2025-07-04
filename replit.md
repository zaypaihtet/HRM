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

### Attendance Reporting System
- Date range filtering for attendance reports
- Employee-specific and comprehensive reporting
- CSV export functionality
- Real working hours calculations

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

## Security Improvements (July 02, 2025)

### Critical Security Fixes Implemented
- **Password Security**: Implemented bcrypt hashing with salt rounds for secure password storage
- **JWT Authentication**: Added JSON Web Token-based authentication replacing client-side only auth
- **Authorization Middleware**: Created comprehensive role-based access control for all API endpoints
- **Rate Limiting**: Added request rate limiting to prevent brute force attacks
- **Security Headers**: Implemented Helmet.js with CSP, CORS configuration, and security headers
- **Input Validation**: Added parameter validation and sanitization across all endpoints
- **Error Handling**: Implemented secure error responses that don't leak internal information

### Real-time Features Added
- **Live Location Tracking**: Real-time geolocation updates every 30 seconds
- **Dynamic Clock**: Live updating time display with working hours validation
- **Working Hours System**: Configurable working schedule (9:30 AM - 5:00 PM, Tue-Sun, Monday off)
- **Animated Mobile Interface**: Smooth animations and transitions for better UX
- **Network Status**: Online/offline detection with appropriate UI feedback
- **Real-time Attendance**: Live attendance status updates and validation

### New Components
- **Mobile Employee Portal**: Comprehensive real-time mobile interface with animations
- **Working Hours Management**: HR configuration panel for adjusting work schedules
- **Authentication System**: Secure JWT-based login with proper session management
- **Location Services**: Geolocation tracking with permission handling

## Mobile App Features (July 02, 2025)

### Complete Professional Mobile Interface
- **Home Dashboard** (/mobile-app): Real mobile phone interface with check-in/out functionality
- **Live Location Tracking** (/mobile-location): Google Maps integration with real-time GPS updates every 15 seconds
- **Attendance History** (/mobile-attendance): Complete attendance reports with working hours analytics
- **Leave Management** (/mobile-leave): Professional leave application with approval workflow
- **Holiday Calendar** (/mobile-holidays): Company holidays with countdown timers and emojis
- **Employee Profile** (/mobile-profile): User profile management with settings and logout

### PWA & APK Export Ready
- Progressive Web App manifest configured for native app experience
- Mobile-optimized meta tags for iOS and Android compatibility
- APK export guide created with multiple deployment options
- Professional mobile UI matching provided design references

### Google Maps Integration
- Real-time location tracking with 15-second updates
- Green check-in zones visible on interactive map
- Geolocation validation for attendance check-in
- Map controls for navigation and location centering

## Recent Fixes (July 02, 2025)

### Database and Authentication Issues Resolved
- **Database Connection**: Fixed DATABASE_URL configuration and PostgreSQL database setup
- **Working Hours Import**: Resolved import errors for working hours schema and database operations
- **Authentication Middleware**: Fixed JWT authentication chain for working hours and calculation endpoints
- **Route Conflicts**: Removed duplicate working hours route definitions that were causing conflicts

### Employee Management Fixes
- **Employee Creation**: Fixed numeric field validation for base salary and other schema mismatches
- **Password Requirements**: Implemented proper password strength validation (requires uppercase, special character)
- **Data Type Conversion**: Added automatic conversion between frontend form data and backend schema expectations

### System Settings & Branding (July 02, 2025)
- **Complete Settings Management**: Implemented comprehensive system settings allowing HR to customize app name, logo, and company branding
- **App Customization**: Users can change application name, upload custom logos, and modify color themes (primary/secondary colors)
- **Company Information**: Full company profile setup including address, contact details, and corporate information
- **Regional Settings**: Configurable timezone, date format, and currency settings for international use
- **Professional UI**: Modern settings interface with organized sections, file upload, color pickers, and real-time preview
- **Database Integration**: New system_settings table with proper validation and API endpoints for secure configuration management

### Shift Configuration & UI Improvements (July 02, 2025)
- **Enhanced Working Hours**: Added earliest check-in and latest check-out time configuration to working hours system
- **Shift Management**: HR can now set flexible check-in windows (e.g., earliest 8:00 AM, latest check-out 8:00 PM) for better shift control
- **Check-in Zone Fix**: Resolved admin dashboard check-in zone creation issue by fixing latitude/longitude data type handling
- **Mobile UI Cleanup**: Removed mobile status bar (time 9:41, signal bars, battery icon) from mobile profile page for cleaner interface
- **Database Schema**: Updated working_hours table with earliestCheckIn and latestCheckOut columns for comprehensive shift management

### Professional Calculation System (July 02, 2025)
- **Real-World Attendance Analytics**: Enhanced attendance calculation with working days exclusions, holiday handling, punctuality tracking, and productivity metrics
- **Comprehensive Payroll Engine**: Implemented professional payroll system with progressive tax rates, multiple deduction types (social security, medicare, health insurance, provident fund), attendance bonuses, late penalties, and overtime calculations
- **Advanced Business Logic**: Added support for company working hours (Tue-Sun, Monday off), holiday exclusions, performance bonuses for punctuality, and attendance rate incentives
- **Professional UI**: Created comprehensive calculation dashboards with color-coded metrics, detailed breakdowns, and real-world salary components
- **SelectItem Bug Fix**: Resolved React Select component error that was preventing calculations page from loading

### Attendance Request Workflow (July 02, 2025)
- **Automatic Attendance Creation**: When HR approves attendance adjustment requests, the system automatically creates or updates attendance records with standard working hours (7.5 hours, 9:30-17:00)
- **Leave Request Processing**: Approved leave requests automatically create attendance records with "on_leave" status for all working days in the requested period
- **Smart Record Management**: System checks for existing attendance records and updates them appropriately, avoiding duplicates
- **Audit Trail**: All automatically created attendance records include detailed notes linking back to the original request for full traceability
- **Working Hours Integration**: Uses configured company working hours and excludes non-working days (Mondays) from automatic attendance creation

### Real-Time Notification System (July 02, 2025)
- **Bell Notifications**: Mobile app displays live notification bell with unread count badges
- **Request Status Alerts**: Automatic notifications when HR approves/rejects employee requests
- **Real-Time Updates**: Notifications poll every 3 seconds for instant updates when requests are processed
- **Smart Navigation**: Bell notifications redirect to relevant pages (attendance, leave, etc.) when clicked
- **Notification Management**: Users can mark as read, clear individual notifications, or view detailed status
- **Professional UI**: Animated notification panel with color-coded status indicators and action buttons

### Zone-Based Check-in Validation (July 02, 2025)
- **Real-Time Zone Detection**: Mobile app continuously monitors user location and validates against HR-configured check-in zones
- **Visual Zone Status**: Displays "In Check-in Zone" (green) or "Not in Zone" (red) indicator with animated status updates
- **Location-Based Security**: Check-in button disabled when user is outside designated zones, preventing unauthorized attendance
- **Geofence Integration**: Uses Haversine formula to calculate distance from user to zone centers with configurable radius validation
- **Working Hours Integration**: Combines zone validation with working hours system for comprehensive attendance control
- **Professional UI**: Color-coded status indicators with smooth animations and clear messaging for zone compliance

### Real Working Hours Integration (July 03, 2025)
- **Database-Driven Configuration**: Mobile app now uses real working hours data from database instead of hardcoded demo values
- **PostgreSQL Array Handling**: Fixed data type conversion for workDays field from PostgreSQL array string format
- **Dynamic Working Status**: Real-time working status calculations based on actual company schedule (9:30 AM - 5:00 PM, Tuesday-Sunday)
- **TypeScript Compatibility**: Updated interfaces to handle both array and string formats for workDays data
- **Live Data Display**: Mobile app displays authentic company working hours and status messages

### HR Reporting & Employee Shift Management (July 04, 2025)
- **Comprehensive Attendance Reports**: HR can generate detailed attendance reports with date range filtering (daily, monthly, custom periods)
- **Employee-Specific Shifts**: Individual working hour configurations for each employee with different shift patterns (morning, evening, night shifts)
- **Real Hours Calculation**: Accurate working hours calculation based on check-in/check-out times minus break duration
- **CSV Export**: Download attendance reports as CSV files for external analysis and payroll processing
- **Shift Templates**: Pre-configured shift templates (Standard Day, Morning, Evening, Night) for quick employee assignment
- **Global vs Individual**: Support for both company-wide default shifts and employee-specific custom schedules
- **Removed Payroll Calculations**: Streamlined system by removing complex payroll calculation features to focus on core attendance tracking

### Comprehensive Deployment Setup (July 03, 2025)
- **Multi-Environment Support**: Complete deployment guides for local development, cPanel hosting, and cloud platforms
- **Docker Configuration**: Production-ready Docker Compose setup with PostgreSQL, Redis, and Nginx
- **Database Options**: Support for PostgreSQL (recommended), MySQL, and cloud databases (Neon, Supabase, Railway)
- **Security Templates**: Environment variable templates, JWT secret generation, and security checklists
- **Automation Scripts**: Setup scripts for quick deployment, health checks, and maintenance tasks
- **PM2 Integration**: Process management configuration for production deployments
- **cPanel Compatibility**: Detailed hosting setup for shared hosting environments with step-by-step instructions

## Changelog

Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Security audit and comprehensive security fixes implemented
- July 02, 2025. Real-time mobile portal with geolocation and working hours system
- July 02, 2025. Complete mobile app interface created matching user's design specifications
- July 02, 2025. PWA configuration and APK export functionality implemented
- July 02, 2025. Fixed critical database, authentication, and employee management issues
- July 02, 2025. Added attendance and payroll calculation features with comprehensive dashboard
- July 03, 2025. Fixed mobile app to use real working hours data from database instead of demo data
- July 03, 2025. Created comprehensive deployment guides for database setup, local development, cPanel hosting, and Docker deployment