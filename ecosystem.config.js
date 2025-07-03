/**
 * PM2 Ecosystem Configuration for HRFlow
 * Production process management with PM2
 */

module.exports = {
  apps: [
    {
      name: 'hrflow',
      script: './dist/index.js',
      instances: 1, // Set to 'max' for load balancing across all CPU cores
      exec_mode: 'fork', // Use 'cluster' for load balancing
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '1G',
      
      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // DATABASE_URL will be read from .env file
        // JWT_SECRET will be read from .env file
      },
      
      // Environment variables for development
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        watch: true,
        ignore_watch: [
          'node_modules',
          'logs',
          'uploads',
          'backups',
          '.git'
        ]
      },
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced PM2 features
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Health monitoring
      health_check_url: 'http://localhost:3000/api/health',
      health_check_grace_period: 30000,
      
      // Restart strategies
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory and CPU monitoring
      monitor_memory: true,
      monitor_cpu: true,
      
      // Custom restart conditions
      restart_delay: 4000,
      
      // Environment specific overrides
      env: {
        NODE_ENV: 'production'
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/hrflow.git',
      path: '/var/www/hrflow',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && npm run db:push && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/hrflow.git',
      path: '/var/www/hrflow-staging',
      'post-deploy': 'npm install && npm run build && npm run db:push && pm2 reload ecosystem.config.js --env development && pm2 save',
      env: {
        NODE_ENV: 'staging',
        PORT: 4000
      }
    }
  }
};

/**
 * Usage Examples:
 * 
 * # Start the application in production
 * pm2 start ecosystem.config.js --env production
 * 
 * # Start in development mode
 * pm2 start ecosystem.config.js --env development
 * 
 * # Restart the application
 * pm2 restart hrflow
 * 
 * # Stop the application
 * pm2 stop hrflow
 * 
 * # Delete the application from PM2
 * pm2 delete hrflow
 * 
 * # Monitor the application
 * pm2 monit
 * 
 * # View logs
 * pm2 logs hrflow
 * 
 * # Show application status
 * pm2 status
 * 
 * # Save PM2 configuration
 * pm2 save
 * 
 * # Setup PM2 startup script
 * pm2 startup
 * 
 * # Deploy to production
 * pm2 deploy production setup
 * pm2 deploy production
 * 
 * # Deploy to staging
 * pm2 deploy staging setup
 * pm2 deploy staging
 */