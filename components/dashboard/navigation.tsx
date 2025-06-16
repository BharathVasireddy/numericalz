'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Building2, 
  Mail, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Dashboard navigation component
 * 
 * Features:
 * - Responsive sidebar navigation
 * - Active state highlighting
 * - Mobile hamburger menu
 * - User profile and logout
 * - Logo integration
 * - Role-based navigation items
 */
export function DashboardNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  // Get role-based navigation items
  const getNavigationItems = () => {
    const dashboardHref = session?.user?.role === 'MANAGER' 
      ? '/dashboard/manager' 
      : '/dashboard/staff'

    const baseItems = [
      {
        name: 'Dashboard',
        href: dashboardHref,
        icon: LayoutDashboard,
      },
      {
        name: 'Clients',
        href: '/dashboard/clients',
        icon: Building2,
      },
      {
        name: 'Communications',
        href: '/dashboard/communications',
        icon: Mail,
      },
    ]

    // Add manager-only items
    if (session?.user?.role === 'MANAGER') {
      baseItems.push(
        {
          name: 'Team',
          href: '/dashboard/team',
          icon: Users,
        },
        {
          name: 'Settings',
          href: '/dashboard/settings',
          icon: Settings,
        }
      )
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="btn-outline"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-background border-r border-border z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link 
              href={session?.user?.role === 'MANAGER' ? '/dashboard/manager' : '/dashboard/staff'} 
              className="flex items-center gap-3"
            >
              <Image
                src="/numericalz-logo.png"
                alt="Numericalz Logo"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
              <span className="font-bold text-lg">Numericalz</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.name === 'Dashboard' && (pathname === '/dashboard/manager' || pathname === '/dashboard/staff')) ||
                  (item.href !== '/dashboard' && !item.href.includes('/dashboard/manager') && !item.href.includes('/dashboard/staff') && pathname.startsWith(item.href) && pathname !== '/dashboard/clients/inactive')
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                        transition-colors duration-200
                        ${isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Actions */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Inactive Clients - Manager Only */}
            {session?.user?.role === 'MANAGER' && (
              <Link
                href="/dashboard/clients/inactive"
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-200 w-full
                  ${pathname === '/dashboard/clients/inactive'
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <Building2 className="h-4 w-4" />
                Inactive Clients
              </Link>
            )}
            
            {/* User Info */}
            <div className="px-3 py-2 rounded-sm bg-muted/50">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email || 'No email'}
              </p>
            </div>
            
            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full btn-outline"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Spacer for Fixed Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  )
} 