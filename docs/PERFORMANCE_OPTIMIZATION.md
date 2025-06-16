# Performance Optimization - Numericalz Internal Application

## ⚡ Overview

This document outlines performance optimization strategies for the Numericalz Internal Management System, ensuring fast load times, efficient resource usage, and excellent user experience.

## 🖥️ Frontend Performance

### Next.js Optimization
```typescript
// next.config.js
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  swcMinify: true,
  compress: true
}
```

### Code Splitting & Lazy Loading
```typescript
// components/LazyComponents.tsx
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load heavy components
const AnalyticsDashboard = dynamic(() => import('./AnalyticsDashboard'), {
  loading: () => <div>Loading analytics...</div>,
  ssr: false
})

const ChartComponent = dynamic(() => import('./Chart'), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
  ssr: false
})

// Route-based code splitting
const ClientManagement = dynamic(() => import('../pages/ClientManagement'))
```

### Image Optimization
```typescript
// components/OptimizedImage.tsx
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
}

export function OptimizedImage({ 
  src, 
  alt, 
  width = 400, 
  height = 300, 
  priority = false 
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AoGoXjDNa0LblahSmKIFGr7VBOyYxN6mPUE3X/9k="
      className="rounded-lg"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
```

### React Performance
```typescript
// hooks/useOptimizedCallback.ts
import { useCallback, useMemo } from 'react'

export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps)
}

// components/OptimizedClientList.tsx
import { memo, useMemo } from 'react'

interface Client {
  id: string
  name: string
  status: string
}

interface ClientListProps {
  clients: Client[]
  onClientSelect: (id: string) => void
}

export const ClientList = memo<ClientListProps>(({ clients, onClientSelect }) => {
  const sortedClients = useMemo(
    () => clients.sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  )

  return (
    <div className="space-y-2">
      {sortedClients.map(client => (
        <ClientCard 
          key={client.id} 
          client={client} 
          onClick={onClientSelect}
        />
      ))}
    </div>
  )
})
```

### Bundle Analysis
```bash
# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# Add to package.json
"analyze": "cross-env ANALYZE=true next build"

# Run analysis
npm run analyze
```

## 🔧 Backend Performance

### API Route Optimization
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedClients = unstable_cache(
  async (userId: string) => {
    return await prisma.client.findMany({
      where: { assignedUserId: userId },
      select: {
        id: true,
        companyName: true,
        companyNumber: true,
        contactName: true,
        isActive: true
      }
    })
  },
  ['clients'],
  { revalidate: 300 } // 5 minutes
)

// app/api/clients/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const clients = await getCachedClients(session.user.id)
    return Response.json({ success: true, data: clients })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
```

### Database Connection Pooling
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 🗄️ Database Optimization

### Query Optimization
```typescript
// Inefficient - N+1 query problem
const clients = await prisma.client.findMany()
const clientsWithTasks = await Promise.all(
  clients.map(client => 
    prisma.task.findMany({ where: { clientId: client.id } })
  )
)

// ✅ Efficient - Single query with includes
const clientsWithTasks = await prisma.client.findMany({
  include: {
    tasks: {
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true
      }
    },
    _count: {
      select: {
        tasks: true
      }
    }
  }
})
```

### Database Indexes
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_clients_assigned_user ON clients(assigned_user_id);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Composite indexes for complex queries
CREATE INDEX idx_tasks_client_status ON tasks(client_id, status);
CREATE INDEX idx_tasks_assigned_due ON tasks(assigned_user_id, due_date);
```

### Query Performance Monitoring
```typescript
// lib/query-monitor.ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

prisma.$on('query', (e: any) => {
  if (e.duration > 100) { // Log slow queries (>100ms)
    console.warn(`Slow query detected:`, {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params
    })
  }
})
```

## 📊 React Query Optimization

### Efficient Data Fetching
```typescript
// hooks/useClients.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useClient(clientId: string) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch client')
      return response.json()
    },
    initialData: () => {
      // Use cached data if available
      const clients = queryClient.getQueryData(['clients'])
      return clients?.find((client: any) => client.id === clientId)
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### Optimistic Updates
```typescript
// hooks/useUpdateClient.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) throw new Error('Failed to update client')
      return response.json()
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['clients'] })
      
      // Snapshot previous value
      const previousClients = queryClient.getQueryData(['clients'])
      
      // Optimistically update
      queryClient.setQueryData(['clients'], (old: any) => 
        old?.map((client: any) => 
          client.id === id ? { ...client, ...data } : client
        )
      )
      
      return { previousClients }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['clients'], context?.previousClients)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    }
  })
}
```

## 🎨 UI Performance

### Virtual Scrolling
```typescript
// components/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window'

interface VirtualizedListProps {
  items: any[]
  itemHeight: number
  containerHeight: number
  renderItem: ({ index, style }: { index: number, style: any }) => JSX.Element
}

export function VirtualizedList({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem 
}: VirtualizedListProps) {
  return (
    <List
      height={containerHeight}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
    >
      {renderItem}
    </List>
  )
}
```

### Debounced Search
```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// components/SearchInput.tsx
export function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search clients..."
      className="w-full px-3 py-2 border rounded-md"
    />
  )
}
```

## 📈 Performance Monitoring

### Web Vitals Tracking
```typescript
// lib/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log(metric)
}

export function trackWebVitals() {
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    trackWebVitals()
  }, [])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Performance Metrics Dashboard
```typescript
// components/PerformanceMetrics.tsx
export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    apiResponseTime: 0
  })

  useEffect(() => {
    // Measure page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
    
    // Measure component render time
    const renderStart = performance.now()
    setMetrics(prev => ({ ...prev, loadTime }))
    const renderTime = performance.now() - renderStart

    setMetrics(prev => ({ ...prev, renderTime }))
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard title="Load Time" value={`${metrics.loadTime}ms`} />
      <MetricCard title="Render Time" value={`${metrics.renderTime}ms`} />
      <MetricCard title="API Response" value={`${metrics.apiResponseTime}ms`} />
    </div>
  )
}
```

## 🔧 Build Optimization

### Webpack Bundle Optimization
```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize for production
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
  experimental: {
    optimizeCss: true,
    swcMinify: true,
  }
})
```

## 📊 Performance Benchmarks

### Target Metrics
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **API Response Time**: < 200ms average
- **Database Query Time**: < 50ms average

### Performance Testing
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# Load testing with k6
npm install -g k6
k6 run performance/load-test.js

# Bundle size monitoring
npm run analyze
```

## 🚀 Deployment Optimization

### CDN Configuration
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.numericalz.com'],
    loader: 'custom',
    loaderFile: './lib/imageLoader.js'
  },
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.numericalz.com' 
    : undefined
}
```

### Caching Strategy
```typescript
// app/api/clients/route.ts
export async function GET() {
  const data = await getClients()
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  })
}
```

## 📚 Performance Best Practices

### Development Guidelines
- **Measure first**: Use profiling tools before optimizing
- **Focus on critical path**: Optimize loading of above-the-fold content
- **Lazy load**: Non-critical resources and components
- **Optimize images**: Use Next.js Image component
- **Minimize JavaScript**: Remove unused code and dependencies
- **Cache strategically**: Use appropriate caching strategies
- **Monitor continuously**: Track performance metrics over time

### Common Performance Pitfalls
- Loading large libraries for small features
- Not implementing proper caching
- Ignoring bundle size growth
- Over-fetching data from APIs
- Not optimizing database queries
- Blocking the main thread with heavy computations

---

**Remember**: Performance optimization is an ongoing process. Regular monitoring, profiling, and optimization are essential for maintaining fast, responsive applications. 