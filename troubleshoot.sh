#!/bin/bash

# HRFlow Troubleshooting Script
# Diagnoses common setup issues and provides solutions

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Check Node.js version
check_nodejs() {
    print_header "Checking Node.js"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js installed: $NODE_VERSION"
        
        # Check if version is 20 or higher (required for vite.config.ts)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 20 ]; then
            print_status "Node.js version is compatible"
        elif [ "$NODE_MAJOR" -eq 18 ] || [ "$NODE_MAJOR" -eq 19 ]; then
            print_warning "Node.js $NODE_VERSION detected. This may cause vite.config.ts issues."
            print_info "Recommend upgrading to Node.js 20+ or use workaround: NODE_ENV=development npx tsx server/index.ts"
        else
            print_error "Node.js version $NODE_VERSION is too old. Please upgrade to v20 or higher"
            print_info "Visit: https://nodejs.org/en/download/"
        fi
    else
        print_error "Node.js not found"
        print_info "Install Node.js from: https://nodejs.org/en/download/"
    fi
}

# Check npm and dependencies
check_dependencies() {
    print_header "Checking Dependencies"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm installed: $NPM_VERSION"
        
        # Check if package.json exists
        if [ -f "package.json" ]; then
            print_status "package.json found"
            
            # Check if node_modules exists
            if [ -d "node_modules" ]; then
                print_status "node_modules directory exists"
                
                # Check key dependencies
                if [ -d "node_modules/dotenv" ]; then
                    print_status "dotenv package installed"
                else
                    print_error "dotenv package missing"
                    print_info "Run: npm install dotenv"
                fi
                
                if [ -d "node_modules/tsx" ]; then
                    print_status "tsx package installed"
                else
                    print_error "tsx package missing"
                    print_info "Run: npm install"
                fi
                
            else
                print_error "node_modules directory not found"
                print_info "Run: npm install"
            fi
        else
            print_error "package.json not found"
            print_info "Make sure you're in the project directory"
        fi
    else
        print_error "npm not found"
        print_info "npm should be installed with Node.js"
    fi
}

# Check environment configuration
check_environment() {
    print_header "Checking Environment Configuration"
    
    if [ -f ".env" ]; then
        print_status ".env file exists"
        
        # Check for required variables
        if grep -q "DATABASE_URL" .env; then
            DATABASE_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2)
            if [ -n "$DATABASE_URL" ]; then
                print_status "DATABASE_URL is set"
            else
                print_error "DATABASE_URL is empty"
                print_info "Set your database connection string in .env"
            fi
        else
            print_error "DATABASE_URL not found in .env"
            print_info "Add DATABASE_URL to your .env file"
        fi
        
        if grep -q "JWT_SECRET" .env; then
            JWT_SECRET=$(grep "JWT_SECRET" .env | cut -d'=' -f2)
            if [ -n "$JWT_SECRET" ]; then
                print_status "JWT_SECRET is set"
            else
                print_error "JWT_SECRET is empty"
                print_info "Add JWT_SECRET to your .env file"
            fi
        else
            print_error "JWT_SECRET not found in .env"
            print_info "Add JWT_SECRET to your .env file"
        fi
        
    else
        print_error ".env file not found"
        print_info "Copy .env.example to .env: cp .env.example .env"
    fi
}

# Check database connectivity
check_database() {
    print_header "Checking Database Connection"
    
    if [ -f ".env" ]; then
        source .env
        
        if [ -n "$DATABASE_URL" ]; then
            print_info "Testing database connection..."
            
            # Test with Node.js
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
                print_status "Database connection successful"
            else
                print_error "Database connection failed"
                print_info "Check your DATABASE_URL and ensure the database is running"
            fi
        else
            print_error "DATABASE_URL not set"
        fi
    else
        print_error ".env file not found"
    fi
}

# Check for port conflicts
check_ports() {
    print_header "Checking Port Availability"
    
    DEFAULT_PORT=5000
    
    if command -v lsof &> /dev/null; then
        PORT_IN_USE=$(lsof -ti:$DEFAULT_PORT)
        if [ -n "$PORT_IN_USE" ]; then
            print_error "Port $DEFAULT_PORT is in use by process $PORT_IN_USE"
            print_info "Kill the process: kill -9 $PORT_IN_USE"
            print_info "Or use a different port: PORT=3000 npm run dev"
        else
            print_status "Port $DEFAULT_PORT is available"
        fi
    else
        print_warning "lsof not available, cannot check port status"
    fi
}

# Check project structure
check_project_structure() {
    print_header "Checking Project Structure"
    
    REQUIRED_FILES=(
        "server/index.ts"
        "server/db.ts"
        "client/src/App.tsx"
        "shared/schema.ts"
        "drizzle.config.ts"
        "vite.config.ts"
        "tsconfig.json"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_status "$file exists"
        else
            print_error "$file missing"
        fi
    done
}

# Generate solutions
generate_solutions() {
    print_header "Quick Solutions"
    
    echo "1. Install missing dependencies:"
    echo "   npm install"
    echo
    echo "2. Set up environment:"
    echo "   cp .env.example .env"
    echo "   # Edit .env with your database URL"
    echo
    echo "3. Setup database:"
    echo "   npm run db:push"
    echo
    echo "4. Generate secrets:"
    echo "   node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))\""
    echo
    echo "5. Start development server:"
    echo "   npm run dev"
    echo
    echo "6. For detailed setup guide:"
    echo "   cat LOCAL_SETUP_GUIDE.md"
}

# Main execution
main() {
    echo -e "${BLUE}HRFlow Troubleshooting Tool${NC}"
    echo "Diagnosing common setup issues..."
    
    check_nodejs
    check_dependencies
    check_environment
    check_database
    check_ports
    check_project_structure
    generate_solutions
    
    echo -e "\n${GREEN}Troubleshooting completed!${NC}"
    echo "Check the issues above and follow the suggested solutions."
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi