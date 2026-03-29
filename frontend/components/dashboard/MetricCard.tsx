'use client'
import { HelpCircle } from 'lucide-react'
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
  const [showTooltip, setShowTooltip] = useState(false)

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-[70%] mb-3" />
        <div className="h-10 bg-muted rounded w-[50%] mb-3" />
        <div className="h-3 bg-muted rounded w-[40%]" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 relative">
      <div className="flex justify-between items-start">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <button
          type="button"
          aria-label={`Learn more about ${label}`}
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      <div className="my-2">
        <span className="text-3xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        )}
      </div>

      <span className="text-xs text-muted-foreground">See help icon for details</span>

      {showTooltip && (
        <div
          role="dialog"
          aria-label={`${label} definition`}
          className="absolute top-full left-0 mt-1 z-20 w-72 bg-card border border-border rounded-lg p-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-foreground mb-1">{definition.name}</p>
          <p className="text-sm text-muted-foreground mb-2">{definition.formula}</p>
          <div className="border-l-2 border-yellow-500 pl-2 bg-yellow-500/10 rounded-r p-1.5">
            <p className="text-xs text-foreground">
              <strong>Disclaimer:</strong> {definition.disclaimer}
            </p>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowTooltip(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
