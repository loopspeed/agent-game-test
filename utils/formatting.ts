/**
 * Formats a time duration in milliseconds to a readable string
 * @param ms - Time in milliseconds
 * @returns Formatted string like "2:34" or "1:02:45"
 */
export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }
}

/**
 * Formats a date timestamp to a readable string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string like "Dec 15, 2:34 PM"
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Formats accuracy percentage with appropriate precision
 * @param percentage - Accuracy percentage (0-100)
 * @returns Formatted percentage string like "87.5%" or "100%"
 */
export const formatAccuracy = (percentage: number): string => {
  if (percentage === 100 || percentage === 0) {
    return `${Math.round(percentage)}%`
  }
  return `${percentage.toFixed(1)}%`
}
