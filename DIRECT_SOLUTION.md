# Direct Solution for Your HRFlow Setup Issues

Based on your error logs, here are the exact commands to get HRFlow running on your Ubuntu system.

## Your Issues Identified:
1. ❌ PostgreSQL database not running
2. ❌ Node.js 18 causing vite config issues  
3. ❌ Docker not available
4. ❌ DATABASE_URL connection failing

## Solution 1: Quick PostgreSQL Setup (Recommended)

Run these commands in order:

```bash
# 1. Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 2. Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Create database and user
sudo -u postgres psql -c "CREATE DATABASE hrflow_dev;"
sudo -u postgres psql -c "CREATE USER hrflow_user WITH PASSWORD 'dev_password_123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hrflow_dev TO hrflow_user;"

# 4. Test database connection
psql postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev -c "SELECT 1;"

# 5. Setup schema
cd ~/Desktop/WorkTrackPro/WorkTrackPro
npm run db:push

# 6. Start server (bypassing vite issues)
NODE_ENV=development npx tsx server/index.ts
```

If step 6 still gives vite errors, use:
```bash
# Alternative: Start with direct server file
cd ~/Desktop/WorkTrackPro/WorkTrackPro
export NODE_ENV=development
export DATABASE_URL=postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev
npx tsx server/index.ts
```

## Solution 2: Use Cloud Database (No PostgreSQL Install)

If you prefer not to install PostgreSQL locally:

1. **Sign up for Neon (free tier)**: https://neon.tech
2. **Create a new project**
3. **Copy the connection string**
4. **Update your .env file:**
   ```bash
   cd ~/Desktop/WorkTrackPro/WorkTrackPro
   nano .env
   ```
   Replace the DATABASE_URL line with your Neon connection string:
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```

5. **Setup schema and start:**
   ```bash
   npm run db:push
   NODE_ENV=development npx tsx server/index.ts
   ```

## Solution 3: Upgrade Node.js (Best Long-term)

For full features without compatibility issues:

```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Now you can use normal npm commands
cd ~/Desktop/WorkTrackPro/WorkTrackPro
npm run dev
```

## Quick Test Commands

After setting up the database, test these:

```bash
# Test database connection
psql postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev -c "SELECT 1;"

# Test server start
NODE_ENV=development npx tsx server/index.ts

# Check if server responds
curl http://localhost:5000/api/health
```

## Default Login Credentials

Once the server is running at http://localhost:5000:

- **HR Admin**: username `hr.admin`, password `Admin123!`
- **Employee**: username `john.smith`, password `Employee123!`

## If You Still Get Errors

1. **Database connection errors**: Make sure PostgreSQL is running
   ```bash
   sudo systemctl status postgresql
   ```

2. **Vite config errors**: Always use the direct tsx command instead of npm run dev

3. **Permission errors**: Make sure you're in the right directory
   ```bash
   cd ~/Desktop/WorkTrackPro/WorkTrackPro
   pwd  # Should show the full path to your project
   ```

Choose **Solution 1** for the quickest local setup, or **Solution 2** if you prefer cloud database.