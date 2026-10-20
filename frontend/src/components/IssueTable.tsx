import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import type { Issue } from '../api/types'
import { exactTime, timeAgo } from '../lib/format'
import { SeverityBadge, StatusBadge } from './Badge'

export function IssueTable({
  issues,
  selected,
  onToggle,
}: {
  issues: Issue[]
  selected?: number[]
  onToggle?: (id: number, checked: boolean) => void
}) {
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      ...(onToggle
        ? [
            {
              id: 'select',
              header: '',
              cell: ({ row }) => (
                <input
                  type="checkbox"
                  aria-label={`Select ${row.original.project_key}-${row.original.number}`}
                  checked={selected?.includes(row.original.id) ?? false}
                  onChange={(event) => onToggle(row.original.id, event.target.checked)}
                />
              ),
            } satisfies ColumnDef<Issue>,
          ]
        : []),
      {
        id: 'key',
        header: 'Issue',
        accessorFn: (row) => `${row.project_key}-${row.number}`,
        cell: ({ row }) => <span className="mono">{row.original.project_key}-{row.original.number}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <>
            <Link to={`/issues/${row.original.id}`} className="issue-link">
              {row.original.title}
            </Link>
            {row.original.has_duplicate_title ? <span className="muted"> Duplicate title</span> : null}
          </>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        id: 'labels',
        header: 'Labels',
        cell: ({ row }) => (
          <span className="chip-row">
            {row.original.labels.map((label) => (
              <span key={label.id} className="chip" style={{ color: label.color, borderColor: label.color }}>
                {label.name}
              </span>
            ))}
          </span>
        ),
      },
      {
        id: 'area',
        header: 'Area',
        cell: ({ row }) => row.original.area_name ?? <span className="muted">None</span>,
      },
      {
        id: 'milestone',
        header: 'Milestone',
        cell: ({ row }) => row.original.milestone_name ?? <span className="muted">None</span>,
      },
      {
        id: 'updated',
        header: 'Updated',
        accessorFn: (row) => row.updated_at,
        cell: ({ row }) => (
          <time dateTime={row.original.updated_at} title={exactTime(row.original.updated_at)}>
            {timeAgo(row.original.updated_at)}
          </time>
        ),
      },
    ],
    [onToggle, selected],
  )

  const table = useReactTable({
    data: issues,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty">
                No issues match these filters.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
