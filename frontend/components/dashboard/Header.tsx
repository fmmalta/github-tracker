'use client'
import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  title: string
  rightSlot?: React.ReactNode
}

export function Header({ title, rightSlot }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-card border-b border-border flex items-center px-6 z-10">
      <h1 className="text-base font-semibold text-foreground flex-1">{title}</h1>
      {rightSlot}
      <div className="flex items-center gap-3 ml-4">
        {user && (
          <span className="text-xs text-muted-foreground border border-border rounded px-2 py-1">
            {user.email}
          </span>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  )
}
