// Verifies that every electronAPI method the renderer expects has:
//   1. A matching IPC handler registered in electron/main.cjs, ipc-auth.cjs, or ipc/social.cjs
//   2. A matching preload bridge in electron/preload.cjs
//
// Catches the class of bug where a UI button calls a method that was renamed,
// removed, or never wired — before the user discovers it via a silent failure.
//
// Run with: node --test scripts/verify-ipc-bindings.test.mjs

import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function readFile(rel) {
  return readFileSync(path.join(repoRoot, rel), 'utf8')
}

function extractIpcChannels(source) {
  const channels = new Set()
  const ipcm = /ipcm\(\s*['"]([a-z][a-z0-9-]*)['"]/gi
  const ipcMainHandle = /ipcMain\.handle\(\s*['"]([a-z][a-z0-9-]*)['"]/gi
  for (const m of source.matchAll(ipcm)) channels.add(m[1])
  for (const m of source.matchAll(ipcMainHandle)) channels.add(m[1])
  return channels
}

function extractPreloadInvokes(source) {
  const channels = new Set()
  // Match: ipcRenderer.invoke('channel-name'
  const re = /ipcRenderer\.invoke\(\s*['"]([a-z][a-z0-9-]*)['"]/gi
  for (const m of source.matchAll(re)) channels.add(m[1])
  return channels
}

function extractPreloadKeys(source) {
  const keys = new Set()
  // Match preload property names: `someKey: (data) =>` or `someKey: () =>`
  const re = /^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:\s*\([^)]*\)\s*=>/gm
  for (const m of source.matchAll(re)) keys.add(m[1])
  return keys
}

function extractElectronAPICallsFromUI(uiSources) {
  const calls = new Set()
  const re = /window\.electronAPI[?]?\.([a-zA-Z][a-zA-Z0-9]*)/g
  for (const src of uiSources) {
    for (const m of src.matchAll(re)) calls.add(m[1])
  }
  return calls
}

const mainSrc = readFile('electron/main.cjs')
const authSrc = readFile('electron/ipc-auth.cjs')
const socialSrc = readFile('electron/ipc/social.cjs')
const preloadSrc = readFile('electron/preload.cjs')

const ipcChannels = new Set([
  ...extractIpcChannels(mainSrc),
  ...extractIpcChannels(authSrc),
  ...extractIpcChannels(socialSrc),
])

const preloadInvokes = extractPreloadInvokes(preloadSrc)
const preloadKeys = extractPreloadKeys(preloadSrc)

test('every preload invoke has a matching IPC handler', () => {
  const missing = [...preloadInvokes].filter((c) => !ipcChannels.has(c))
  assert.deepStrictEqual(
    missing,
    [],
    `Preload methods invoke IPC channels that have no handler:\n  - ${missing.join('\n  - ')}`,
  )
})

// Collect UI sources from src/ recursively (lazy: only files we know hit
// window.electronAPI).
import { readdirSync, statSync } from 'node:fs'
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, acc)
    else if (/\.(tsx?|jsx?)$/.test(entry)) acc.push(full)
  }
  return acc
}
const srcDir = path.join(repoRoot, 'src')
const uiFiles = walk(srcDir)
const uiSources = uiFiles.map((f) => readFileSync(f, 'utf8'))

const uiCalls = extractElectronAPICallsFromUI(uiSources)

test('every electronAPI method the UI calls is exported in preload.cjs', () => {
  const missing = [...uiCalls].filter((c) => !preloadKeys.has(c))
  assert.deepStrictEqual(
    missing,
    [],
    `UI calls electronAPI methods that have no preload export:\n  - ${missing.join('\n  - ')}`,
  )
})

test('summary', () => {
  console.log(`✓ ${ipcChannels.size} IPC handlers registered`)
  console.log(`✓ ${preloadInvokes.size} preload invoke channels`)
  console.log(`✓ ${preloadKeys.size} preload exports`)
  console.log(`✓ ${uiCalls.size} unique electronAPI methods called by UI`)
})
