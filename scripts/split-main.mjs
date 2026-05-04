import fs from 'fs'

let main = fs.readFileSync('electron/main.cjs', 'utf-8')

// Create globals.cjs
fs.writeFileSync('electron/globals.cjs', `
module.exports = {
  db: null,
  bm: null,
  cancelFlags: new Map()
}
`)

// Define boundaries
const startMarker = '// ==================== IPC: FACEBOOK ===================='
const endMarker = '// ==================== IPC: SMTP EMAIL ===================='

const startIndex = main.indexOf(startMarker)
const endIndex = main.indexOf(endMarker)

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found')
  process.exit(1)
}

// Extract block
let socialBlock = main.substring(startIndex, endIndex)

// Remove block from main.cjs
const helperExport = `
const helpers = {
  safeGoto, humanMouseMove, smartType, smartClick, randomDelay, saveAccount,
  encryptSecret, decryptSecret, unprotectRow, getSender, sendProgress
}
`

main = main.substring(0, startIndex) + '\n// --- SOCIAL PLATFORMS LOADED VIA REQUIRE ---\n' + helperExport + 'require("./ipc/social.cjs")(ipcm, helpers)\n\n' + main.substring(endIndex)

// Update main.cjs to use globals
// Find: let db = null
main = main.replace('let db = null', 'const globals = require("./globals.cjs")\n// let db = null')
// Find: let bm = null
main = main.replace('let bm = null', '// let bm = null')
// Find: const cancelFlags = new Map()
main = main.replace('const cancelFlags = new Map()', '// const cancelFlags = new Map()')

// Fix destructuring first
main = main.replace('registerAuthIPC({ ipcm, bm, db })', 'registerAuthIPC({ ipcm, bm: globals.bm, db: globals.db })')
socialBlock = socialBlock.replace('registerAuthIPC({ ipcm, bm, db })', 'registerAuthIPC({ ipcm, bm: globals.bm, db: globals.db })')

// In main.cjs, replace local db and bm and cancelFlags assignments
main = main.replace(/\bdb = new Database/g, 'globals.db = new Database')
main = main.replace(/\bbm = new BrowserManager/g, 'globals.bm = new BrowserManager')
main = main.replace(/\bdb\.close/g, 'globals.db.close')
main = main.replace(/\bdb = null/g, 'globals.db = null')
main = main.replace(/\bbm\.closeAll/g, 'globals.bm.closeAll')

// For any remaining usage in main.cjs, we need to map them. Since they are used in app.on and ipcm inside main.cjs.
main = main.replace(/([^a-zA-Z0-9_.])db([\.\s\=])/g, '$1globals.db$2')
main = main.replace(/([^a-zA-Z0-9_.])bm([\.\s\=])/g, '$1globals.bm$2')
main = main.replace(/([^a-zA-Z0-9_.])cancelFlags([\.\s\=])/g, '$1globals.cancelFlags$2')

// Now build social.cjs
if (!fs.existsSync('electron/ipc')) fs.mkdirSync('electron/ipc')

let socialCjs = `
const globals = require('../globals.cjs')
const { app, BrowserWindow, dialog } = require('electron')

module.exports = function(ipcm, helpers) {
  const { safeGoto, humanMouseMove, smartType, smartClick, randomDelay, saveAccount, encryptSecret, decryptSecret, unprotectRow, getSender, sendProgress } = helpers;

` + socialBlock.replace(/([^a-zA-Z0-9_.])db([\.\s\=])/g, '$1globals.db$2')
    .replace(/([^a-zA-Z0-9_.])bm([\.\s\=])/g, '$1globals.bm$2')
    .replace(/([^a-zA-Z0-9_.])cancelFlags([\.\s\=])/g, '$1globals.cancelFlags$2') + `
}
`

fs.writeFileSync('electron/ipc/social.cjs', socialCjs)
fs.writeFileSync('electron/main.cjs', main)

console.log('Modularization split completed.')
