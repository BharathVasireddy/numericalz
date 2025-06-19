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
  Briefcase,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LondonTime } from '@/components/ui/london-time'

/**
 * Dashboard navigation component
 * 
 * Features:
 * - Compact categorized navigation with submenus
 * - Official Numericalz logo only (no text)
 * - London time display below logo
 * - Collapsible menu sections
 * - Role-based navigation items
 * - Non-scrollable compact design
 */
export function DashboardNavigation() {
  const { data: session, update } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard', 'clients']))

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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // Get compact categorized navigation structure
  const getNavigationStructure = () => {
    const dashboardHref = session?.user?.role === 'PARTNER' 
      ? '/dashboard/partner'
      : session?.user?.role === 'MANAGER' 
        ? '/dashboard/manager'
        : '/dashboard/staff'

    const structure = [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: LayoutDashboard,
        items: [
          {
            name: 'Overview',
            href: dashboardHref,
            icon: LayoutDashboard,
          }
        ]
      },
      {
        id: 'clients',
        title: 'Clients',
        icon: Building2,
        items: [
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
            name: 'Non-Ltd Companies',
            href: '/dashboard/clients/non-ltd-companies',
            icon: Building2,
          },
          ...(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER' ? [{
            name: 'Inactive Clients',
            href: '/dashboard/clients/inactive',
            icon: Building2,
          }] : [])
        ]
      },
      {
        id: 'vat',
        title: 'VAT Management',
        icon: Calendar,
        items: [
          {
            name: 'VAT Deadlines',
            href: '/dashboard/clients/vat-dt',
            icon: Calendar,
          },
          {
            name: 'VAT Analytics',
            href: '/dashboard/clients/vat-analytics',
            icon: BarChart3,
          }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        icon: Briefcase,
        items: [
          {
            name: 'Calendar',
            href: '/dashboard/calendar',
            icon: Calendar,
          }
        ]
      }
    ]

    // Add management section for Partner
    if (session?.user?.role === 'PARTNER') {
      structure.push({
        id: 'management',
        title: 'Management',
        icon: Users,
        items: [
          {
            name: 'Staff Management',
            href: '/dashboard/staff',
            icon: Users,
          }
        ]
      })
    }

    // Add settings section for Partner and Manager
    if (session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') {
      structure.push({
        id: 'settings',
        title: 'Settings',
        icon: Settings,
        items: [
          {
            name: 'System Settings',
            href: '/dashboard/settings',
            icon: Settings,
          }
        ]
      })
    }

    return structure
  }

  const navigationStructure = getNavigationStructure()

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

  const isItemActive = (href: string) => {
    // Exact match
    if (pathname === href) return true
    
    // Special case for dashboard - only exact match
    if (href.endsWith('/dashboard') || href.endsWith('/dashboard/staff') || 
        href.endsWith('/dashboard/manager') || href.endsWith('/dashboard/partner')) {
      return pathname === href
    }
    
    // Special case for main clients page - only exact match
    if (href === '/dashboard/clients') {
      return pathname === '/dashboard/clients'
    }
    
    // For sub-pages, check if current path starts with the item href
    if (pathname.startsWith(href + '/') || pathname.startsWith(href + '?')) {
      return true
    }
    
    return false
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Image
            src="/numericalz-logo-official.png"
            alt="Numericalz"
            width={24}
            height={24}
            className="flex-shrink-0"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
        fixed inset-y-0 left-0 z-40 w-72 bg-background border-r border-border
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo and Time */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex justify-center mb-3">
              <Image
                src="/numericalz-logo-official.png"
                alt="Numericalz"
                width={36}
                height={36}
                className="flex-shrink-0"
              />
            </div>
            <div className="text-center">
              <LondonTime />
            </div>
          </div>

          {/* Compact Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {navigationStructure.map((section) => {
                const SectionIcon = section.icon
                const isExpanded = expandedSections.has(section.id)
                const hasActiveItem = section.items.some(item => isItemActive(item.href))
                const hasSingleItem = section.items.length === 1
                
                return (
                  <div key={section.id} className="space-y-1">
                    {hasSingleItem && section.items[0] ? (
                      // Direct link for single-item sections
                      <Link
                        href={section.items[0].href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 text-sm font-medium
                          rounded-md transition-colors duration-200
                          ${isItemActive(section.items[0].href)
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                        `}
                      >
                        <SectionIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{section.title}</span>
                      </Link>
                    ) : (
                      <>
                        {/* Section Header for multi-item sections */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 text-sm font-medium
                            rounded-md transition-colors duration-200
                            ${hasActiveItem || isExpanded
                              ? 'bg-primary/10 text-primary' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }
                          `}
                        >
                          <SectionIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate flex-1 text-left">{section.title}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                        </button>
                        
                        {/* Section Items */}
                        {isExpanded && (
                          <div className="ml-6 space-y-0.5">
                            {section.items.map((item) => {
                              const ItemIcon = item.icon
                              const isActive = isItemActive(item.href)
                              
                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`
                                    flex items-center gap-2 px-3 py-1.5 text-sm rounded-md
                                    transition-colors duration-200 w-full
                                    ${isActive
                                      ? 'bg-primary text-primary-foreground font-medium' 
                                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }
                                  `}
                                >
                                  <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{item.name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>

          {/* Compact User Section */}
          <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
            {/* User Info */}
            <div className="px-3 py-2 rounded-sm bg-muted/30">
              <p className="text-sm font-medium text-foreground truncate">
                {currentUserName || session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.role?.toLowerCase() || 'staff'}
              </p>
            </div>
            
            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full h-8 text-sm border-orange-700 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-800"
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