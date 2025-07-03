# HRFlow Deployment Guide

## Database Setup Examples

### 1. Local PostgreSQL Setup

#### Option A: Using Docker (Recommended)
```bash
# Create docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hrflow
      POSTGRES_USER: hrflow_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - hrflow_data:/var/lib/postgresql/data

volumes:
  hrflow_data:

# Start the database
docker-compose up -d

# Your DATABASE_URL would be:
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow
```

#### Option B: Native PostgreSQL Installation

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE hrflow;
CREATE USER hrflow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hrflow TO hrflow_user;
\q

# Your DATABASE_URL would be:
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow
```

**macOS (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql
brew services start postgresql

# Create database and user
createdb hrflow
psql hrflow
CREATE USER hrflow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hrflow TO hrflow_user;
\q

# Your DATABASE_URL would be:
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow
```

**Windows:**
```bash
# Download and install PostgreSQL from https://www.postgresql.org/download/windows/
# During installation, set a password for the postgres user
# After installation, use pgAdmin or psql command line:

# Using psql:
psql -U postgres
CREATE DATABASE hrflow;
CREATE USER hrflow_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hrflow TO hrflow_user;
\q

# Your DATABASE_URL would be:
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow
```

### 2. Cloud Database Setup

#### Neon (Recommended for production)
```bash
# Sign up at https://neon.tech
# Create a new project
# Copy the connection string from the dashboard

# Example DATABASE_URL:
DATABASE_URL=postgresql://username:password@ep-example-123456.us-east-1.aws.neon.tech/hrflow?sslmode=require
```

#### Supabase
```bash
# Sign up at https://supabase.com
# Create a new project
# Go to Settings > Database
# Copy the connection string

# Example DATABASE_URL:
DATABASE_URL=postgresql://postgres:your_password@db.project-ref.supabase.co:5432/postgres
```

#### Railway
```bash
# Sign up at https://railway.app
# Create new project > Add PostgreSQL
# Copy the connection string from the variables tab

# Example DATABASE_URL:
DATABASE_URL=postgresql://postgres:password@containers-us-west-12.railway.app:5432/railway
```

## Local Development Setup

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd hrflow

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database URL
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow
```

### 2. Database Migration
```bash
# Push database schema
npm run db:push

# Start development server
npm run dev
```

### 3. Environment Variables (.env)
```env
# Database
DATABASE_URL=postgresql://hrflow_user:your_secure_password@localhost:5432/hrflow

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars

# Application
NODE_ENV=development
PORT=5000

# Optional: Google Maps API (for location features)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## cPanel Deployment Setup

### 1. cPanel Requirements
- Node.js support (14+ required)
- PostgreSQL database access
- SSH access (recommended)

### 2. Database Setup in cPanel
```bash
# In cPanel > MySQL Databases (or PostgreSQL if available)
# 1. Create database: your_username_hrflow
# 2. Create user: your_username_hrflow_user
# 3. Set password and assign user to database
# 4. Note the database host (usually localhost or specific hostname)

# Your DATABASE_URL:
DATABASE_URL=postgresql://your_username_hrflow_user:password@localhost:5432/your_username_hrflow
```

### 3. File Upload and Setup
```bash
# 1. Upload project files to public_html (or subdirectory)
# 2. Create .env file in root directory:

DATABASE_URL=postgresql://your_username_hrflow_user:password@localhost:5432/your_username_hrflow
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
NODE_ENV=production
PORT=3000

# 3. Install dependencies via SSH or cPanel Terminal
npm install --production

# 4. Build the application
npm run build

# 5. Push database schema
npm run db:push
```

### 4. cPanel Node.js App Configuration
```bash
# In cPanel > Node.js Applications:
# 1. Create New Application
# 2. Set Node.js version: 18.x or higher
# 3. Application mode: Production
# 4. Application root: /public_html (or your subdirectory)
# 5. Application URL: your-domain.com (or subdomain)
# 6. Application startup file: server/index.js
```

### 5. Environment Variables in cPanel
```bash
# In Node.js app settings, add environment variables:
DATABASE_URL=postgresql://your_username_hrflow_user:password@localhost:5432/your_username_hrflow
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
NODE_ENV=production
```

### 6. Start the Application
```bash
# Click "Start Application" in cPanel Node.js interface
# Or via SSH:
npm start
```

## Production Deployment (General)

### 1. Build Process
```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Setup database
npm run db:push

# Start production server
npm start
```

### 2. PM2 Process Manager (Linux/VPS)
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'hrflow',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Default Login Credentials

After successful deployment, use these credentials to access the system:

### HR Admin Account
- **Username:** admin
- **Password:** admin123
- **Role:** HR Manager

### Employee Accounts
- **Username:** john.smith | **Password:** password123
- **Username:** sarah.johnson | **Password:** password123  
- **Username:** mike.brown | **Password:** password123

**Important:** Change these default passwords immediately after first login!

## Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database credentials
   - Ensure database server is running

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing Node.js processes

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Update Node.js to version 18+

4. **Permission Errors (cPanel)**
   - Check file permissions (755 for directories, 644 for files)
   - Ensure Node.js app has proper access rights

### Logs and Debugging
```bash
# View application logs
npm run logs

# Database connection test
npm run db:check

# PM2 logs (if using PM2)
pm2 logs hrflow
```

## Security Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Keep dependencies updated
- [ ] Monitor application logs