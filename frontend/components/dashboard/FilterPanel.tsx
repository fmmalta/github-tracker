'use client'
import {
  Box, Button, Collapse, TextField, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent
} from '@mui/material'
import { FilterList, ExpandLess, ExpandMore } from '@mui/icons-material'
import { useState } from 'react'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import { useFilterParams } from '@/hooks/useFilterParams'
import { DATE_PRESETS } from '@/lib/constants'
import type { Repository, Developer } from '@/lib/types'

interface FilterPanelProps {
  repos?: Repository[]
  developers?: Developer[]
  showStateFilter?: boolean
  showBranchFilter?: boolean
}

export function FilterPanel({
  repos = [],
  developers = [],
  showStateFilter = false,
  showBranchFilter = false,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const {
    startDate, setStartDate,
    endDate, setEndDate,
    repoId, setRepoId,
    developerId, setDeveloperId,
    state, setState,
    branch, setBranch,
    setPreset,
  } = useFilterParams()

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box mb={2}>
        <Button
          startIcon={<FilterList />}
          endIcon={open ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setOpen(!open)}
          variant="outlined"
          size="small"
          aria-expanded={open}
          aria-controls="filter-panel-content"
        >
          {open ? 'Hide Filters' : 'Show Filters'}
        </Button>

        <Collapse in={open} id="filter-panel-content">
          <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {/* Date presets */}
            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const { startDate: s, endDate: e } = preset.getDates()
                    setStartDate(s)
                    setEndDate(e)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>

            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
              <DatePicker
                label="Start Date"
                value={dayjs(startDate)}
                onChange={(v) => v && setStartDate(v.toDate())}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={dayjs(endDate)}
                onChange={(v) => v && setEndDate(v.toDate())}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />

              {repos.length > 0 && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Repository</InputLabel>
                  <Select
                    value={repoId ?? ''}
                    label="Repository"
                    onChange={(e: SelectChangeEvent) => setRepoId(e.target.value || null)}
                  >
                    <MenuItem value="">All repos</MenuItem>
                    {repos.map((r) => (
                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {developers.length > 0 && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Developer</InputLabel>
                  <Select
                    value={developerId ?? ''}
                    label="Developer"
                    onChange={(e: SelectChangeEvent) => setDeveloperId(e.target.value || null)}
                  >
                    <MenuItem value="">All developers</MenuItem>
                    {developers.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.login}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {showStateFilter && (
                <FormControl size="small" fullWidth>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={state ?? ''}
                    label="State"
                    onChange={(e: SelectChangeEvent) => setState(e.target.value || null)}
                  >
                    <MenuItem value="">All states</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="merged">Merged</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              )}

              {showBranchFilter && (
                <TextField
                  size="small"
                  fullWidth
                  label="Branch"
                  value={branch ?? ''}
                  onChange={(e) => setBranch(e.target.value || null)}
                  placeholder="e.g. main"
                />
              )}
            </Box>
          </Box>
        </Collapse>
      </Box>
    </LocalizationProvider>
  )
}
