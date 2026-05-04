import fs from 'fs'

let content = fs.readFileSync('electron/main.cjs', 'utf-8')

// 1. Remove duplicated block
const blockRegex = /\/\/ ==================== IPC: BROWSER ====================[\s\S]+?\/\/ ==================== IPC: BROWSER ====================/
if (content.match(blockRegex)) {
  content = content.replace(blockRegex, '// ==================== IPC: BROWSER ====================')
  console.log('Removed duplicate IPC: BROWSER block')
}

// 2. Add safeGoto function
const safeGotoCode = `
// P1-3: Enforce safe URLs for Playwright navigation
async function safeGoto(page, targetUrl, options = {}, allowedDomains = []) {
  try {
    const u = new URL(targetUrl)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new Error('Blocked unsafe protocol: ' + u.protocol)
    }
    if (allowedDomains.length > 0) {
      if (!allowedDomains.some(d => u.hostname === d || u.hostname.endsWith('.' + d))) {
        throw new Error('Blocked unapproved domain: ' + u.hostname)
      }
    }
    return await page.goto(targetUrl, options)
  } catch (err) {
    console.warn('safeGoto blocked or failed:', err.message)
    return null
  }
}
`

if (!content.includes('async function safeGoto')) {
  content = content.replace('// ==================== HUMAN BEHAVIOR HELPERS ====================', safeGotoCode + '\n// ==================== HUMAN BEHAVIOR HELPERS ====================')
  console.log('Added safeGoto function')
}

// 3. Replace dynamic page.goto with safeGoto
const dynamicVars = [
  'url', 'targetUrl', 'postUrl', 'groupUrl', 'friendUrl', 'pageUrl', 
  'groupChatUrl', 'searchUrl', 'videoUrl', 'boardUrl', 'placeUrl', 'downloadLink', 'link',
  "groupUrl.replace(/\\/$/, '')", "pageUrl.replace(/\\/$/, '') + '/messages'"
]

dynamicVars.forEach(v => {
  content = content.split('await page.goto(' + v + ',').join('await safeGoto(page, ' + v + ',')
  content = content.split('await page.goto(' + v + ')').join('await safeGoto(page, ' + v + ')')
})

fs.writeFileSync('electron/main.cjs', content)
console.log('Main.cjs cleanup and P1-3 fix completed.')
