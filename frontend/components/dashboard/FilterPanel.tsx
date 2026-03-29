'use client'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { useState } from 'react'
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
  } = useFilterParams()

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="filter-panel-content"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded px-3 py-1.5 transition-colors"
      >
        <Filter size={14} />
        {open ? 'Hide Filters' : 'Show Filters'}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div
          id="filter-panel-content"
          className="mt-2 p-3 bg-card border border-border rounded-lg"
        >
          {/* Date presets */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="text-xs border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                onClick={() => {
                  const { startDate: s, endDate: e } = preset.getDates()
                  setStartDate(s)
                  setEndDate(e)
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
              <input
                type="date"
                className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                value={dayjs(startDate).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setStartDate(new Date(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End Date</label>
              <input
                type="date"
                className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                value={dayjs(endDate).format('YYYY-MM-DD')}
                onChange={(e) => e.target.value && setEndDate(new Date(e.target.value))}
              />
            </div>

            {repos.length > 0 && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Repository</label>
                <select
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                  value={repoId ?? ''}
                  onChange={(e) => setRepoId(e.target.value || null)}
                >
                  <option value="">All repos</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            {developers.length > 0 && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Developer</label>
                <select
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                  value={developerId ?? ''}
                  onChange={(e) => setDeveloperId(e.target.value || null)}
                >
                  <option value="">All developers</option>
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>{d.login}</option>
                  ))}
                </select>
              </div>
            )}

            {showStateFilter && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">State</label>
                <select
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                  value={state ?? ''}
                  onChange={(e) => setState(e.target.value || null)}
                >
                  <option value="">All states</option>
                  <option value="open">Open</option>
                  <option value="merged">Merged</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}

            {showBranchFilter && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Branch</label>
                <input
                  type="text"
                  className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
                  placeholder="e.g. main"
                  value={branch ?? ''}
                  onChange={(e) => setBranch(e.target.value || null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
