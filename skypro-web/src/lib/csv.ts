/**
 * RFC 4180 CSV serialization with UTF-8 BOM for Excel Arabic compatibility.
 */

const BOM = '﻿'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  let str = String(value)
  // Neutralize spreadsheet formula injection (CSV injection): a cell beginning
  // with a formula trigger is evaluated by Excel/Sheets even when RFC-quoted, so
  // quoting alone is NOT enough. Prefix with an apostrophe to force text mode.
  if (/^[=\-+@\t\r]/.test(str)) {
    str = `'${str}`
  }
  // Quote if it contains a delimiter, quote, or newline
  const needsQuoting = /[",\r\n\t]/.test(str)
  if (!needsQuoting) return str
  // Escape internal quotes by doubling
  return `"${str.replace(/"/g, '""')}"`
}

export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(','))
    .join('\r\n')
  return BOM + header + '\r\n' + body
}

export function csvResponse(filename: string, csv: string): Response {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
