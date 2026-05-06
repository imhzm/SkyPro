import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { escapeHtml, sanitizeSpreadsheetCell, toCsvCell } = require('../electron/export-sanitizers.cjs')

test('sanitizeSpreadsheetCell neutralizes formula prefixes', () => {
  for (const value of ['=cmd', '+SUM(1,1)', '-10+20', '@HYPERLINK("x")']) {
    assert.equal(sanitizeSpreadsheetCell(value), `'${value}`)
  }
})

test('sanitizeSpreadsheetCell preserves normal text and trims control characters', () => {
  assert.equal(sanitizeSpreadsheetCell('normal text'), 'normal text')
  assert.equal(sanitizeSpreadsheetCell('\t=cmd'), "'=cmd")
})

test('escapeHtml escapes every HTML-sensitive character', () => {
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;')
})

test('toCsvCell escapes quotes after formula sanitization', () => {
  assert.equal(toCsvCell('=A1"'), '"\'=A1"""')
})
