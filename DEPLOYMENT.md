# Numericalz Deployment Guide

## 🚀 Vercel + Supabase Database Deployment (RECOMMENDED)

### Step 1: Add Supabase Integration (EASIEST)

1. **Go to Vercel Marketplace**: https://vercel.com/marketplace/supabase
2. **Click "Add Integration"**
3. **Select your Numericalz project**
4. **Follow setup wizard** - automatically creates database and sets environment variables

### Alternative: Manual Supabase Setup (if Supabase doesn't work)

1. **Sign up for Supabase**: https://console.neon.tech/signup
2. **Create project**: `numericalz-production`
3. **Copy connection string** from dashboard

### Step 2: Set Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```bash
# Database (REQUIRED) - Use NON-POOLED connection for Vercel
DATABASE_URL=postgres://postgres.kgynhondttxvnowlqfeo:YeDmDG3RtC33YzG5@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require

# NextAuth.js (REQUIRED)
NEXTAUTH_SECRET=BceKrnsYrGFFrZ4nrQecYQ1Ul3cge1MLFYzWHgvJdSU=
NEXTAUTH_URL=https://your-vercel-app.vercel.app

# Supabase Configuration (OPTIONAL - for future features)
NEXT_PUBLIC_SUPABASE_URL=https://kgynhondttxvnowlqfeo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneW5ob25kdHR4dm5vd2xxZmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTE2NDgsImV4cCI6MjA2NTY4NzY0OH0.LjzBWUlHLL21cP76ngq2lv3sGOUi-XBfglXVmvPpc_Y

# Companies House API (OPTIONAL)
COMPANIES_HOUSE_API_KEY=your-companies-house-api-key

# Email Configuration (OPTIONAL)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### ⚠️ IMPORTANT: Connection String Notes

**For Vercel deployment, you MUST use the NON-POOLED connection string:**
- ✅ **Correct**: `postgres://...supabase.com:5432/postgres?sslmode=require`
- ❌ **Incorrect**: `postgres://...supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x`

The pooled connection (port 6543) causes "prepared statement already exists" errors in serverless environments.

### Step 3: Deploy Application

1. **Push to GitHub**: `git push origin main`
2. **Vercel Auto-Deploy**: Vercel will automatically deploy
3. **Check Build Logs**: Ensure no errors in deployment

### Step 4: Verify Deployment

1. **Visit your app**: https://your-vercel-app.vercel.app
2. **Check debug endpoint**: https://your-vercel-app.vercel.app/api/debug
3. **Test login**: Use admin credentials

### Step 5: Create Initial Data

After successful deployment, log in with:
- **Email**: admin@numericalz.com
- **Password**: admin123
- **Role**: MANAGER

## 📊 Supabase Database Benefits

- **500MB storage** free (vs 256MB on old Vercel Postgres)
- **2 free databases** per account
- **Native Vercel integration** with automatic setup
- **Built-in Auth, Storage, Realtime** features
- **Auto-scaling** based on usage
- **Built-in connection pooling**
- **No credit card required**

## 🔧 Troubleshooting

### Common Issues

1. **"prepared statement already exists" error**
   - Solution: Use non-pooled connection string (port 5432, not 6543)

2. **Database connection timeout**
   - Check environment variables are set correctly
   - Verify Supabase project is active

3. **Authentication 401 errors**
   - Ensure NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL matches your domain
   - Check admin user exists in database

4. **Build failures**
   - Check all required environment variables are set
   - Verify DATABASE_URL is accessible from Vercel

### Debug Commands

```bash
# Test database connection locally
npx prisma db push

# Generate Prisma client
npx prisma generate

# Check database schema
npx prisma studio
```

## 🚀 Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Database schema deployed
- [ ] Admin user created
- [ ] Authentication working
- [ ] All features tested
- [ ] SSL certificates active
- [ ] Domain configured (if custom)

## 📈 Performance Optimization

### Database
- Use connection pooling (built into Supabase)
- Add database indexes for frequently queried fields
- Monitor query performance

### Application
- Enable Vercel Analytics
- Use Next.js Image optimization
- Implement proper caching headers
- Monitor Core Web Vitals

## 🔒 Security Considerations

- Rotate NEXTAUTH_SECRET regularly
- Use strong passwords for admin accounts
- Enable 2FA when available
- Monitor access logs
- Keep dependencies updated
- Use environment variables for all secrets

---

## 🎯 Quick Start Summary

1. **Set environment variables** in Vercel (use non-pooled DATABASE_URL)
2. **Deploy application** via GitHub push
3. **Verify deployment** at /api/debug endpoint
4. **Login with admin credentials**
5. **Start managing clients and teams**

Your Numericalz Internal Management System is now ready for production use! 🚀 