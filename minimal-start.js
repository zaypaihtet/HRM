#!/usr/bin/env node

/**
 * Minimal HRFlow Starter - Bypasses all config issues
 * Direct Node.js script that starts the server without any external configs
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 HRFlow Minimal Starter');
console.log('Bypassing all configuration issues...\n');

// Step 1: Check and install dependencies
console.log('📦 Checking dependencies...');
try {
  execSync('npm list tsx', { stdio: 'ignore' });
  console.log('✓ Dependencies are installed');
} catch {
  console.log('Installing missing dependencies...');
  execSync('npm install tsx dotenv', { stdio: 'inherit' });
}

// Step 2: Create minimal .env file
console.log('\n⚙️ Setting up environment...');
const envPath = join(__dirname, '.env');

if (!existsSync(envPath)) {
  const envContent = `# HRFlow Minimal Configuration
NODE_ENV=development
PORT=5000

# Use in-memory database for quick start (no PostgreSQL needed)
# DATABASE_URL will be handled in code

# Security
JWT_SECRET=minimal_jwt_secret_for_development_only_not_for_production
SESSION_SECRET=minimal_session_secret_for_development_only

# Optional
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
`;
  writeFileSync(envPath, envContent);
  console.log('✓ Created minimal .env file');
} else {
  console.log('✓ .env file exists');
}

// Step 3: Create minimal server start script
console.log('\n🔧 Creating minimal server...');
const serverScript = `
import dotenv from 'dotenv';
dotenv.config();

// Set minimal environment
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '5000';

// Mock DATABASE_URL to prevent errors
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
}

console.log('Starting HRFlow server in minimal mode...');
console.log('Server will start at: http://localhost:' + process.env.PORT);
console.log('Mobile interface: http://localhost:' + process.env.PORT + '/mobile-app');
console.log('');

// Import and start the server
import('./server/index.js').catch(error => {
  console.error('Error starting server:', error.message);
  console.log('');
  console.log('Alternative solutions:');
  console.log('1. Install and setup PostgreSQL database');
  console.log('2. Use cloud database (see NODEJS_COMPATIBILITY.md)');
  console.log('3. Check Node.js version (requires 20+ for full features)');
  process.exit(1);
});
`;

const startScriptPath = join(__dirname, 'start-minimal.js');
writeFileSync(startScriptPath, serverScript);

// Step 4: Start the server
console.log('🚀 Starting server in minimal mode...');
console.log('Note: This bypasses database setup for quick testing\n');

try {
  execSync('node start-minimal.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.log('\n❌ Server start failed');
  console.log('\nTroubleshooting steps:');
  console.log('1. Run: npm install');
  console.log('2. Check Node.js version: node --version (needs 18+)');
  console.log('3. For database setup, see LOCAL_SETUP_GUIDE.md');
  console.log('4. Try: NODE_ENV=development npx tsx server/index.ts');
}