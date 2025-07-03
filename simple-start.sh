#!/bin/bash

# HRFlow Simple Start - No Docker, No Vite Config Issues
# Direct server start that bypasses all configuration problems

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}HRFlow Simple Start${NC}"
echo "Bypassing configuration issues and starting server directly..."
echo

# Step 1: Setup PostgreSQL database manually
echo -e "${YELLOW}Step 1: Database Setup${NC}"
echo "First, let's set up PostgreSQL manually..."
echo

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL found"
    
    # Check if PostgreSQL service is running
    if systemctl is-active --quiet postgresql 2>/dev/null || service postgresql status &>/dev/null; then
        echo "✓ PostgreSQL service is running"
    else
        echo "Starting PostgreSQL service..."
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
    fi
else
    echo "❌ PostgreSQL not installed. Installing..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

echo
echo "Setting up database and user..."

# Create database and user
sudo -u postgres psql << 'EOF'
-- Drop existing database if it exists (for clean setup)
DROP DATABASE IF EXISTS hrflow_dev;
DROP USER IF EXISTS hrflow_user;

-- Create new database and user
CREATE DATABASE hrflow_dev;
CREATE USER hrflow_user WITH PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE hrflow_dev TO hrflow_user;

-- Also grant connect permission
GRANT CONNECT ON DATABASE hrflow_dev TO hrflow_user;

-- Exit
\q
EOF

if [ $? -eq 0 ]; then
    echo "✓ Database and user created successfully"
else
    echo "❌ Database setup failed. Trying alternative method..."
    
    # Alternative method with explicit database connection
    sudo -u postgres createdb hrflow_dev 2>/dev/null
    sudo -u postgres createuser hrflow_user 2>/dev/null
    sudo -u postgres psql -c "ALTER USER hrflow_user WITH PASSWORD 'dev_password_123';" 2>/dev/null
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hrflow_dev TO hrflow_user;" 2>/dev/null
fi

# Step 2: Update .env file
echo
echo -e "${YELLOW}Step 2: Environment Configuration${NC}"

# Create or update .env file
cat > .env << 'EOF'
# HRFlow Environment Configuration
NODE_ENV=development
PORT=5000

# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev

# Security Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters_long_for_security
SESSION_SECRET=your_session_secret_key_also_needs_to_be_long_and_secure

# Optional: Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Database Connection Details
PGHOST=localhost
PGPORT=5432
PGDATABASE=hrflow_dev
PGUSER=hrflow_user
PGPASSWORD=dev_password_123
EOF

echo "✓ .env file updated with local PostgreSQL configuration"

# Step 3: Test database connection
echo
echo -e "${YELLOW}Step 3: Testing Database Connection${NC}"

# Test connection with psql
psql postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev -c "SELECT 1 as test;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
    
    # Step 4: Install dependencies and setup schema
    echo
    echo -e "${YELLOW}Step 4: Setting up Database Schema${NC}"
    
    npm install
    npm run db:push
    
    if [ $? -eq 0 ]; then
        echo "✓ Database schema created successfully"
    else
        echo "❌ Schema creation failed, but continuing..."
    fi
    
else
    echo "❌ Database connection failed"
    echo "Manual verification needed. Try:"
    echo "  psql postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev"
fi

# Step 5: Start server without vite config
echo
echo -e "${YELLOW}Step 5: Starting Server (Bypassing Vite)${NC}"
echo "Starting server directly with tsx..."
echo

# Load environment variables and start server
export NODE_ENV=development
export PORT=5000
export $(cat .env | grep -v '^#' | xargs)

echo "🚀 Starting HRFlow server..."
echo "📍 Server will be available at: http://localhost:5000"
echo "📱 Mobile interface: http://localhost:5000/mobile-app"
echo
echo "Press Ctrl+C to stop the server"
echo

# Start server directly without npm run dev (bypasses vite config issues)
npx tsx server/index.ts