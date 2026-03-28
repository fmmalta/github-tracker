import { ReactNode } from 'react'
import { Box } from '@mui/material'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: '240px',   // Offset for fixed sidebar
          mt: '64px',    // Offset for fixed AppBar
          p: 3,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
