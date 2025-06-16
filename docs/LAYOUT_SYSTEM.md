# Numericalz Standardized Layout System

## 🎯 Overview

The Numericalz Internal Management System uses a standardized layout system to ensure consistent spacing, padding, and content width across all pages. This system eliminates layout inconsistencies and provides a professional, cohesive user experience.

## 🚫 CRITICAL RULES

### ❌ NEVER Use These Deprecated Classes
- `container-padding` - Use `.page-container` instead
- `section-spacing` - Use `.content-sections` instead  
- `content-spacing` - Use `.content-sections` instead

### ✅ ALWAYS Use These New Classes
- `.page-container` - Main page wrapper with responsive padding
- `.content-wrapper` - Content container with max-width and centering
- `.content-sections` - Sections wrapper with consistent spacing
- `.page-header` - Standardized page header with bottom border

## 📐 Layout Structure

### Required Structure for ALL Pages

```tsx
// Option 1: Using Layout Components (PREFERRED)
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'

export default function MyPage() {
  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Page Title"
        description="Optional page description"
      >
        {/* Optional header actions like buttons */}
        <Button>Action</Button>
      </PageHeader>
      <PageContent>
        {/* Your page content sections */}
        <Card>...</Card>
        <div>...</div>
      </PageContent>
    </PageLayout>
  )
}

// Option 2: Using CSS Classes Directly
export default function MyPage() {
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <div className="page-header">
            <h1>Page Title</h1>
            <p>Page description</p>
          </div>
          {/* Your content */}
        </div>
      </div>
    </div>
  )
}
```

## 🎛️ Layout Components

### PageLayout Component

Main wrapper component that provides consistent padding and content width.

```tsx
interface PageLayoutProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}
```

**Max Width Options:**
- `sm` - 672px (forms, simple pages)
- `md` - 896px (content pages)  
- `lg` - 1152px (dashboard pages)
- `xl` - 1280px (default, most pages)
- `2xl` - No max width (full-width pages)
- `full` - Full width (special cases)

### PageHeader Component

Standardized page header with title, description, and optional actions.

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode  // Header actions
  className?: string
}
```

### PageContent Component

Content wrapper that provides consistent spacing between sections.

```tsx
interface PageContentProps {
  children: ReactNode
  className?: string
}
```

## 📏 Spacing System

### CSS Custom Properties

```css
/* Horizontal Padding */
--layout-padding-x: 1rem;        /* 16px - Mobile */
--layout-padding-x-md: 1.5rem;   /* 24px - Tablet */
--layout-padding-x-lg: 2rem;     /* 32px - Desktop */

/* Vertical Padding */
--layout-padding-y: 1.5rem;      /* 24px - Mobile */
--layout-padding-y-md: 2rem;     /* 32px - Tablet */
--layout-padding-y-lg: 2.5rem;   /* 40px - Desktop */

/* Content Spacing */
--content-spacing: 1.5rem;       /* 24px - Mobile */
--content-spacing-md: 2rem;      /* 32px - Tablet */
--content-spacing-lg: 2.5rem;    /* 40px - Desktop */

/* Content Max Width */
--content-max-width: 80rem;      /* 1280px */
```

### Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🎨 CSS Classes Reference

### .page-container
Main page wrapper with responsive padding.

```css
.page-container {
  padding: var(--layout-padding-y) var(--layout-padding-x);
}

@media (min-width: 768px) {
  .page-container {
    padding: var(--layout-padding-y-md) var(--layout-padding-x-md);
  }
}

@media (min-width: 1024px) {
  .page-container {
    padding: var(--layout-padding-y-lg) var(--layout-padding-x-lg);
  }
}
```

### .content-wrapper
Content container with max-width and centering.

```css
.content-wrapper {
  max-width: var(--content-max-width);
  margin: 0 auto;
  width: 100%;
}
```

### .content-sections
Sections wrapper with consistent spacing.

```css
.content-sections {
  display: flex;
  flex-direction: column;
  gap: var(--content-spacing);
}

@media (min-width: 768px) {
  .content-sections {
    gap: var(--content-spacing-md);
  }
}

@media (min-width: 1024px) {
  .content-sections {
    gap: var(--content-spacing-lg);
  }
}
```

### .page-header
Standardized page header with bottom border.

```css
.page-header {
  padding-bottom: var(--content-spacing);
  border-bottom: 1px solid hsl(var(--border));
}

@media (min-width: 768px) {
  .page-header {
    padding-bottom: var(--content-spacing-md);
  }
}

@media (min-width: 1024px) {
  .page-header {
    padding-bottom: var(--content-spacing-lg);
  }
}
```

## 📋 Implementation Examples

### Dashboard Page Example

```tsx
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Dashboard"
        description="Welcome to your dashboard overview"
      >
        <Button>Add New</Button>
      </PageHeader>
      <PageContent>
        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>...</Card>
          <Card>...</Card>
        </div>
        
        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>...</CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  )
}
```

### Form Page Example

```tsx
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'

export default function AddClientPage() {
  return (
    <PageLayout maxWidth="md">
      <PageHeader 
        title="Add New Client"
        description="Create a new client profile"
      />
      <PageContent>
        <Card>
          <CardContent>
            <AddClientForm />
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  )
}
```

### List Page Example

```tsx
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'

export default function ClientsPage() {
  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        title="Clients"
        description="Manage your client portfolio"
      >
        <Button asChild>
          <Link href="/dashboard/clients/add">Add Client</Link>
        </Button>
      </PageHeader>
      <PageContent>
        <ClientsTable />
      </PageContent>
    </PageLayout>
  )
}
```

## 🔄 Migration Guide

### Updating Existing Pages

1. **Replace old wrapper classes:**
   ```tsx
   // OLD
   <div className="container-padding section-spacing">
     <div className="max-w-7xl mx-auto content-spacing">
   
   // NEW
   <div className="page-container">
     <div className="content-wrapper">
       <div className="content-sections">
   ```

2. **Update page headers:**
   ```tsx
   // OLD
   <div className="pb-4 md:pb-6 border-b border-border">
     <h1>Title</h1>
     <p>Description</p>
   </div>
   
   // NEW
   <div className="page-header">
     <h1>Title</h1>
     <p>Description</p>
   </div>
   
   // OR BETTER
   <PageHeader title="Title" description="Description" />
   ```

3. **Use layout components:**
   ```tsx
   // BEST PRACTICE
   import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
   
   export default function MyPage() {
     return (
       <PageLayout>
         <PageHeader title="Title" description="Description" />
         <PageContent>
           {/* Content */}
         </PageContent>
       </PageLayout>
     )
   }
   ```

## ✅ Benefits

1. **Consistency**: All pages have identical spacing and layout
2. **Responsive**: Automatic responsive behavior across all breakpoints
3. **Maintainable**: Single source of truth for layout spacing
4. **Professional**: Clean, consistent visual hierarchy
5. **Developer Experience**: Easy to use, hard to misuse
6. **Future-proof**: Easy to update spacing globally

## 🚨 Common Mistakes to Avoid

1. **Don't mix old and new systems** - Always use the new layout system
2. **Don't hardcode spacing** - Use the CSS custom properties
3. **Don't skip the wrapper structure** - Always use the three-layer structure
4. **Don't forget responsive design** - The system handles it automatically
5. **Don't override layout spacing** - Use the standardized spacing values

## 🔍 Troubleshooting

### Page looks cramped on mobile
- Ensure you're using `.page-container` as the outermost wrapper
- Check that you haven't overridden the padding with custom classes

### Content too wide on desktop
- Use appropriate `maxWidth` prop on `PageLayout` component
- Default `xl` (1280px) works for most pages

### Inconsistent spacing between sections
- Use `.content-sections` wrapper around your content
- Don't add custom margins between sections

### Header doesn't have bottom border
- Use `.page-header` class or `PageHeader` component
- Don't add custom styling to headers

---

## 📝 Summary

The standardized layout system ensures visual consistency across the entire Numericalz platform. By following these guidelines and using the provided components and CSS classes, all pages will have professional, consistent spacing and layout that works perfectly across all devices.

**Remember: Always use the new layout system for ALL pages. Never use deprecated layout classes.** 