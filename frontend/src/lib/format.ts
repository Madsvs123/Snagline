import { format, formatDistanceToNow } from 'date-fns'

export function timeAgo(value: string): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

export function shortDate(value: string): string {
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  return format(date, 'd MMM yyyy')
}

export function exactTime(value: string): string {
  return format(new Date(value), 'yyyy-MM-dd HH:mm')
}
