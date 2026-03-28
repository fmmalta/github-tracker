import { ReactNode } from 'react'
import { Box } from '@mui/material'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      {children}
    </Box>
  )
}
