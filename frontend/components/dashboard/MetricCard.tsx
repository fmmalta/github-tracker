'use client'
import { Card, CardContent, Typography, IconButton, Popover, Box, Skeleton } from '@mui/material'
import { HelpOutline } from '@mui/icons-material'
import { useState } from 'react'
import type { MetricDefinition } from '@/lib/types'

export interface MetricCardProps {
  label: string
  value: number | string
  unit?: string
  definition: MetricDefinition
  loading?: boolean
}

export function MetricCard({ label, value, unit, definition, loading = false }: MetricCardProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const open = Boolean(anchorEl)
  const popoverId = open ? `metric-popover-${definition.key}` : undefined

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" height={60} width="50%" sx={{ my: 0.5 }} />
          <Skeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
          <IconButton
            size="small"
            aria-label={`Learn more about ${label}`}
            aria-describedby={popoverId}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <HelpOutline fontSize="small" color="action" />
          </IconButton>
        </Box>

        <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && (
            <Typography component="span" variant="body1" color="text.secondary" ml={0.5}>
              {unit}
            </Typography>
          )}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          See help icon for details
        </Typography>
      </CardContent>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }} role="dialog" aria-label={`${label} definition`}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            {definition.name}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {definition.formula}
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 1, mt: 1 }}>
            <Typography variant="caption">
              <strong>Disclaimer:</strong> {definition.disclaimer}
            </Typography>
          </Box>
        </Box>
      </Popover>
    </Card>
  )
}
