#!/bin/bash

# HRFlow Quick Setup Script
# This script automates the initial setup process

set -e  # Exit on any error

echo "🚀 HRFlow Setup Script"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    print_header "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js $NODE_VERSION is installed"
        
        # Check if version is 18 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js version 18+ is recommended. Current: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm $NPM_VERSION is installed"
    else
        print_error "npm is not installed"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    print_header "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status "Created .env file from .env.example"
            print_warning "Please edit .env file with your actual configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_warning ".env file already exists"
    fi
}

# Database setup
setup_database() {
    print_header "Database setup..."
    
    # Check if DATABASE_URL is set
    if [ -f .env ]; then
        source .env
        if [ -z "$DATABASE_URL" ]; then
            print_warning "DATABASE_URL not set in .env file"
            print_status "Please configure your database connection in .env"
            return
        fi
        
        print_status "Running database migration..."
        npm run db:push
        print_status "Database setup completed"
    else
        print_warning "No .env file found. Skipping database setup."
    fi
}

# Build application
build_application() {
    print_header "Building application..."
    npm run build
    print_status "Application built successfully"
}

# Generate JWT secret if not exists
generate_jwt_secret() {
    print_header "Checking JWT secret..."
    
    if [ -f .env ]; then
        source .env
        if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secure_jwt_secret_here_change_this_in_production" ]; then
            JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
            sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
            print_status "Generated new JWT secret"
        else
            print_status "JWT secret is already configured"
        fi
    fi
}

# Create necessary directories
create_directories() {
    print_header "Creating necessary directories..."
    
    mkdir -p uploads
    mkdir -p logs
    mkdir -p backups
    
    print_status "Directories created"
}

# Set file permissions
set_permissions() {
    print_header "Setting file permissions..."
    
    # Make scripts executable
    chmod +x setup.sh 2>/dev/null || true
    
    # Set proper permissions for uploads
    chmod 755 uploads 2>/dev/null || true
    
    print_status "Permissions set"
}

# Main setup function
main() {
    print_header "Starting HRFlow setup..."
    echo
    
    check_nodejs
    check_npm
    setup_environment
    install_dependencies
    generate_jwt_secret
    create_directories
    set_permissions
    
    # Only run database setup if DATABASE_URL is configured
    if [ -f .env ]; then
        source .env
        if [ ! -z "$DATABASE_URL" ] && [ "$DATABASE_URL" != "postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow" ]; then
            setup_database
        else
            print_warning "Please configure DATABASE_URL in .env before running database setup"
        fi
    fi
    
    build_application
    
    echo
    print_header "Setup completed successfully! 🎉"
    echo
    print_status "Next steps:"
    echo "1. Edit .env file with your database configuration"
    echo "2. Run 'npm run db:push' to setup database schema"
    echo "3. Run 'npm run dev' for development or 'npm start' for production"
    echo
    print_status "Default login credentials:"
    echo "   Admin: admin / admin123"
    echo "   Employee: john.smith / password123"
    echo
    print_warning "Remember to change default passwords after first login!"
}

# Handle script arguments
case "$1" in
    --docker)
        print_header "Setting up with Docker..."
        docker-compose up -d postgres
        sleep 5
        main
        ;;
    --production)
        print_header "Production setup..."
        export NODE_ENV=production
        main
        ;;
    --help)
        echo "HRFlow Setup Script"
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --docker      Setup with Docker database"
        echo "  --production  Production setup"
        echo "  --help        Show this help message"
        echo
        ;;
    *)
        main
        ;;
esac