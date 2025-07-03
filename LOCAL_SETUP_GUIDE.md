# HRFlow Local Development Setup Guide

This guide will help you set up HRFlow on your local machine step by step.

## Prerequisites

- Node.js 20.x or higher (Required for vite.config.ts compatibility)
- PostgreSQL 12+ (or access to a cloud database)
- Git
- npm or yarn package manager

**Important:** Node.js 18.x has compatibility issues with the current vite.config.ts. Please upgrade to Node.js 20+ or use the workaround below.

## Step 1: Project Setup

1. **Clone or download the project:**
   ```bash
   git clone <your-repo-url>
   cd WorkTrackPro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Step 2: Database Setup

You have three options for database setup:

### Option A: Local PostgreSQL (Recommended for development)

1. **Install PostgreSQL on your system:**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```
   
   **macOS (using Homebrew):**
   ```bash
   brew install postgresql
   brew services start postgresql
   ```
   
   **Windows:**
   Download from [PostgreSQL Official Site](https://www.postgresql.org/download/windows/)

2. **Create database and user:**
   ```bash
   # Access PostgreSQL
   sudo -u postgres psql
   
   # Create database
   CREATE DATABASE hrflow_dev;
   
   # Create user
   CREATE USER hrflow_user WITH PASSWORD 'your_secure_password';
   
   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE hrflow_dev TO hrflow_user;
   
   # Exit PostgreSQL
   \q
   ```

3. **Your DATABASE_URL will be:**
   ```
   DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow_dev
   ```

### Option B: Docker PostgreSQL (Easy setup)

1. **Create docker-compose.dev.yml:**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: hrflow_dev
         POSTGRES_USER: hrflow_user
         POSTGRES_PASSWORD: dev_password_123
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start the database:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Your DATABASE_URL will be:**
   ```
   DATABASE_URL=postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev
   ```

### Option C: Cloud Database (Neon - Free tier)

1. **Sign up at [Neon](https://neon.tech)**
2. **Create a new project**
3. **Copy the connection string provided**
4. **Your DATABASE_URL will look like:**
   ```
   DATABASE_URL=postgresql://username:password@host.neon.tech/database_name?sslmode=require
   ```

## Step 3: Environment Configuration

1. **Create .env file from template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env file with your settings:**
   ```bash
   # Database Configuration
   DATABASE_URL=your_database_url_from_step_2
   
   # Server Configuration
   NODE_ENV=development
   PORT=5000
   
   # Security Configuration
   JWT_SECRET=your_super_secure_jwt_secret_key_here_min_32_chars
   SESSION_SECRET=your_session_secret_key_here
   
   # Optional: Google Maps API (for location features)
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # Database Connection Details (for manual tools)
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=hrflow_dev
   PGUSER=hrflow_user
   PGPASSWORD=your_secure_password
   ```

3. **Generate secure secrets:**
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate session secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Step 4: Database Schema Setup

1. **Push database schema:**
   ```bash
   npm run db:push
   ```

   You should see output like:
   ```
   [✓] Pulling schema from database...
   [✓] Changes applied
   ```

2. **Verify database connection:**
   ```bash
   # Test database connection
   node -e "
   import('./server/db.js').then(db => {
     return db.pool.query('SELECT 1 as test');
   }).then(result => {
     console.log('✅ Database connected successfully');
     console.log('Test result:', result.rows[0]);
     process.exit(0);
   }).catch(error => {
     console.error('❌ Database connection failed:', error.message);
     process.exit(1);
   });
   "
   ```

## Step 5: Start Development Server

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **You should see:**
   ```
   Initializing database storage...
   Database storage initialized successfully
   [express] serving on port 5000
   ```

3. **Open your browser:**
   - Web interface: `http://localhost:5000`
   - Mobile interface: `http://localhost:5000/mobile-app`

## Step 6: Initial Login

Use these default credentials:
- **HR Account:**
  - Username: `hr.admin`
  - Password: `Admin123!`

- **Employee Account:**
  - Username: `john.smith`
  - Password: `Employee123!`

## Troubleshooting Common Issues

### Issue: "DATABASE_URL must be set"
**Solution:** Make sure your `.env` file exists and has the correct DATABASE_URL

### Issue: "Cannot find package 'dotenv'"
**Solution:** Install missing dependency:
```bash
npm install dotenv
```

### Issue: "listen EADDRINUSE: address already in use"
**Solution:** Stop other processes using port 5000:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
PORT=3000 npm run dev
```

### Issue: Database connection fails
**Solution:** Check database service is running:
```bash
# For local PostgreSQL
sudo systemctl status postgresql

# For Docker
docker-compose -f docker-compose.dev.yml ps

# Test connection manually
psql -h localhost -U hrflow_user -d hrflow_dev
```

### Issue: "Cannot find module"
**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "The 'paths[0]' argument must be of type string. Received undefined"
**Solution:** This is a Node.js version compatibility issue. You have two options:

**Option 1: Upgrade Node.js (Recommended)**
```bash
# Using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Or download from nodejs.org
# Visit: https://nodejs.org/en/download/
```

**Option 2: Use tsx directly (Workaround)**
```bash
# Instead of npm run dev, use:
NODE_ENV=development npx tsx server/index.ts
```

## Development Tips

1. **Auto-restart on changes:**
   The dev server automatically restarts when you make changes to server files.

2. **Database reset:**
   ```bash
   npm run db:push
   ```

3. **View logs:**
   ```bash
   # If using the custom scripts
   ./scripts.sh logs
   
   # Or check console output
   npm run dev
   ```

4. **Health check:**
   ```bash
   # Test application health
   curl http://localhost:5000/api/health
   ```

## Next Steps

1. **Customize company settings** - Login as HR admin and go to Settings
2. **Add employees** - Use the employee management interface
3. **Configure working hours** - Set up your company's work schedule
4. **Test mobile interface** - Access `/mobile-app` for the employee portal

## Quick Start Script

For automated setup, you can use:
```bash
# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh
```

## Getting Help

If you encounter issues:
1. Check the console output for error messages
2. Verify your `.env` file configuration
3. Ensure your database is running and accessible
4. Check the troubleshooting section above

## Production Deployment

For production deployment, see:
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `cpanel-setup.md` - cPanel hosting setup
- `docker-compose.yml` - Docker production setup