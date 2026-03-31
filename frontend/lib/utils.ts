import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatHoursToFriendly(hours: number): string {
  if (hours === 0) return '0 hours'
  if (hours < 24) {
    return `${Math.round(hours)} hour${hours !== 1 ? 's' : ''}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
}

export function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const now = Date.now()
  const diffMs = date.getTime() - now
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absMs < minute) {
    return 'just now'
  }
  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute')
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour')
  }

  return rtf.format(Math.round(diffMs / day), 'day')
}
