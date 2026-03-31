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
