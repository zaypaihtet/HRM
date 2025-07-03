#!/bin/bash

# HRFlow Quick Start Script
# Fixes common setup issues and gets you running quickly

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo -e "${BLUE}HRFlow Quick Start Setup${NC}"
echo "This script will fix common setup issues and get your app running."
echo

# Check Node.js version compatibility
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js $NODE_VERSION is too old. Please upgrade to Node.js 18+ or preferably 20+"
    echo "Visit: https://nodejs.org/en/download/"
    exit 1
elif [ "$NODE_MAJOR" -eq 18 ] || [ "$NODE_MAJOR" -eq 19 ]; then
    print_warning "Node.js $NODE_VERSION detected. This may cause vite config issues."
    echo "We'll set up a compatibility script for you."
    USE_COMPAT_MODE=true
else
    print_success "Node.js $NODE_VERSION is compatible"
    USE_COMPAT_MODE=false
fi

# Step 1: Install dependencies
print_step "1" "Installing dependencies"
npm install
if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Install dotenv specifically (if missing)
print_step "2" "Ensuring dotenv is installed"
if [ ! -d "node_modules/dotenv" ]; then
    npm install dotenv
    print_success "dotenv installed"
else
    print_success "dotenv already installed"
fi

# Step 3: Setup environment file
print_step "3" "Setting up environment configuration"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        # Create basic .env file
        cat > .env << EOF
# HRFlow Environment Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev

# Security Configuration
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Optional: Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Database Connection Details
PGHOST=localhost
PGPORT=5432
PGDATABASE=hrflow_dev
PGUSER=hrflow_user
PGPASSWORD=dev_password_123
EOF
        print_success "Created basic .env file"
    fi
else
    print_success ".env file already exists"
fi

# Step 4: Database options
print_step "4" "Database setup options"
echo "Choose your database setup:"
echo "1. Use Docker PostgreSQL (recommended for quick start)"
echo "2. Use existing PostgreSQL installation"
echo "3. Use cloud database (Neon, Supabase, etc.)"
echo "4. Skip database setup (I'll configure it manually)"
echo

read -p "Enter your choice (1-4): " DB_CHOICE

case $DB_CHOICE in
    1)
        print_step "4a" "Setting up Docker PostgreSQL"
        if command -v docker &> /dev/null; then
            # Create docker-compose for development
            cat > docker-compose.dev.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: hrflow_postgres_dev
    environment:
      POSTGRES_DB: hrflow_dev
      POSTGRES_USER: hrflow_user
      POSTGRES_PASSWORD: dev_password_123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
EOF
            
            # Start PostgreSQL
            docker-compose -f docker-compose.dev.yml up -d
            
            if [ $? -eq 0 ]; then
                print_success "PostgreSQL started with Docker"
                print_success "Database URL: postgresql://hrflow_user:dev_password_123@localhost:5432/hrflow_dev"
                
                # Wait for database to be ready
                echo "Waiting for database to be ready..."
                sleep 5
            else
                print_error "Failed to start PostgreSQL with Docker"
                exit 1
            fi
        else
            print_error "Docker not found. Please install Docker or choose option 2."
            exit 1
        fi
        ;;
    2)
        print_step "4b" "Using existing PostgreSQL"
        print_warning "Make sure PostgreSQL is running and you have created the database."
        echo "If you haven't created the database yet, run these commands:"
        echo "  sudo -u postgres psql"
        echo "  CREATE DATABASE hrflow_dev;"
        echo "  CREATE USER hrflow_user WITH PASSWORD 'dev_password_123';"
        echo "  GRANT ALL PRIVILEGES ON DATABASE hrflow_dev TO hrflow_user;"
        echo "  \\q"
        ;;
    3)
        print_step "4c" "Using cloud database"
        print_warning "Please update the DATABASE_URL in your .env file with your cloud database connection string."
        echo "Example formats:"
        echo "  Neon: postgresql://user:pass@host.neon.tech/db?sslmode=require"
        echo "  Supabase: postgresql://user:pass@host.supabase.co:5432/postgres"
        ;;
    4)
        print_step "4d" "Skipping database setup"
        print_warning "Remember to configure your DATABASE_URL in .env before running the app."
        ;;
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

# Step 5: Test database connection and setup schema
print_step "5" "Setting up database schema"
if [ "$DB_CHOICE" != "4" ]; then
    # Wait a bit more for database to be ready
    sleep 3
    
    # Test database connection
    echo "Testing database connection..."
    node -e "
        import('./server/db.js').then(db => {
            return db.pool.query('SELECT 1 as test');
        }).then(result => {
            console.log('✅ Database connection successful');
            process.exit(0);
        }).catch(error => {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        });
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database connection successful"
        
        # Push schema
        npm run db:push
        if [ $? -eq 0 ]; then
            print_success "Database schema created"
        else
            print_error "Failed to create database schema"
            print_warning "Try running: npm run db:push manually"
        fi
    else
        print_error "Database connection failed"
        print_warning "Please check your DATABASE_URL in .env file"
    fi
else
    print_warning "Database setup skipped - configure DATABASE_URL before running npm run db:push"
fi

# Step 6: Final setup
print_step "6" "Final setup"

# Create logs directory
mkdir -p logs
print_success "Created logs directory"

# Check for port conflicts
if command -v lsof &> /dev/null; then
    PORT_IN_USE=$(lsof -ti:5000)
    if [ -n "$PORT_IN_USE" ]; then
        print_warning "Port 5000 is in use. You can:"
        echo "  1. Kill the process: kill -9 $PORT_IN_USE"
        echo "  2. Use a different port: PORT=3000 npm run dev"
    fi
fi

# Final success message
echo
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo

# Provide appropriate start command based on Node.js version
if [ "$USE_COMPAT_MODE" = true ]; then
    print_warning "Due to your Node.js version, use the compatibility script:"
    echo "  ./dev-node18.sh"
    echo
    echo "Alternative:"
    echo "  NODE_ENV=development npx tsx server/index.ts"
    echo
    echo "For full features, consider upgrading to Node.js 20+:"
    echo "  See NODEJS_COMPATIBILITY.md for upgrade instructions"
else
    echo "To start the application:"
    echo "  npm run dev"
fi

echo
echo "Then open your browser to:"
echo "  Web interface: http://localhost:5000"
echo "  Mobile interface: http://localhost:5000/mobile-app"
echo
echo "Default login credentials:"
echo "  HR Admin: hr.admin / Admin123!"
echo "  Employee: john.smith / Employee123!"
echo
echo "If you encounter issues:"
echo "  ./troubleshoot.sh - Diagnose problems"
echo "  NODEJS_COMPATIBILITY.md - Node.js version issues"
echo "  LOCAL_SETUP_GUIDE.md - Detailed setup guide"
echo

# Make troubleshoot and compatibility scripts executable
chmod +x troubleshoot.sh dev-node18.sh