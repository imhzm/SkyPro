const fs = require('fs');
let c = fs.readFileSync('electron/main.cjs', 'utf8');

const targetStr1 = '  }\r\n})\r\n    const userTyped = await smartType(page, [';
const targetStr2 = '  }\n})\n    const userTyped = await smartType(page, [';

const replacementStr = `  }
})

// ==================== IPC: SNAPCHAT ====================
ipcm('snapchat-login', async (e, { username, password, proxy }) => {
  let sessionId = null
  try {
    const res = await bm.launch({ proxy, headless: false, platform: 'snapchat' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = bm.getPage(sessionId)
    await page.goto('https://accounts.snapchat.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [`;

if (c.includes(targetStr1)) {
  c = c.replace(targetStr1, replacementStr.replace(/\n/g, '\r\n'));
  fs.writeFileSync('electron/main.cjs', c);
  console.log('Fixed snapchat-login syntax (CRLF)');
} else if (c.includes(targetStr2)) {
  c = c.replace(targetStr2, replacementStr);
  fs.writeFileSync('electron/main.cjs', c);
  console.log('Fixed snapchat-login syntax (LF)');
} else {
  console.log('Target string not found');
}
