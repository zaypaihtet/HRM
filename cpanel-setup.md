# cPanel Deployment Guide for HRFlow

## Prerequisites
- cPanel hosting with Node.js support (version 18+)
- PostgreSQL or MySQL database access
- SSH access (recommended)
- File Manager access

## Step 1: Database Setup

### PostgreSQL Database (Recommended)
```sql
-- In cPanel > PostgreSQL Databases
-- 1. Create database: your_username_hrflow
-- 2. Create user: your_username_hrflow_user  
-- 3. Set strong password
-- 4. Assign user to database with ALL privileges

-- Connection details:
Host: localhost (or provided hostname)
Database: your_username_hrflow
Username: your_username_hrflow_user
Password: [your chosen password]
Port: 5432
```

### MySQL Database (Alternative)
```sql
-- In cPanel > MySQL Databases
-- 1. Create database: your_username_hrflow
-- 2. Create user: your_username_hrflow_user
-- 3. Set strong password  
-- 4. Assign user to database with ALL privileges

-- Update DATABASE_URL format for MySQL:
DATABASE_URL=mysql://your_username_hrflow_user:password@localhost:3306/your_username_hrflow
```

## Step 2: File Upload

### Option A: Using File Manager
1. Compress your project files into a ZIP
2. Upload to cPanel File Manager
3. Extract in `public_html` or subdirectory
4. Set proper permissions (755 for folders, 644 for files)

### Option B: Using FTP/SFTP
```bash
# Upload entire project directory
# Maintain file structure:
/public_html/hrflow/
├── server/
├── client/
├── shared/
├── package.json
├── .env
└── ...
```

### Option C: Using SSH/Git
```bash
# SSH into your cPanel account
ssh username@your-domain.com

# Navigate to web directory
cd public_html

# Clone repository (if using Git)
git clone https://github.com/your-username/hrflow.git
cd hrflow

# Or upload files and extract
wget https://link-to-your-project.zip
unzip project.zip
```

## Step 3: Environment Configuration

### Create .env file
```bash
# In cPanel File Manager or via SSH, create .env file:

DATABASE_URL=postgresql://your_username_hrflow_user:your_password@localhost:5432/your_username_hrflow
JWT_SECRET=generate_a_secure_32_character_string_here
NODE_ENV=production
PORT=3000

# Optional configurations
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SESSION_SECRET=another_secure_32_character_string
```

### Set File Permissions
```bash
# Via SSH or File Manager
chmod 644 .env
chmod 755 server/
chmod 644 package.json
chmod -R 755 node_modules/ (after installation)
```

## Step 4: Node.js Application Setup

### In cPanel Node.js Selector
1. Navigate to **Software > Node.js Selector**
2. Click **Create Application**

**Configuration:**
- **Node.js version:** 18.x or higher
- **Application mode:** Production
- **Application root:** `/public_html/hrflow` (adjust path)
- **Application URL:** `your-domain.com/hrflow` or subdomain
- **Application startup file:** `server/index.js`

### Environment Variables in cPanel
Add these in Node.js app environment variables section:
```
DATABASE_URL=postgresql://your_username_hrflow_user:password@localhost:5432/your_username_hrflow
JWT_SECRET=your_secure_jwt_secret_32_chars_minimum
NODE_ENV=production
PORT=3000
```

## Step 5: Installation and Build

### Via SSH (Recommended)
```bash
# Navigate to application directory
cd /home/username/public_html/hrflow

# Install dependencies
npm install --production

# Build the application
npm run build

# Setup database schema
npm run db:push

# Test the application
npm test
```

### Via cPanel Interface
1. In Node.js app settings, click **Install Dependencies**
2. Wait for installation to complete
3. Add custom startup script if needed

## Step 6: Start Application

### Start via cPanel
1. In Node.js application settings
2. Click **Start Application**
3. Monitor logs for any errors

### Start via SSH
```bash
# Start application
npm start

# Or with PM2 for better process management
npm install -g pm2
pm2 start server/index.js --name hrflow
pm2 startup
pm2 save
```

## Step 7: SSL and Domain Configuration

### SSL Certificate
```bash
# In cPanel > SSL/TLS
1. Install SSL certificate (Let's Encrypt recommended)
2. Force HTTPS redirects
3. Update application URLs to use HTTPS
```

### Domain/Subdomain Setup
```bash
# Option 1: Subdomain
# Create subdomain: hrflow.your-domain.com
# Point to application directory

# Option 2: Directory access
# Access via: your-domain.com/hrflow
```

## Step 8: Database Migration and Initial Setup

### Run Database Setup
```bash
# SSH into your server
cd /path/to/hrflow

# Run database migrations
npm run db:push

# Verify database connection
npm run db:check
```

### Initial Data (Optional)
The application will automatically create admin user and sample data on first run.

## Troubleshooting

### Common cPanel Issues

#### 1. Node.js Version Error
```bash
# Check available versions
node --version
npm --version

# Update in cPanel Node.js Selector if needed
```

#### 2. Permission Errors
```bash
# Fix file permissions
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod +x server/index.js
```

#### 3. Database Connection Issues
```bash
# Test database connection
psql -h localhost -U your_username_hrflow_user -d your_username_hrflow

# Check DATABASE_URL format
echo $DATABASE_URL
```

#### 4. Port Already in Use
```bash
# Check running processes
ps aux | grep node

# Kill existing processes
pkill -f node

# Or change PORT in .env
```

#### 5. Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check for missing dependencies
npm audit fix
```

### Log Monitoring

#### Via cPanel
- Check Node.js application logs in cPanel interface
- Monitor error logs in cPanel > Error Logs

#### Via SSH
```bash
# Application logs
npm run logs

# System logs
tail -f /var/log/messages
tail -f ~/.pm2/logs/hrflow-out.log
```

## Performance Optimization

### cPanel Optimizations
```bash
# 1. Enable compression in .htaccess
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 2. Enable caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
</IfModule>
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_payroll_user_month ON payroll(user_id, month, year);
```

## Backup Strategy

### Automated Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /home/username/backups/hrflow_$DATE.sql
tar -czf /home/username/backups/hrflow_files_$DATE.tar.gz /home/username/public_html/hrflow
find /home/username/backups -name "*.sql" -mtime +30 -delete
find /home/username/backups -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# Add to cron jobs in cPanel
# Daily backup at 2 AM: 0 2 * * * /home/username/backup.sh
```

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall (if available)
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Implement rate limiting
- [ ] Regular database backups

## Support and Maintenance

### Regular Maintenance Tasks
```bash
# Weekly maintenance script
#!/bin/bash
# Update dependencies
npm update

# Check for security vulnerabilities  
npm audit

# Restart application
pm2 restart hrflow

# Clean temporary files
npm cache clean --force
```

### Monitoring
- Set up uptime monitoring
- Monitor server resources
- Check application logs regularly
- Monitor database performance