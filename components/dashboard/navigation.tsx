'use client'

import { useState, useEffect } from 'react'
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
  X,
  Calendar,
  Briefcase
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
  const { data: session, update } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Fetch fresh user data when component mounts or session changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/users/${session.user.id}`)
          if (response.ok) {
            const userData = await response.json()
            if (userData.name !== session.user.name) {
              // Update session with fresh data
              await update({
                ...session,
                user: {
                  ...session.user,
                  name: userData.name
                }
              })
              setCurrentUserName(userData.name)
            } else {
              setCurrentUserName(userData.name)
            }
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          setCurrentUserName(session.user.name || 'User')
        }
      }
    }

    fetchUserData()
  }, [session?.user?.id, session, update])

  // Update current user name when session changes
  useEffect(() => {
    if (session?.user?.name) {
      setCurrentUserName(session.user.name)
    }
  }, [session?.user?.name])

  // Get role-based navigation items
  const getNavigationItems = () => {
    // Each role gets their own specific dashboard URL
    const dashboardHref = session?.user?.role === 'PARTNER' 
      ? '/dashboard/partner'
      : session?.user?.role === 'MANAGER' 
        ? '/dashboard/manager'
        : '/dashboard/staff'

    // Core navigation items - available to all users
    const coreItems = [
      {
        name: 'Dashboard',
        href: dashboardHref,
        icon: LayoutDashboard,
      }
    ]

    // Client management items - available to all users
    const clientItems = [
      {
        name: 'All Clients',
        href: '/dashboard/clients',
        icon: Building2,
      },
      {
        name: 'Ltd Companies',
        href: '/dashboard/clients/ltd-companies',
        icon: Building2,
      },
      {
        name: 'Non Ltd Companies',
        href: '/dashboard/clients/non-ltd-companies',
        icon: Building2,
      },
      {
        name: 'VAT Deadlines',
        href: '/dashboard/clients/vat-dt',
        icon: Calendar,
      },
    ]

    // Tools and utilities - available to all users
    const toolItems = [
      {
        name: 'Deadline Calendar',
        href: '/dashboard/calendar',
        icon: Calendar,
      },
    ]

    // Management items - Partner and Manager only
    const managementItems = []
    if (session?.user?.role === 'PARTNER') {
      managementItems.push({
        name: 'Staff Management',
        href: '/dashboard/staff',
        icon: Users,
      })
    }

    // Settings - Role-based access
    const settingsItems = []
    if (session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') {
      settingsItems.push({
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
      })
    }

    // Build the navigation structure with categories
    const navigationStructure = [
      { type: 'section', items: coreItems },
      { type: 'separator' },
      { type: 'section', title: 'Clients', items: clientItems },
      { type: 'separator' },
      { type: 'section', title: 'Tools', items: toolItems },
    ]

    // Add management section for Partner
    if (managementItems.length > 0) {
      navigationStructure.push(
        { type: 'separator' },
        { type: 'section', title: 'Management', items: managementItems }
      )
    }

    // Add settings section
    if (settingsItems.length > 0) {
      navigationStructure.push(
        { type: 'separator' },
        { type: 'section', title: 'System', items: settingsItems }
      )
    }

    return navigationStructure
  }

  const navigationStructure = getNavigationItems()

  const handleSignOut = () => {
    setShowSignOutConfirm(true)
  }

  const confirmSignOut = () => {
    setShowSignOutConfirm(false)
    signOut({ callbackUrl: '/' })
  }

  const cancelSignOut = () => {
    setShowSignOutConfirm(false)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background/95 backdrop-blur-sm border-border"
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
        fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b border-border flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Numericalz</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigationStructure.map((section, sectionIndex) => {
                if (section.type === 'separator') {
                  return (
                    <li key={`separator-${sectionIndex}`} className="my-3">
                      <hr className="nav-separator" />
                    </li>
                  )
                }
                
                if (section.type === 'section') {
                  return (
                    <li key={`section-${sectionIndex}`} className="space-y-1">
                      {/* Section Title */}
                      {section.title && (
                        <div className="px-3 py-1">
                          <p className="nav-section-title">
                            {section.title}
                          </p>
                        </div>
                      )}
                      
                      {/* Section Items */}
                      {section.items?.map((item) => {
                        const Icon = item.icon
                        // More precise active state detection
                        const isActive = (() => {
                          // Exact match
                          if (pathname === item.href) return true
                          
                          // Special case for dashboard - only exact match
                          if (item.href.endsWith('/dashboard') || item.href.endsWith('/dashboard/staff') || 
                              item.href.endsWith('/dashboard/manager') || item.href.endsWith('/dashboard/partner')) {
                            return pathname === item.href
                          }
                          
                          // Special case for main clients page - only exact match
                          if (item.href === '/dashboard/clients') {
                            return pathname === '/dashboard/clients'
                          }
                          
                          // For sub-pages, check if current path starts with the item href
                          // but ensure we're not matching a parent when a more specific child exists
                          if (pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?')) {
                            return true
                          }
                          
                          return false
                        })()

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        )
                      })}
                    </li>
                  )
                }
                
                return null
              })}
            </ul>
          </nav>

          {/* Inactive Clients - Partner and Manager Only (Above separator) */}
          {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
            <div className="px-4 flex-shrink-0">
              <Link
                href="/dashboard/clients/inactive"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                  transition-colors duration-200 w-full
                  ${pathname === '/dashboard/clients/inactive'
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Inactive Clients</span>
              </Link>
            </div>
          )}

          {/* User Actions */}
          <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
            {/* User Info */}
            <div className="px-3 py-2 rounded-sm bg-muted/50">
              <p className="text-sm font-medium text-foreground truncate">
                {currentUserName || session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email || 'No email'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {session?.user?.role?.toLowerCase() || 'staff'}
              </p>
            </div>
            
            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full border-orange-700 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-800"
            >
              <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sign Out Confirmation Popup */}
      {showSignOutConfirm && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={cancelSignOut}
          />
          
          {/* Confirmation Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg shadow-lg max-w-sm w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Sign Out</h3>
                    <p className="text-sm text-muted-foreground">Are you sure you want to sign out?</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelSignOut}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmSignOut}
                    className="flex-1 bg-orange-600 text-white hover:bg-orange-700"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
} 