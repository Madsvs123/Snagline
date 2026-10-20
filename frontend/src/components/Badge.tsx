import clsx from 'clsx'

import type { Severity, Status } from '../api/types'
import { SEVERITIES, STATUSES } from '../lib/constants'

export function StatusBadge({ status }: { status: Status }) {
  const label = STATUSES.find((item) => item.value === status)?.label ?? status
  return <span className={clsx('badge', `badge-${status}`)}>{label}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const label = SEVERITIES.find((item) => item.value === severity)?.label ?? severity
  return <span className={clsx('badge', 'badge-severity', `badge-${severity}`)}>{label}</span>
}
