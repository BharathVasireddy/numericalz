# 🚂 Railway PostgreSQL Setup Guide

## Overview
This guide will help you migrate from Supabase to Railway PostgreSQL for better reliability and performance.

## 📋 Prerequisites
- Railway account (free tier available)
- Current Supabase database access
- Node.js installed locally

## 🚀 Step-by-Step Setup

### 1. Create Railway Account & Database

1. **Sign up**: Go to https://railway.app/
2. **Create new project**: Click "New Project"
3. **Deploy PostgreSQL**: 
   - Click "+ New" 
   - Select "Deploy PostgreSQL"
   - Wait for deployment (usually 1-2 minutes)

### 2. Get Database Connection Details

After deployment, Railway provides these environment variables:
- `PGHOST` - Database host
- `PGPORT` - Database port (usually 5432)
- `PGUSER` - Database username
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name
- `DATABASE_URL` - Complete connection string

**Copy the `DATABASE_URL`** - you'll need it for migration and Vercel setup.

### 3. Set Up Database Schema

Run Prisma migration to create the schema in Railway:

```bash
# Set Railway database URL temporarily
export DATABASE_URL="your-railway-database-url"

# Run Prisma migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 4. Migrate Data from Supabase (Optional)

If you have existing data in Supabase:

```bash
# Set both database URLs
export SUPABASE_DATABASE_URL="your-current-supabase-url"
export RAILWAY_DATABASE_URL="your-railway-database-url"

# Run migration script
node migrate-to-railway.js
```

### 5. Update Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL` with your Railway connection string:
   ```
   DATABASE_URL="postgresql://username:password@host:port/database"
   ```
3. **Redeploy** your Vercel application

### 6. Test the Connection

```bash
# Test locally with Railway database
export DATABASE_URL="your-railway-database-url"
npm run dev

# Test the debug endpoint
curl http://localhost:3000/api/debug
```

## 💰 Railway Pricing

### Free Tier (Perfect for Development)
- **$0/month**
- 512 MB RAM
- 1 GB disk
- Shared CPU
- $5 credit included

### Pro Plan (Recommended for Production)
- **$20/month** per seat
- Up to 32 GB RAM
- Up to 100 GB disk
- Dedicated CPU
- Priority support

## 🔧 Database Configuration

Railway PostgreSQL comes with:
- ✅ **SSL enabled** by default
- ✅ **Automatic backups**
- ✅ **Connection pooling** support
- ✅ **High availability**
- ✅ **Monitoring** dashboard

## 🚀 Performance Benefits

### Railway vs Supabase Free Tier
- **3-5x faster** query performance
- **Better connection reliability**
- **No connection limits**
- **Dedicated resources**
- **Better uptime** (99.9% SLA)

## 🔍 Monitoring & Maintenance

### Railway Dashboard Features
- **Real-time metrics**: CPU, RAM, disk usage
- **Query performance**: Slow query detection
- **Connection monitoring**: Active connections
- **Backup management**: Automated daily backups

### Useful Commands
```bash
# Connect to Railway database
psql $DATABASE_URL

# View database size
SELECT pg_size_pretty(pg_database_size('your_db_name'));

# View active connections
SELECT count(*) FROM pg_stat_activity;

# View table sizes
SELECT schemaname,tablename,pg_size_pretty(size) as size
FROM (
  SELECT schemaname,tablename,pg_total_relation_size(schemaname||'.'||tablename) as size
  FROM pg_tables WHERE schemaname = 'public'
) s ORDER BY size DESC;
```

## 🔒 Security Features

- **SSL/TLS encryption** in transit
- **VPC isolation** for Pro plans
- **IP allowlisting** available
- **Automated security updates**
- **SOC 2 compliance**

## 🆘 Troubleshooting

### Common Issues

1. **Connection timeout**
   ```bash
   # Check if database is running
   curl -I https://your-railway-app.railway.app/
   ```

2. **Migration fails**
   ```bash
   # Reset database and re-run migrations
   npx prisma migrate reset
   npx prisma migrate deploy
   ```

3. **Performance issues**
   ```bash
   # Check database metrics in Railway dashboard
   # Consider upgrading to Pro plan for dedicated resources
   ```

## 📞 Support

- **Railway Discord**: https://discord.gg/railway
- **Documentation**: https://docs.railway.app/
- **Status Page**: https://status.railway.app/

## ✅ Success Checklist

- [ ] Railway account created
- [ ] PostgreSQL database deployed
- [ ] Schema migrated with Prisma
- [ ] Data migrated from Supabase (if applicable)
- [ ] Vercel environment variables updated
- [ ] Application tested and working
- [ ] Performance monitoring set up

## 🎉 Next Steps

After successful migration:

1. **Monitor performance** in Railway dashboard
2. **Set up alerts** for database metrics
3. **Schedule regular backups** (automated by default)
4. **Consider upgrading** to Pro plan for production workloads
5. **Remove Supabase database** once everything is working

---

## 📊 Migration Summary

| Aspect | Supabase Free | Railway Free | Railway Pro |
|--------|---------------|--------------|-------------|
| **Performance** | Variable | Good | Excellent |
| **Reliability** | 95% uptime | 99% uptime | 99.9% uptime |
| **Connection Limits** | 60 concurrent | No limits | No limits |
| **Storage** | 500 MB | 1 GB | Up to 100 GB |
| **Support** | Community | Community | Priority |
| **Cost** | Free | Free | $20/month |

Railway provides a much more reliable and performant database solution for your Numericalz application! 