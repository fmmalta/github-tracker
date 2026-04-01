'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, FolderOpen, Trophy, GitPullRequest, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Org Overview', href: '/', icon: LayoutDashboard },
  { label: 'Repos', href: '/repos', icon: FolderOpen },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'PR Explorer', href: '/pull-requests', icon: GitPullRequest },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()

  return (
    <nav
      className="w-60 shrink-0 bg-card border-r border-border flex flex-col h-screen fixed top-0 left-0 z-10"
      aria-label="Main navigation"
    >
      <div className="p-4 border-b border-border">
        <span className="text-sm font-semibold text-primary tracking-tight">GitHub Analytics</span>
      </div>
      <ul className="flex-1 pt-2 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          )
        })}


            <li className="border-t border-border my-1 pt-1">
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === '/admin'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Settings size={16} />
                Admin
              </Link>
            </li>


      </ul>
    </nav>
  )
}
