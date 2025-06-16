# Numericalz Deployment Guide

## 🚀 Vercel + Neon Database Deployment

### Step 1: Create Neon Database (FREE)

1. **Sign up for Neon**: https://console.neon.tech/signup
2. **Create project**: `numericalz-production`
3. **Copy connection string** from dashboard

### Step 2: Set Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require

# NextAuth.js (REQUIRED)
NEXTAUTH_SECRET=BceKrnsYrGFFrZ4nrQecYQ1Ul3cge1MLFYzWHgvJdSU=
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# Companies House API (OPTIONAL)
COMPANIES_HOUSE_API_KEY=your-companies-house-api-key

# Email Configuration (OPTIONAL)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 3: Database Migration

After setting environment variables, Vercel will automatically:
1. Install dependencies
2. Generate Prisma client
3. Run database migrations

### Step 4: Create Initial Admin User

After successful deployment, you'll need to create an admin user directly in the database:

```sql
INSERT INTO users (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin-user-id',
  'admin@numericalz.com',
  'Admin User',
  '$2b$10$hashed-password-here',
  'MANAGER',
  true,
  NOW(),
  NOW()
);
```

### Step 5: Verify Deployment

1. Visit your Vercel app URL
2. Try logging in with admin credentials
3. Check that all features work correctly

## 🔧 Troubleshooting

### Build Errors
- Ensure all environment variables are set
- Check Prisma schema is valid for PostgreSQL
- Verify Neon database is accessible

### Runtime Errors
- Check Vercel function logs
- Verify database connection string
- Ensure NextAuth secret is set

## 📊 Neon Database Benefits

- **512MB storage** free (vs 256MB on old Vercel Postgres)
- **191.9 compute hours** free (vs 60 hours)
- **Instant branching** for development
- **Auto-scaling** based on usage
- **Built-in connection pooling**

## 🔄 Development Workflow

1. **Production branch**: Main database for live app
2. **Development branch**: For testing new features
3. **Feature branches**: Create as needed for specific features

Use Neon CLI to manage branches:
```bash
npm install -g neonctl
neon auth
neon branches list
neon branches create feature-branch --parent production
``` 