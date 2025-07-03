#!/bin/bash

# HRFlow Deployment Scripts
# Collection of useful commands for managing the application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Database functions
db_check() {
    print_header "Checking database connection..."
    node -e "
        import('./server/db.js').then(db => {
            return db.pool.query('SELECT 1');
        }).then(() => {
            console.log('✅ Database connected successfully');
            process.exit(0);
        }).catch(e => {
            console.error('❌ Database error:', e.message);
            process.exit(1);
        })
    "
}

db_backup() {
    print_header "Creating database backup..."
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_$DATE.sql"
    
    if [ -z "$DATABASE_URL" ]; then
        source .env 2>/dev/null || true
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not found. Please set it in .env file"
        exit 1
    fi
    
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    print_status "Backup created: $BACKUP_FILE"
}

db_restore() {
    if [ -z "$1" ]; then
        print_error "Usage: $0 db-restore <backup_file.sql>"
        exit 1
    fi
    
    print_header "Restoring database from $1..."
    
    if [ -z "$DATABASE_URL" ]; then
        source .env 2>/dev/null || true
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not found"
        exit 1
    fi
    
    psql "$DATABASE_URL" < "$1"
    print_status "Database restored from $1"
}

# Health check
health_check() {
    print_header "Running health check..."
    node healthcheck.js
}

# Log viewing
view_logs() {
    print_header "Viewing application logs..."
    if [ -f logs/app.log ]; then
        tail -f logs/app.log
    elif command -v pm2 &> /dev/null; then
        pm2 logs hrflow
    else
        print_warning "No log files found"
    fi
}

# Deployment functions
deploy_build() {
    print_header "Building for deployment..."
    npm ci --production
    npm run build
    npm run db:push
    print_status "Build completed"
}

deploy_start() {
    print_header "Starting application with PM2..."
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js --env production
    else
        print_warning "PM2 not installed. Starting with npm..."
        npm start &
    fi
}

deploy_stop() {
    print_header "Stopping application..."
    if command -v pm2 &> /dev/null; then
        pm2 stop hrflow
    else
        pkill -f "node.*hrflow"
    fi
}

deploy_restart() {
    print_header "Restarting application..."
    if command -v pm2 &> /dev/null; then
        pm2 restart hrflow
    else
        deploy_stop
        sleep 2
        deploy_start
    fi
}

deploy_status() {
    print_header "Application status..."
    if command -v pm2 &> /dev/null; then
        pm2 status
    else
        ps aux | grep -E "(node|hrflow)" | grep -v grep
    fi
}

# Docker functions
docker_up() {
    print_header "Starting Docker containers..."
    docker-compose up -d
    print_status "Docker containers started"
}

docker_down() {
    print_header "Stopping Docker containers..."
    docker-compose down
    print_status "Docker containers stopped"
}

docker_logs() {
    print_header "Viewing Docker logs..."
    docker-compose logs -f
}

# Maintenance functions
clean() {
    print_header "Cleaning up..."
    rm -rf dist node_modules/.cache
    npm cache clean --force
    print_status "Cleanup completed"
}

update() {
    print_header "Updating dependencies..."
    npm update
    npm audit fix
    print_status "Update completed"
}

# Security scan
security_scan() {
    print_header "Running security audit..."
    npm audit
    
    if command -v nmap &> /dev/null; then
        print_header "Scanning open ports..."
        nmap -sT -O localhost
    fi
}

# System info
system_info() {
    print_header "System Information"
    echo "Node.js: $(node --version)"
    echo "npm: $(npm --version)"
    echo "OS: $(uname -a)"
    echo "Memory: $(free -h 2>/dev/null || echo 'N/A')"
    echo "Disk: $(df -h . 2>/dev/null || echo 'N/A')"
    echo "Uptime: $(uptime 2>/dev/null || echo 'N/A')"
}

# Help function
show_help() {
    echo "HRFlow Management Scripts"
    echo "Usage: $0 <command>"
    echo
    echo "Database Commands:"
    echo "  db-check       Check database connection"
    echo "  db-backup      Create database backup"
    echo "  db-restore     Restore from backup file"
    echo
    echo "Health & Monitoring:"
    echo "  health         Run health check"
    echo "  logs           View application logs"
    echo "  status         Show application status"
    echo "  system-info    Display system information"
    echo
    echo "Deployment Commands:"
    echo "  deploy-build   Build for deployment"
    echo "  deploy-start   Start application"
    echo "  deploy-stop    Stop application"
    echo "  deploy-restart Restart application"
    echo
    echo "Docker Commands:"
    echo "  docker-up      Start Docker containers"
    echo "  docker-down    Stop Docker containers"
    echo "  docker-logs    View Docker logs"
    echo
    echo "Maintenance:"
    echo "  clean          Clean cache and temporary files"
    echo "  update         Update dependencies"
    echo "  security-scan  Run security audit"
    echo
    echo "Examples:"
    echo "  $0 db-backup"
    echo "  $0 deploy-restart"
    echo "  $0 db-restore backup_20250703_120000.sql"
}

# Main script logic
case "$1" in
    db-check)
        db_check
        ;;
    db-backup)
        db_backup
        ;;
    db-restore)
        db_restore "$2"
        ;;
    health)
        health_check
        ;;
    logs)
        view_logs
        ;;
    deploy-build)
        deploy_build
        ;;
    deploy-start)
        deploy_start
        ;;
    deploy-stop)
        deploy_stop
        ;;
    deploy-restart)
        deploy_restart
        ;;
    status)
        deploy_status
        ;;
    docker-up)
        docker_up
        ;;
    docker-down)
        docker_down
        ;;
    docker-logs)
        docker_logs
        ;;
    clean)
        clean
        ;;
    update)
        update
        ;;
    security-scan)
        security_scan
        ;;
    system-info)
        system_info
        ;;
    --help|help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 --help' for available commands"
        exit 1
        ;;
esac