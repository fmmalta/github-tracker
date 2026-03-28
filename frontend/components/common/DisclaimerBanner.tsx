import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'

interface DisclaimerBannerProps {
  message?: string
  variant?: 'default' | 'warning'
  id?: string
}

export function DisclaimerBanner({
  message = 'These metrics reflect GitHub activity patterns, not engineering value or productivity.',
  variant = 'default',
  id,
}: DisclaimerBannerProps) {
  const bgcolor = variant === 'warning' ? 'warning.light' : 'info.light'
  return (
    <Box
      id={id}
      role="note"
      aria-label="Metric disclaimer"
      display="flex"
      alignItems="center"
      gap={1}
      sx={{ p: 1.5, bgcolor, borderRadius: 1, mb: 2 }}
    >
      <InfoOutlined fontSize="small" color={variant === 'warning' ? 'warning' : 'info'} />
      <Typography variant="body2">
        {message}
      </Typography>
    </Box>
  )
}
