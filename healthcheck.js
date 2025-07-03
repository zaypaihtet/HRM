#!/usr/bin/env node

/**
 * Health Check Script for HRFlow
 * Used by Docker and monitoring systems to verify application health
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';
const TIMEOUT = 5000; // 5 seconds

// Health check function
async function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/api/health',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            if (health.status === 'healthy') {
              resolve({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                ...health
              });
            } else {
              reject(new Error(`Unhealthy status: ${health.status}`));
            }
          } catch (error) {
            reject(new Error(`Invalid response: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.setTimeout(TIMEOUT);
    req.end();
  });
}

// Database connectivity check
async function checkDatabase() {
  try {
    // Simple database check using the application's database connection
    execSync('node -e "require(\'./server/db.js\').pool.query(\'SELECT 1\')"', { 
      timeout: 3000,
      stdio: 'pipe'
    });
    return { database: 'connected' };
  } catch (error) {
    return { 
      database: 'disconnected', 
      error: error.message.substring(0, 100) 
    };
  }
}

// Memory usage check
function checkMemory() {
  const used = process.memoryUsage();
  const usage = {};
  
  for (let key in used) {
    usage[key] = Math.round(used[key] / 1024 / 1024 * 100) / 100;
  }
  
  return {
    memory: usage,
    warning: usage.heapUsed > 500 ? 'High memory usage' : null
  };
}

// Disk space check (Linux/Unix only)
function checkDiskSpace() {
  try {
    const output = execSync('df -h /', { encoding: 'utf8', timeout: 2000 });
    const lines = output.trim().split('\n');
    if (lines.length > 1) {
      const parts = lines[1].split(/\s+/);
      return {
        disk: {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usage: parts[4]
        }
      };
    }
  } catch (error) {
    return { disk: 'unavailable' };
  }
  return { disk: 'unknown' };
}

// Main health check execution
async function main() {
  try {
    console.log('🏥 Running health check...');
    
    // Basic application health
    const appHealth = await healthCheck();
    console.log('✅ Application is healthy');
    
    // Extended checks
    const dbHealth = await checkDatabase();
    const memHealth = checkMemory();
    const diskHealth = checkDiskSpace();
    
    const fullHealth = {
      ...appHealth,
      ...dbHealth,
      ...memHealth,
      ...diskHealth
    };
    
    // Log warnings
    if (fullHealth.warning) {
      console.log(`⚠️  Warning: ${fullHealth.warning}`);
    }
    
    if (fullHealth.database === 'disconnected') {
      console.log('❌ Database connectivity issue');
      process.exit(1);
    }
    
    console.log('🎉 All systems healthy');
    console.log(JSON.stringify(fullHealth, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    
    // Try to get basic system info even on failure
    const basicInfo = {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...checkMemory(),
      ...checkDiskSpace()
    };
    
    console.log(JSON.stringify(basicInfo, null, 2));
    process.exit(1);
  }
}

// Handle different execution modes
if (require.main === module) {
  // Direct execution
  main();
} else {
  // Module export for testing
  module.exports = {
    healthCheck,
    checkDatabase,
    checkMemory,
    checkDiskSpace
  };
}