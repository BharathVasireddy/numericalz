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
  ChevronRight,
  Crown,
  Shield,
  User,
  Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LondonTime } from '@/components/ui/london-time'
import { NotificationIcon } from '@/components/notifications/notification-icon'
import { NotificationSidebar } from '@/components/notifications/notification-sidebar'

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
  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false)

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

  // Close notification sidebar when navigating to other pages
  useEffect(() => {
    setIsNotificationSidebarOpen(false)
  }, [pathname])

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
        id: 'calendar',
        title: 'Deadline Calendar',
        icon: Calendar,
        items: [
          {
            name: 'Calendar',
            href: '/dashboard/calendar',
            icon: Calendar,
          }
        ]
      },
      ...(session?.user?.role === 'PARTNER' ? [{
        id: 'communication',
        title: 'Communication',
        icon: Mail,
        items: [
          {
            name: 'Email Templates',
            href: '/dashboard/communication/templates',
            icon: Mail,
          },
          {
            name: 'Email History',
            href: '/dashboard/communication/history',
            icon: Mail,
          },
          {
            name: 'Communication Settings',
            href: '/dashboard/communication/settings',
            icon: Settings,
          }
        ]
      }] : []),
      {
        id: 'tools',
        title: 'Tools & Utilities',
        icon: Wrench,
        items: [
          {
            name: 'Tools Hub',
            href: '/dashboard/tools',
            icon: Wrench,
          }
        ]
      }
    ]

    // Add staff section for Partner
    if (session?.user?.role === 'PARTNER') {
      structure.push({
        id: 'staff',
        title: 'Staff',
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
      {/* Mobile Header - Always visible on mobile */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Image
            src="/numericalz-logo-official.png"
            alt="Numericalz"
            width={28}
            height={28}
            className="flex-shrink-0"
            style={{ height: 'auto' }}
          />
          <div className="text-sm font-semibold text-foreground">
            Numericalz
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <LondonTime />
          </div>
          <NotificationIcon 
                    onClick={() => setIsNotificationSidebarOpen(!isNotificationSidebarOpen)}
                    isOpen={isNotificationSidebarOpen}
                  />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-9 w-9 p-0"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Slide-out / Desktop Static */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:h-screen lg:w-72
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Desktop Logo and Time - Hidden on mobile */}
          <div className="hidden lg:block p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <Image
                src="/numericalz-logo-official.png"
                alt="Numericalz"
                width={36}
                height={36}
                className="flex-shrink-0"
                style={{ height: 'auto' }}
              />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <LondonTime />
                </div>
                <NotificationIcon 
                  onClick={() => setIsNotificationSidebarOpen(!isNotificationSidebarOpen)}
                  isOpen={isNotificationSidebarOpen}
                />
              </div>
            </div>
          </div>

          {/* Mobile Header in Sidebar */}
          <div className="lg:hidden p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/numericalz-logo-official.png"
                  alt="Numericalz"
                  width={32}
                  height={32}
                  className="flex-shrink-0"
                  style={{ height: 'auto' }}
                />
                <div className="text-lg font-semibold text-foreground">
                  Numericalz
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
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
                          w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
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
                            w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
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
                                    flex items-center gap-2 px-3 py-2 text-sm rounded-md
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

          {/* Enhanced User Section */}
          <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
            {/* User Info - Better mobile layout */}
            <div className="px-3 py-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {currentUserName || session?.user?.name || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session?.user?.email}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {session?.user?.role === 'PARTNER' && (
                    <>
                      <Crown className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Partner</span>
                    </>
                  )}
                  {session?.user?.role === 'MANAGER' && (
                    <>
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Manager</span>
                    </>
                  )}
                  {session?.user?.role === 'STAFF' && (
                    <>
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-600">Staff</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full h-9 text-sm border-orange-700 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-800"
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

      {/* Notification Sidebar */}
      <NotificationSidebar 
        isOpen={isNotificationSidebarOpen} 
        onClose={() => setIsNotificationSidebarOpen(false)} 
      />
    </>
  )
} 