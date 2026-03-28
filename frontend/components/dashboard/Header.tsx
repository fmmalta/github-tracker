'use client'
import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material'
import { Logout } from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  title: string
  rightSlot?: React.ReactNode  // Allows pages to inject sync status badge
}

export function Header({ title, rightSlot }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{ left: 240, width: 'calc(100% - 240px)', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}
    >
      <Toolbar>
        <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
          {title}
        </Typography>
        {rightSlot}
        <Box ml={2} display="flex" alignItems="center" gap={1}>
          {user && (
            <Chip label={user.email} size="small" variant="outlined" />
          )}
          <Button size="small" startIcon={<Logout />} onClick={logout} color="inherit">
            Sign out
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
