const FORMULA_PREFIX = /^[=+\-@]/

function sanitizeSpreadsheetCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  const normalized = text.replace(/^[\t\r\n ]+/, '')
  return FORMULA_PREFIX.test(normalized) ? `'${normalized}` : normalized
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toCsvCell(value) {
  const safeValue = sanitizeSpreadsheetCell(value).replace(/"/g, '""')
  return `"${safeValue}"`
}

function toHtmlCell(value) {
  return escapeHtml(sanitizeSpreadsheetCell(value))
}

module.exports = {
  escapeHtml,
  sanitizeSpreadsheetCell,
  toCsvCell,
  toHtmlCell,
}
