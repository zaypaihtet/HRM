#!/bin/bash

# HRFlow Development Server for Node.js 18
# Workaround for vite.config.ts compatibility issues

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}HRFlow Development Server (Node.js 18 Compatible)${NC}"
echo

# Check Node.js version
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -eq 18 ]; then
    echo -e "${YELLOW}Node.js 18 detected. Using compatibility mode.${NC}"
elif [ "$NODE_MAJOR" -eq 19 ]; then
    echo -e "${YELLOW}Node.js 19 detected. Using compatibility mode.${NC}"
else
    echo -e "${GREEN}Node.js $NODE_VERSION detected.${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please run ./quick-start.sh first"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "🔧 Starting development server..."
echo "📍 Server will be available at: http://localhost:${PORT:-5000}"
echo "📱 Mobile interface: http://localhost:${PORT:-5000}/mobile-app"
echo

# Start the server directly with tsx (bypasses vite config issues)
NODE_ENV=development npx tsx server/index.ts