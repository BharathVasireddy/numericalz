# Numericalz Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying the Numericalz Internal Management System to production, including environment setup, security configuration, monitoring, and maintenance procedures.

## 🚀 Deployment Options

### Recommended: Vercel + PlanetScale + Resend

**Advantages:**
- Easy deployment and scaling
- Built-in CI/CD with GitHub integration
- Managed database with automatic backups
- Professional email delivery service
- Cost-effective for small to medium teams

### Alternative: Digital Ocean + PostgreSQL

**Advantages:**
- Full server control
- Custom configurations
- Potentially lower costs at scale
- Self-hosted database management

## 📋 Pre-Deployment Checklist

### Code Preparation
- [ ] All tests passing (`npm run test`)
- [ ] Build successful (`npm run build`)
- [ ] Environment variables documented
- [ ] Security review completed
- [ ] Performance optimization done
- [ ] Database migrations ready

### Infrastructure Requirements
- [ ] Domain name registered
- [ ] SSL certificate available
- [ ] Email service configured
- [ ] Database hosting selected
- [ ] Monitoring tools setup
- [ ] Backup strategy planned

## 🛠️ Production Environment Setup

### Option 1: Vercel Deployment

#### Step 1: Database Setup (PlanetScale)

1. **Create PlanetScale Account**
   ```bash
   # Install PlanetScale CLI
   npm install -g @planetscale/cli
   
   # Login to PlanetScale
   pscale auth login
   ```

2. **Create Database**
   ```bash
   # Create new database
   pscale database create numericalz-prod
   
   # Create production branch
   pscale branch create numericalz-prod production
   
   # Get connection string
   pscale connect numericalz-prod production --port 3309
   ```

3. **Configure Environment Variables**
   ```env
   # Database
   DATABASE_URL="mysql://username:password@host:port/database?sslaccept=strict"
   
   # NextAuth
   NEXTAUTH_SECRET="your-super-secret-32-char-string"
   NEXTAUTH_URL="https://numericalz.yourdomain.com"
   
   # Companies House
   COMPANIES_HOUSE_API_KEY="your-ch-api-key"
   COMPANIES_HOUSE_BASE_URL="https://api.company-information.service.gov.uk"
   
   # Email (Resend)
   RESEND_API_KEY="your-resend-api-key"
   RESEND_FROM_EMAIL="noreply@yourdomain.com"
   
   # Application
   NODE_ENV="production"
   APP_NAME="Numericalz Internal"
   APP_URL="https://numericalz.yourdomain.com"
   ```

#### Step 2: Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   # Login to Vercel
   vercel login
   
   # Deploy (first time)
   vercel --prod
   
   # Set environment variables
   vercel env add DATABASE_URL production
   vercel env add NEXTAUTH_SECRET production
   # ... add all environment variables
   ```

3. **Configure Custom Domain**
   ```bash
   # Add custom domain
   vercel domains add numericalz.yourdomain.com
   
   # Configure DNS
   # Add CNAME record: numericalz -> cname.vercel-dns.com
   ```

#### Step 3: Database Migration

```bash
# Run migrations on production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed production data (if needed)
npx prisma db seed
```

### Option 2: Digital Ocean Deployment

#### Step 1: Server Setup

1. **Create Droplet**
   - OS: Ubuntu 22.04 LTS
   - Size: 2 GB RAM / 2 CPUs minimum
   - Add SSH keys for secure access

2. **Initial Server Configuration**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib -y
   ```

#### Step 2: Application Deployment

1. **Clone Repository**
   ```bash
   # Clone your repository
   git clone https://github.com/your-org/numericalz-internal.git
   cd numericalz-internal
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   ```

2. **Configure Environment**
   ```bash
   # Create production environment file
   cp .env.example .env.production
   
   # Edit environment variables
   nano .env.production
   ```

3. **Database Setup**
   ```bash
   # Create database user
   sudo -u postgres createuser --interactive
   
   # Create database
   sudo -u postgres createdb numericalz_prod
   
   # Run migrations
   npx prisma migrate deploy
   ```

4. **Start Application with PM2**
   ```bash
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << EOF
   module.exports = {
     apps: [
       {
         name: 'numericalz',
         script: 'npm',
         args: 'start',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         },
         instances: 'max',
         exec_mode: 'cluster'
       }
     ]
   }
   EOF
   
   # Start application
   pm2 start ecosystem.config.js
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

#### Step 3: Nginx Configuration

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/numericalz << EOF
server {
    listen 80;
    server_name numericalz.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/numericalz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d numericalz.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## 🔐 Security Configuration

### Application Security

1. **Environment Variables**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32  # For NEXTAUTH_SECRET
   openssl rand -hex 16     # For database passwords
   ```

2. **Rate Limiting** (already configured in app)
   - API endpoints: 100 requests/minute per user
   - Authentication: 5 requests/minute per IP
   - Email sending: 10 emails/minute per user

3. **CORS Configuration**
   ```javascript
   // next.config.js
   module.exports = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             {
               key: 'Access-Control-Allow-Origin',
               value: 'https://numericalz.yourdomain.com'
             }
           ]
         }
       ]
     }
   }
   ```

### Database Security

1. **PostgreSQL Configuration**
   ```sql
   -- Create dedicated database user
   CREATE USER numericalz_app WITH PASSWORD 'secure_password';
   
   -- Grant minimal required permissions
   GRANT CONNECT ON DATABASE numericalz_prod TO numericalz_app;
   GRANT USAGE ON SCHEMA public TO numericalz_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO numericalz_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO numericalz_app;
   ```

2. **Connection Security**
   ```bash
   # Configure PostgreSQL for SSL
   sudo nano /etc/postgresql/14/main/postgresql.conf
   # ssl = on
   # ssl_cert_file = 'server.crt'
   # ssl_key_file = 'server.key'
   ```

### Server Security (Digital Ocean)

1. **Firewall Configuration**
   ```bash
   # Configure UFW firewall
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **Fail2Ban Setup**
   ```bash
   # Install and configure Fail2Ban
   sudo apt install fail2ban -y
   
   # Create custom configuration
   sudo tee /etc/fail2ban/jail.local << EOF
   [DEFAULT]
   bantime = 3600
   findtime = 600
   maxretry = 3
   
   [sshd]
   enabled = true
   
   [nginx-http-auth]
   enabled = true
   EOF
   
   sudo systemctl restart fail2ban
   ```

## 📊 Monitoring and Logging

### Application Monitoring

1. **Vercel Analytics** (if using Vercel)
   ```javascript
   // app/layout.tsx
   import { Analytics } from '@vercel/analytics/react'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     )
   }
   ```

2. **Error Tracking with Sentry**
   ```bash
   npm install @sentry/nextjs
   ```
   
   ```javascript
   // sentry.client.config.js
   import * as Sentry from '@sentry/nextjs'
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   })
   ```

3. **Performance Monitoring**
   ```javascript
   // lib/monitoring.ts
   export function trackPageView(page: string) {
     if (typeof window !== 'undefined' && window.gtag) {
       window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
         page_title: page,
       })
     }
   }
   ```

### Database Monitoring

1. **PlanetScale Insights** (if using PlanetScale)
   - Built-in query performance monitoring
   - Connection pool monitoring
   - Automatic scaling insights

2. **PostgreSQL Monitoring** (if self-hosted)
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000;
   SELECT pg_reload_conf();
   
   -- Monitor slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

### Server Monitoring (Digital Ocean)

1. **System Monitoring**
   ```bash
   # Install htop for system monitoring
   sudo apt install htop -y
   
   # Monitor PM2 processes
   pm2 monit
   
   # Check application logs
   pm2 logs numericalz
   ```

2. **Log Rotation**
   ```bash
   # Configure log rotation
   sudo tee /etc/logrotate.d/numericalz << EOF
   /var/log/numericalz/*.log {
     daily
     missingok
     rotate 14
     compress
     notifempty
     create 0644 www-data www-data
   }
   EOF
   ```

## 🔄 Backup Strategy

### Database Backups

1. **PlanetScale** (Automatic)
   - Daily automated backups
   - Point-in-time recovery
   - Backup retention: 30 days

2. **PostgreSQL** (Manual Setup)
   ```bash
   # Create backup script
   sudo tee /usr/local/bin/backup-numericalz.sh << EOF
   #!/bin/bash
   BACKUP_DIR="/var/backups/numericalz"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Create backup directory
   mkdir -p $BACKUP_DIR
   
   # Create database backup
   sudo -u postgres pg_dump numericalz_prod > $BACKUP_DIR/numericalz_$DATE.sql
   
   # Compress backup
   gzip $BACKUP_DIR/numericalz_$DATE.sql
   
   # Remove backups older than 30 days
   find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
   EOF
   
   # Make script executable
   sudo chmod +x /usr/local/bin/backup-numericalz.sh
   
   # Schedule daily backups
   sudo crontab -e
   # Add: 0 2 * * * /usr/local/bin/backup-numericalz.sh
   ```

### Application Backups

1. **Code Repository**
   - Ensure all code is committed to Git
   - Use GitHub/GitLab for redundancy
   - Tag releases for easy rollback

2. **Configuration Backups**
   ```bash
   # Backup environment variables
   cp .env.production .env.production.backup.$(date +%Y%m%d)
   
   # Backup Nginx configuration
   sudo cp /etc/nginx/sites-available/numericalz /etc/nginx/sites-available/numericalz.backup.$(date +%Y%m%d)
   ```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

1. **Weekly Tasks**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Restart application (zero downtime)
   pm2 reload numericalz
   
   # Check application health
   curl -f https://numericalz.yourdomain.com/api/health || echo "Health check failed"
   ```

2. **Monthly Tasks**
   ```bash
   # Update Node.js dependencies
   npm audit
   npm update
   
   # Clean up old logs
   sudo journalctl --vacuum-time=30d
   
   # Verify SSL certificate
   sudo certbot certificates
   ```

3. **Quarterly Tasks**
   - Security audit and penetration testing
   - Performance optimization review
   - Backup restoration testing
   - User access review

### Troubleshooting Common Issues

1. **Application Won't Start**
   ```bash
   # Check PM2 status
   pm2 status
   
   # View application logs
   pm2 logs numericalz --lines 100
   
   # Restart application
   pm2 restart numericalz
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npx prisma db push --preview-feature
   
   # Check database status
   sudo systemctl status postgresql
   
   # Restart database
   sudo systemctl restart postgresql
   ```

3. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   
   # Find memory-intensive processes
   ps aux --sort=-%mem | head
   
   # Restart application if needed
   pm2 restart numericalz
   ```

## 🚀 Scaling Considerations

### Horizontal Scaling

1. **Vercel** (Automatic)
   - Automatic scaling based on traffic
   - Edge caching for static assets
   - Serverless function scaling

2. **Digital Ocean** (Manual)
   ```bash
   # Add load balancer
   # Create multiple droplets
   # Configure Nginx load balancing
   
   upstream numericalz_backend {
       server 10.0.0.1:3000;
       server 10.0.0.2:3000;
       server 10.0.0.3:3000;
   }
   
   server {
       location / {
           proxy_pass http://numericalz_backend;
       }
   }
   ```

### Database Scaling

1. **Read Replicas**
   ```javascript
   // lib/db.ts
   const readDb = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_READ_URL
       }
     }
   })
   
   const writeDb = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_WRITE_URL
       }
     }
   })
   ```

2. **Connection Pooling**
   ```javascript
   // lib/db.ts
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL + '?connection_limit=5&pool_timeout=20'
       }
     }
   })
   ```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security review completed
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] SSL certificate ready
- [ ] Monitoring tools configured
- [ ] Backup strategy implemented

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify all functionality
- [ ] Check performance metrics
- [ ] Monitor error rates

### Post-Deployment
- [ ] User acceptance testing
- [ ] Performance monitoring active
- [ ] Error tracking working
- [ ] Backup verification
- [ ] Team notification sent
- [ ] Documentation updated

## 🆘 Emergency Procedures

### Rollback Process

1. **Vercel Rollback**
   ```bash
   # List deployments
   vercel list
   
   # Rollback to previous deployment
   vercel rollback [deployment-url]
   ```

2. **Digital Ocean Rollback**
   ```bash
   # Stop current version
   pm2 stop numericalz
   
   # Checkout previous version
   git checkout [previous-tag]
   npm install
   npm run build
   
   # Start application
   pm2 start numericalz
   ```

### Incident Response

1. **Critical System Down**
   - Check application logs
   - Verify database connectivity
   - Check external service status
   - Implement emergency maintenance page
   - Communicate with stakeholders

2. **Data Breach Response**
   - Immediately rotate all secrets
   - Review access logs
   - Notify affected users
   - Document incident details
   - Implement additional security measures

---

This deployment guide ensures a secure, scalable, and maintainable production environment for the Numericalz Internal Management System. 