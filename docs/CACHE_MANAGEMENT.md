# Cache Management Guide

## Overview

The Numericalz system uses a **balanced caching strategy** that provides both performance and real-time updates. This guide explains how to manage caches effectively in both development and production environments.

## Cache Strategy

### Cache Levels
1. **Application Cache** - In-memory cache with smart TTL
2. **HTTP Cache** - Browser and CDN caching with stale-while-revalidate
3. **Database Query Cache** - Optimized database connection pooling

### Cache TTL (Time To Live) Settings

| Data Type | TTL | Purpose |
|-----------|-----|---------|
| Dashboard Data | 30 seconds | Real-time updates for critical metrics |
| Client Counts | 30 seconds | Real-time client statistics |
| User Counts | 1 minute | User workload distribution |
| General Clients | 1 minute | Client listings and searches |
| General Users | 2 minutes | User management data |
| Static Data | 5 minutes | Reference data and settings |

## Cache Invalidation

### Automatic Invalidation
- Cache entries automatically expire based on TTL
- Cleanup runs every 2 minutes
- Stale-while-revalidate ensures smooth user experience

### Manual Invalidation

#### 1. API Endpoint (Recommended for Production)
```bash
# Clear all caches
curl -X POST https://your-domain.com/api/dashboard/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"scope": "all"}'

# Clear specific cache types
curl -X POST https://your-domain.com/api/dashboard/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"scope": "dashboard"}'
```

#### 2. NPM Scripts (Development & Production)
```bash
# Clear all caches
npm run cache:invalidate

# Clear only dashboard caches
npm run cache:invalidate-dashboard

# Clear only client caches  
npm run cache:invalidate-clients
```

#### 3. Programmatic Invalidation
```typescript
import { invalidateDashboardCache, CacheHelpers } from '@/lib/performance-cache'

// Clear specific user dashboard
invalidateDashboardCache('user-id')

// Clear all dashboards
invalidateDashboardCache()

// Clear client caches
CacheHelpers.clients.invalidate()

// Clear user caches
CacheHelpers.users.invalidate()
```

## Production Deployment Process

### Step 1: Deploy Code Changes
```bash
# Deploy your changes to production
git push origin main
```

### Step 2: Invalidate Caches (Critical)
```bash
# After deployment, clear all caches to show new changes immediately
npm run cache:invalidate
```

### Step 3: Verify Updates
- Check dashboard shows latest data
- Verify API responses are current
- Monitor performance metrics

## Cache Monitoring

### Get Cache Statistics
```bash
# View current cache status
curl https://your-domain.com/api/dashboard/invalidate-cache
```

### Response Example
```json
{
  "success": true,
  "cacheStats": {
    "size": 15,
    "keys": [
      "dashboard:partner:user123",
      "clients:page:active=true",
      "users:all"
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Problem: Production Shows Old Data
**Solution:**
```bash
# Force cache invalidation
npm run cache:invalidate

# Or use API directly
curl -X POST https://your-production-url.com/api/dashboard/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"scope": "all"}'
```

### Problem: Dashboard Updates Slowly
**Cause:** Aggressive caching in production

**Solution:**
1. Check cache TTL settings (should be 30 seconds for dashboard)
2. Verify stale-while-revalidate is working
3. Clear specific dashboard cache:
```bash
npm run cache:invalidate-dashboard
```

### Problem: High Database Load
**Cause:** Cache not working effectively

**Solution:**
1. Check cache hit rates in logs
2. Verify TTL settings are appropriate
3. Monitor cache cleanup frequency

## Cache Headers Explained

### Dashboard API Response Headers
```
Cache-Control: public, max-age=30, stale-while-revalidate=15
X-Cache-Status: dashboard-optimized
```

**Meaning:**
- `max-age=30`: Cache for 30 seconds
- `stale-while-revalidate=15`: Serve stale data while refreshing for 15 seconds
- `public`: Can be cached by browsers and CDNs

### Client API Response Headers
```
Cache-Control: public, max-age=60, stale-while-revalidate=30
```

**Meaning:**
- Fresh data for 1 minute
- Stale data acceptable for additional 30 seconds while refreshing

## Best Practices

### Development
1. Use shorter cache times for active development
2. Clear cache after major data changes
3. Monitor cache performance in logs

### Production
1. **Always invalidate cache after deployments**
2. Use API endpoint for automated invalidation
3. Monitor cache hit rates and performance
4. Set up alerts for cache-related issues

### Code Changes
1. Update cache keys when data structure changes
2. Adjust TTL based on data update frequency
3. Test cache invalidation in staging

## Environment Variables

```env
# Cache configuration (optional)
CACHE_TTL_DASHBOARD=30000      # 30 seconds
CACHE_TTL_CLIENTS=60000        # 1 minute
CACHE_TTL_USERS=120000         # 2 minutes

# Production URL for cache invalidation
NEXTAUTH_URL=https://your-domain.com
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Deploy to Production
  run: |
    # Deploy code
    npm run build
    npm run deploy
    
    # Invalidate caches
    npm run cache:invalidate
```

### Manual Deployment Checklist
- [ ] Code deployed successfully
- [ ] Database migrations applied
- [ ] **Cache invalidated** (Critical!)
- [ ] Dashboard showing latest data
- [ ] Performance metrics normal

## Cache Performance Impact

### Before Optimization
- API Response Time: 8+ seconds
- Database Load: High
- User Experience: Poor

### After Optimization
- First Load: 2-3 seconds (database query)
- Cached Load: 50-100ms (memory cache)
- Real-time Updates: 30 seconds maximum delay
- User Experience: Excellent

## Monitoring Commands

```bash
# Check cache status
npm run cache:stats

# Monitor performance
npm run performance:monitor

# View cache keys
curl https://your-domain.com/api/dashboard/invalidate-cache

# Test cache invalidation
npm run cache:invalidate && echo "Cache cleared successfully"
```

## Summary

The new caching system provides:
- ✅ **Real-time updates** (30-second maximum delay)
- ✅ **High performance** (50-100ms cached responses)
- ✅ **Production-ready** cache invalidation
- ✅ **Monitoring and debugging** tools
- ✅ **Automated cleanup** and maintenance

**Remember:** Always run `npm run cache:invalidate` after production deployments to ensure users see the latest changes immediately! 