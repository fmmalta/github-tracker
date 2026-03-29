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
  return (
    <div
      id={id}
      role="note"
      aria-label="Metric disclaimer"
      className={`flex items-center gap-2 p-3 rounded mb-4 border-l-2 text-sm ${
        variant === 'warning'
          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200'
          : 'border-blue-500 bg-blue-500/10 text-blue-200'
      }`}
    >
      <span className="shrink-0">ℹ</span>
      <span>{message}</span>
    </div>
  )
}
