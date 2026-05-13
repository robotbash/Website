'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Clock, LayoutDashboard, Calendar, FileText, Users, Settings, LogOut, Menu, X, ChevronDown, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { User } from '@/lib/supabase/types'

interface NavbarProps {
  user: User
}

const employeeLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timesheet', label: 'Timesheet', icon: Clock },
  { href: '/pto', label: 'PTO', icon: Calendar },
  { href: '/sick', label: 'Sick / Call-Off', icon: FileText },
  { href: '/corrections', label: 'Corrections', icon: FileText },
]

const adminLinks = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/employees', label: 'Employees', icon: Users },
  { href: '/admin/corrections', label: 'Corrections', icon: FileText },
  { href: '/admin/holidays', label: 'Holidays', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Shield },
  { href: '/admin/export', label: 'Export', icon: FileText },
  { href: '/admin/audit-log', label: 'Audit Log', icon: Shield },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = user.role === 'admin' ? adminLinks : employeeLinks

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Time Tracker</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user.role === 'admin' && (
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground hidden sm:block">
                My Dashboard
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <span className="hidden sm:inline max-w-32 truncate">{user.full_name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  await fetch('/api/auth/sign-out-everywhere', { method: 'POST' })
                  toast.success('Signed out everywhere')
                  router.push('/login')
                }}>
                  Sign out everywhere
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 border-b bg-background shadow-lg p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {user.role === 'admin' && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  >
                    My Dashboard
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
