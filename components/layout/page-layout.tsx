import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}

/**
 * Standardized page layout component
 * 
 * This component ensures consistent spacing and layout across all pages.
 * Use this for all new pages to maintain design consistency.
 * 
 * @param children - Page content
 * @param maxWidth - Maximum content width (default: 'xl')
 * @param className - Additional CSS classes
 */
export function PageLayout({ 
  children, 
  maxWidth = 'xl',
  className = '' 
}: PageLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-2xl',      // 672px
    md: 'max-w-4xl',      // 896px  
    lg: 'max-w-6xl',      // 1152px
    xl: 'max-w-7xl',      // 1280px (default)
    '2xl': 'max-w-none',  // No max width
    full: 'max-w-full'    // Full width
  }

  return (
    <div className={`page-container ${className}`}>
      <div className={`content-wrapper ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

/**
 * Standardized page header component
 * 
 * @param title - Page title
 * @param description - Optional page description
 * @param children - Optional header actions (buttons, etc.)
 * @param className - Additional CSS classes
 */
export function PageHeader({ 
  title, 
  description, 
  children,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`page-header ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

interface PageContentProps {
  children: ReactNode
  className?: string
}

/**
 * Standardized page content wrapper
 * 
 * @param children - Page content sections
 * @param className - Additional CSS classes
 */
export function PageContent({ children, className = '' }: PageContentProps) {
  return (
    <div className={`content-sections ${className}`}>
      {children}
    </div>
  )
} 