'use client'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material'
import { Dashboard, FolderOpen, Leaderboard, Source, Settings } from '@mui/icons-material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { label: 'Org Overview', href: '/dashboard', icon: <Dashboard /> },
  { label: 'Repos', href: '/repos', icon: <FolderOpen /> },
  { label: 'Leaderboard', href: '/leaderboard', icon: <Leaderboard /> },
  { label: 'PR Explorer', href: '/pull-requests', icon: <Source /> },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()

  return (
    <Box
      component="nav"
      sx={{
        width: 240,
        flexShrink: 0,
        bgcolor: 'white',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
      aria-label="Main navigation"
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          GitHub Analytics
        </Typography>
      </Box>
      <List sx={{ flex: 1, pt: 1 }}>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <ListItem key={href} disablePadding>
              <ListItemButton
                component={Link}
                href={href}
                selected={active}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'inherit' }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            </ListItem>
          )
        })}
        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/admin"
                selected={pathname === '/admin'}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.dark' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: pathname === '/admin' ? 'primary.main' : 'inherit' }}>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary="Admin" primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  )
}
