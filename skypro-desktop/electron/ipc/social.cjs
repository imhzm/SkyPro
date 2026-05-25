
const fs = require('fs')
const path = require('path')
const globals = require('../globals.cjs')
const { app, BrowserWindow, dialog } = require('electron')
const { sanitizeRecords, isJunkName, isSystemPath } = require('./extraction-sanitizer.cjs')

module.exports = function(ipcm, helpers) {
  const { safeGoto, humanMouseMove, smartType, smartClick, smartActionClick, randomDelay, saveAccount, encryptSecret, decryptSecret, unprotectRow, getSender, sendProgress, saveLeads } = helpers;
  let jobIdCounter = 0

  // ==================== RESILIENCE LAYER ====================
  // These helpers make every tool more resilient to Facebook/Instagram/Twitter
  // changing their CSS classes by trying multiple selector strategies in order.

  /** Returns the first non-null result from an array of locator strategies. */
  async function findFirst(page, selectors, timeout = 1500) {
    for (const sel of selectors) {
      try {
        const el = await page.waitForSelector(sel, { timeout, state: 'attached' }).catch(() => null)
        if (el) return el
      } catch { /* try next */ }
    }
    return null
  }

  /** Click the first element matching any selector. Returns true if any clicked. */
  async function clickAny(page, selectors, label = '') {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel)
        if (!el) continue
        await el.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {})
        await el.click({ force: true, timeout: 3000 })
        return true
      } catch { /* try next */ }
    }
    if (label) console.warn(`clickAny[${label}] no selector matched`)
    return false
  }

  /** Wait until ANY of the selectors appears (returns the matched selector). */
  async function waitForAny(page, selectors, timeout = 15000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      for (const sel of selectors) {
        const el = await page.$(sel).catch(() => null)
        if (el) return sel
      }
      await page.waitForTimeout(250)
    }
    return null
  }

  /** Extract text from the FIRST selector that exists in the DOM. */
  async function textFromAny(page, selectors) {
    for (const sel of selectors) {
      try {
        const t = await page.$eval(sel, el => (el.innerText || el.textContent || '').trim()).catch(() => '')
        if (t) return t
      } catch { /* try next */ }
    }
    return ''
  }

  /** Retry wrapper for transient network/popup errors. */
  async function withRetry(fn, attempts = 2, label = '') {
    let lastErr
    for (let i = 0; i < attempts; i++) {
      try { return await fn() } catch (err) {
        lastErr = err
        if (label) console.warn(`withRetry[${label}] attempt ${i + 1}/${attempts} failed: ${err.message}`)
      }
    }
    throw lastErr
  }

  /** Coerce shorthand numbers like "1.2K", "3.5M" to integers. */
  function parseMetric(s) {
    if (!s) return 0
    const m = String(s).match(/([\d,.]+)\s*([KkMmBb])?/)
    if (!m) return 0
    const n = parseFloat(m[1].replace(/,/g, ''))
    if (!isFinite(n)) return 0
    const suffix = (m[2] || '').toLowerCase()
    if (suffix === 'k') return Math.round(n * 1000)
    if (suffix === 'm') return Math.round(n * 1000000)
    if (suffix === 'b') return Math.round(n * 1000000000)
    return Math.round(n)
  }

  /** Try to extract JSON-LD structured data from a page (used as fallback when DOM CSS changes). */
  async function readJsonLd(page) {
    try {
      const blocks = await page.$$eval('script[type="application/ld+json"]', els => els.map(e => e.textContent))
      const out = []
      for (const raw of blocks) {
        try {
          const parsed = JSON.parse(raw)
          out.push(...(Array.isArray(parsed) ? parsed : [parsed]))
        } catch { /* skip malformed */ }
      }
      return out
    } catch { return [] }
  }

  /** Generate message variations using a synonyms map to dodge spam detection. */
  function rotateMessage(template, synonyms = {}) {
    if (!template) return template
    let out = template
    // Replace {key|key2} placeholders with random pick.
    out = out.replace(/\{([^{}]+)\}/g, (_, keys) => {
      const list = keys.split('|').map(s => s.trim()).filter(Boolean)
      return list[Math.floor(Math.random() * list.length)] || ''
    })
    // Apply synonym swaps for given keys (10% chance to swap each occurrence).
    for (const [word, alts] of Object.entries(synonyms)) {
      const list = Array.isArray(alts) ? alts : [alts]
      if (list.length === 0) continue
      const re = new RegExp(word, 'gi')
      out = out.replace(re, () => {
        if (Math.random() < 0.7) return list[Math.floor(Math.random() * list.length)]
        return word
      })
    }
    // Randomize trailing space variation.
    if (Math.random() < 0.3) out = out + ' '
    return out
  }

  // Pre-flight: ensure the session is valid and the page is on the right
  // platform before any IPC handler tries to interact. Returns a structured
  // result that callers can short-circuit on.
  async function ensurePlatformReady(sessionId, platform, opts = {}) {
    const page = globals.bm.getPage(sessionId)
    if (!page) return { ok: false, error: 'الجلسة غير موجودة. سجل الدخول أولاً.' }
    try {
      const url = page.url() || ''
      // If the page is on a login URL, the session is dead.
      const loginPatterns = {
        facebook: /\/login|\/checkpoint/i,
        instagram: /\/accounts\/login/i,
        twitter: /\/i\/flow\/login/i,
        linkedin: /\/login|\/checkpoint/i,
        whatsapp: /\/qr/i,
        telegram: /\/login/i,
      }
      const re = loginPatterns[platform]
      if (re && re.test(url)) {
        return { ok: false, error: 'الجلسة منتهية — سجل الدخول مرة أخرى.' }
      }
      if (opts.expectLogin) {
        // Caller asked for a fully-logged-in page (most extract tools).
        const guard = await verifyExtractionPage(page, { platform, timeoutMs: opts.timeoutMs || 4000 })
        if (!guard.ok) return { ok: false, error: guard.error }
      }
      return { ok: true, page }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  // ==================== END RESILIENCE LAYER ====================

  /**
   * Pre-extraction guard. Confirms the page actually rendered logged-in
   * content before scrapers try to read selectors. Without this check, an
   * expired session would just return [] silently — looking like the
   * extraction failed when really the user got bounced to login.
   *
   * Returns `{ ok: true }` if logged in, or `{ ok: false, error }` with a
   * clear Arabic message so the renderer can show it to the user.
   */
  async function verifyExtractionPage(page, opts = {}) {
    const { platform = 'facebook', timeoutMs = 6000 } = opts
    try {
      // Wait for DOM to settle.
      await page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => {})

      // Detect being bounced to a login screen.
      const url = page.url() || ''
      if (/\/login|\/checkpoint|\/signin|\/accounts\/login/i.test(url)) {
        return { ok: false, error: 'انتهت الجلسة — سجل الدخول مرة أخرى ثم أعد المحاولة' }
      }

      // Poll briefly for either logged-in OR logged-out selectors.
      const LOGGED_OUT = {
        facebook: ['form[action*="/login"]', '#login_form', 'input[name="login"]'],
        instagram: ['input[name="username"]', 'form#loginForm'],
        twitter: ['a[href="/i/flow/login"]', '[data-testid="loginButton"]'],
        x: ['a[href="/i/flow/login"]', '[data-testid="loginButton"]'],
        linkedin: ['form.login__form', 'input[name="session_key"]'],
      }[platform] || []

      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (LOGGED_OUT.length > 0) {
          const out = await page.evaluate(
            (sel) => sel.some((s) => !!document.querySelector(s)),
            LOGGED_OUT,
          ).catch(() => false)
          if (out) return { ok: false, error: 'صفحة تسجيل دخول — الجلسة منتهية' }
        }
        // Some content rendered means we can start extracting.
        const ready = await page.evaluate(
          () => document.body && document.body.innerText.length > 200,
        ).catch(() => false)
        if (ready) return { ok: true }
        await page.waitForTimeout(300)
      }

      // Final body check after timeout.
      const bodyLen = await page.evaluate(() => document.body?.innerText?.length || 0).catch(() => 0)
      if (bodyLen < 50) {
        return { ok: false, error: 'الصفحة لم تحمّل أو فارغة — تأكد من الاتصال ثم أعد المحاولة' }
      }
      return { ok: true }
    } catch (err) {
      console.error('verifyExtractionPage error:', err.message)
      // Don't block extraction on a verification crash.
      return { ok: true }
    }
  }

// ==================== IPC: FACEBOOK ====================
ipcm('facebook-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'facebook', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    
    // Check if already logged in (persistent context may have cookies)
    const currentUrl = page.url()
    if (currentUrl && !currentUrl.includes('login') && !currentUrl.includes('about:blank')) {
      await page.waitForTimeout(3000)
      const loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('[data-testid="blue_bar"]') || document.querySelector('[role="navigation"]') || document.querySelector('div[role="main"]') || document.querySelector('[aria-label="Facebook"]') || document.querySelector('a[aria-label="Home"]'))
      }).catch(() => false)
      if (loggedIn) {
        saveAccount('facebook', username, password || 'saved')
        return { success: true, message: 'تم تسجيل الدخول بنجاح - الجلسة محفوظة', sessionId }
      }
    }
    
    await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    
    const emailTyped = await smartType(page, [
      '#email', 'input[name="email"]', 'input[aria-label*="Email"]', 'input[aria-label*="بريد"]',
      'input[type="email"]', 'input[data-testid="royal_email"]', 'input[id*="email"]'
    ], username, 'email')
    if (!emailTyped) return { success: false, error: 'لم يتم العثور على حقل البريد الإلكتروني', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    const passTyped = await smartType(page, [
      '#pass', 'input[name="pass"]', 'input[type="password"]', 'input[aria-label*="Password"]',
      'input[aria-label*="كلمة"]', 'input[data-testid="royal_pass"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button[name="login"]', '#loginbutton',
      'button[data-testid="royal_login_button"]', 'button:has-text("Log In")', 'button:has-text("تسجيل")'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
    await smartActionClick(page, ['div[role="button"]:has-text("Save Info")', 'div[role="button"]:has-text("Save info")', 'div[role="button"]:has-text("حفظ")', 'div[role="button"]:has-text("حفظ المعلومات")'], 'dismiss save info')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartActionClick(page, ['div[role="button"]:has-text("Not Now")', 'div[role="button"]:has-text("ليس الآن")', 'div[role="button"]:has-text("لاحقاً")', 'button:has-text("Not Now")'], 'dismiss not now')
    await page.waitForTimeout(randomDelay(1000, 2000))
    const finalUrl = page.url()
    if (!finalUrl.includes('login') && !finalUrl.includes('checkpoint')) {
      saveAccount('facebook', username, password)
      return { success: true, message: 'تم تسجيل الدخول بنجاح', sessionId }
    }
    if (finalUrl.includes('checkpoint')) {
      return { success: true, message: 'تم تسجيل الدخول - يرجى إكمال التحقق الأمني في المتصفح', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول - تحقق من البيانات', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('facebook-search', async (e, { sessionId, query, type = 'all', limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    const t = type === 'people' ? 'people' : type === 'groups' ? 'groups' : 'posts'
    await page.goto(`https://www.facebook.com/search/${t}/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const data = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[role="main"] a[href*="/"]').forEach((a, i) => {
        if (i >= lim) return
        const href = a.getAttribute('href') || ''
        if (href.startsWith('/')) {
          r.push({ name: a.innerText.trim(), profile: 'https://www.facebook.com' + href })
        } else if (href.includes('facebook.com')) {
          r.push({ name: a.innerText.trim(), profile: href })
        }
      })
      return r
    }, limit)
    saveLeads('facebook', 'search', data)
    return { success: true, data, count: data.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-extract-likers', async (e, { sessionId, postUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `likers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allUsers = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const guard = await verifyExtractionPage(page, { platform: 'facebook' })
    if (!guard.ok) return { success: false, error: guard.error, jobId }
    const reactionsBtn = await page.$('div[role="button"][aria-label*="eactions"], div[role="button"][aria-label*="إعجاب"], span[data-testid*="UFI2ReactionsCount"], a[role="button"][href*="reactions"]')
    if (reactionsBtn) {
      await reactionsBtn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
    }
    const maxScrolls = Math.max(Math.ceil(limit / 15), 5)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => { const modal = document.querySelector('[role="dialog"]'); if (modal) modal.scrollTop = modal.scrollHeight; else window.scrollTo(0, document.body.scrollHeight) })
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingCount) => {
        const r = []
        const seen = new Set(existingCount.map(u => u.name))
        const modal = document.querySelector('[role="dialog"]') || document.body
        modal.querySelectorAll('a[href*="/"]').forEach((a) => {
          const href = a.getAttribute('href') || ''
          const name = a.innerText.trim()
          if (!name || name.length < 2 || name.length > 60 || seen.has(name)) return
          if (!href.includes('facebook.com') && !href.startsWith('/')) return
          const skipPaths = ['/posts/', '/groups/', '/watch/', '/reel/', '/stories/', '/photo/', '/photos/', '/videos/', '/events/', '/marketplace/', '/gaming/', '/login', '/recover/', '/checkpoint/', '/help/', '/settings/', '/legal/', '/notifications/', '/messages/', '/friends/', '/bookmarks/']
          if (skipPaths.some(p => href.includes(p))) return
          seen.add(name)
          let userId = ''
          const idMatch = href.match(/id=(\d+)/)
          const profileMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
          if (idMatch) userId = idMatch[1]
          else if (profileMatch && !['posts','groups','watch','reel','stories','photo','photos','videos','events','marketplace','gaming','login','recover','checkpoint'].includes(profileMatch[1])) userId = profileMatch[1]
          r.push({ name, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, allUsers)
      for (const u of batch) {
        if (allUsers.length >= limit) break
        allUsers.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allUsers.length, total: limit, data: batch })
      if (allUsers.length >= limit) break
    }
    saveLeads('facebook', 'post-likers', allUsers)
    return { success: true, data: allUsers, count: allUsers.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allUsers }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-comments', async (e, { sessionId, postUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `comments-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allComments = []
  const seenNames = new Set()
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const guard = await verifyExtractionPage(page, { platform: 'facebook' })
    if (!guard.ok) return { success: false, error: guard.error, jobId }
    const maxScrolls = Math.max(Math.ceil(limit / 8), 8)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      try {
        const moreBtn = await page.$('div[role="button"]:has-text("View more comments"), div[role="button"]:has-text("عرض المزيد من التعليقات"), div[role="button"]:has-text("عرض المزيد")')
        if (moreBtn) { await moreBtn.click({ force: true }); await page.waitForTimeout(2000) }
      } catch (ex) { console.error('Click more comments:', ex.message) }
      const batch = await page.evaluate((existingNames, lim) => {
        const r = []
        const seen = new Set(existingNames)
        document.querySelectorAll('[role="article"]').forEach((art) => {
          if (r.length >= 50) return
          const nameEl = art.querySelector('a[role="link"] span span, a[role="link"] span, h3 a span')
          const linkEl = art.querySelector('a[role="link"][href*="/"]')
          const textEl = art.querySelector('div[dir="auto"] span[dir="auto"], div[dir="auto"] span')
          const name = nameEl ? nameEl.innerText.trim() : ''
          if (!name || name.length < 2 || seen.has(name)) return
          seen.add(name)
          const href = linkEl ? linkEl.getAttribute('href') || '' : ''
          let userId = ''
          const idMatch = href.match(/id=(\d+)/)
          const profileMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
          if (idMatch) userId = idMatch[1]
          else if (profileMatch && !['posts','groups','watch','reel','stories','photo','photos','videos','events','marketplace','gaming','login','recover','checkpoint'].includes(profileMatch[1])) userId = profileMatch[1]
          r.push({ name, text: textEl ? textEl.innerText.trim() : '', profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, [...seenNames], limit - allComments.length)
      for (const c of batch) {
        if (allComments.length >= limit) break
        if (!seenNames.has(c.name)) {
          seenNames.add(c.name)
          allComments.push(c)
        }
      }
      sendProgress(sender, jobId, { type: 'progress', count: allComments.length, total: limit, data: batch })
      if (allComments.length >= limit) break
    }
    saveLeads('facebook', 'post-comments', allComments)
    return { success: true, data: allComments, count: allComments.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allComments }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-group-members', async (e, { sessionId, groupUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `group-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allMembers = []
  try {
    await page.goto(`${groupUrl.replace(/\/$/, '')}/members`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const guard = await verifyExtractionPage(page, { platform: 'facebook' })
    if (!guard.ok) return { success: false, error: guard.error, jobId }
    const maxScrolls = Math.max(Math.ceil(limit / 10), 8)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingCount) => {
        const r = []
        const seen = new Set(existingCount.map(u => u.name))
        const mainContent = document.querySelector('[role="main"]') || document.body
        mainContent.querySelectorAll('a[href*="/"]').forEach((a) => {
          const href = a.getAttribute('href') || ''
          const name = a.innerText.trim()
          if (!name || name.length < 2 || name.length > 60 || seen.has(name)) return
          if (href.includes('/groups/') && !href.includes('/user/')) return
          if (href.includes('/help/') || href.includes('/settings') || href.includes('/login') || href.includes('/legal/')) return
          seen.add(name)
          let userId = ''
          const idMatch = href.match(/id=(\d+)/)
          const profileMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
          if (idMatch) userId = idMatch[1]
          else if (profileMatch && !['posts','groups','watch','reel','stories','photo','photos','videos','events','marketplace','gaming','login','recover','checkpoint'].includes(profileMatch[1])) userId = profileMatch[1]
          r.push({ name, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, allMembers)
      for (const u of batch) {
        if (allMembers.length >= limit) break
        allMembers.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allMembers.length, total: limit, data: batch })
      if (allMembers.length >= limit) break
    }
    saveLeads('facebook', 'group-members', allMembers)
    return { success: true, data: allMembers, count: allMembers.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allMembers }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-friends', async (e, { sessionId, limit = 100, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `friends-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  let allFriends = []
  try {
    await page.goto('https://www.facebook.com/me/friends', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const maxScrolls = Math.max(Math.ceil(limit / 10), 10)

    // Track seen profile URLs (the unique identifier — not the displayed
    // name, which collides between people who share a name).
    const seenUrls = new Set()
    const raw = []

    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate(() => {
        const r = []
        // STRICT scoping: friends live inside [role="main"] but we go a level
        // deeper to skip the page header. A friend tile is a div that wraps:
        //   - an avatar <image> inside an <svg>
        //   - the friend's name as the anchor's text
        //   - optional "X mutual friends" link
        // We look for anchors with an aria-label OR a structured tile pattern,
        // and we reject anything where the link text is empty or the URL is
        // a system path.
        const main = document.querySelector('[role="main"]')
        if (!main) return r
        // Find all profile-style anchors (matching /profile.php?id= or /handle)
        const candidates = main.querySelectorAll('a[href*="/profile.php?id="], a[href^="/"]:not([href*="/posts/"]):not([href*="/groups/"])')
        const seenInPass = new Set()
        for (const a of candidates) {
          let href = a.getAttribute('href') || ''
          if (!href) continue
          // Strip query params for system-path check but keep them in the
          // stored URL (we need profile.php?id=... intact).
          const pathOnly = href.split('?')[0]
          // Reject anchors pointing to non-profile FB sections.
          const seg1 = pathOnly.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '').split('/')[0].toLowerCase()
          const SYSTEM = new Set(['login','help','settings','legal','policies','marketplace','watch','reel','reels','stories','story','groups','group','events','event','notes','gaming','messages','messenger','notifications','friends','find-friends','bookmarks','ads','live','i','flx','flow','public','accounts','direct','explore','hashtag','tags','tag','oauth','auth','recover','checkpoint','signup','reg','r','about','careers','directory','business','developers','photo','photos','video','videos','home','logout'])
          // Empty seg1 = root page link, skip.
          if (!seg1 || SYSTEM.has(seg1)) continue
          // Name from the anchor's text — but EXCLUDE text from nested badge
          // links (those are the "X mutual friends" subtext).
          // Strategy: find a span/strong inside the anchor that holds JUST
          // the name (no digit prefix, no UI label).
          let name = ''
          const spans = a.querySelectorAll('span, strong')
          for (const s of spans) {
            const t = (s.innerText || s.textContent || '').trim()
            if (!t) continue
            // Skip badge text (digits-prefixed mutual-friend hints)
            if (/^\d+\s+(صديق|اصدقاء|أصدقاء|mutual|friend)/i.test(t)) continue
            if (t.length >= 2 && t.length <= 60) { name = t; break }
          }
          if (!name) name = (a.innerText || '').trim().split('\n')[0].trim()
          if (!name) continue
          // Build absolute URL.
          const absUrl = href.startsWith('http') ? href : 'https://www.facebook.com' + (href.startsWith('/') ? href : '/' + href)
          if (seenInPass.has(absUrl)) continue
          seenInPass.add(absUrl)
          r.push({ name, profile: absUrl, platform: 'facebook' })
        }
        return r
      })

      // Apply centralized sanitizer + URL-based dedup.
      for (const item of batch) {
        if (seenUrls.has(item.profile)) continue
        seenUrls.add(item.profile)
        raw.push(item)
      }
      const cleaned = sanitizeRecords(raw, { platform: 'facebook', kind: 'friends' })
      // Trim to the requested limit.
      if (cleaned.length >= limit) {
        allFriends = cleaned.slice(0, limit)
        sendProgress(sender, jobId, { type: 'progress', count: allFriends.length, total: limit, data: allFriends })
        break
      }
      allFriends = cleaned
      sendProgress(sender, jobId, { type: 'progress', count: allFriends.length, total: limit, data: allFriends })
    }

    saveLeads('facebook', 'friends', allFriends)
    return { success: true, data: allFriends, count: allFriends.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allFriends }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-page-followers', async (e, { sessionId, pageUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `followers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allFollowers = []
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const followersTab = await page.$('a[href*="followers"], a:has-text("Followers"), a:has-text("متابعين")')
    if (followersTab) { await followersTab.click({ force: true }); await page.waitForTimeout(randomDelay(2000, 4000)) }
    else {
      await page.goto(pageUrl.replace(/\/$/, '') + '/followers', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
    }
    const maxScrolls = Math.max(Math.ceil(limit / 10), 5)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingNames) => {
        const r = []
        const seen = new Set(existingNames)
        document.querySelectorAll('a[href*="/"]').forEach((a) => {
          const href = a.getAttribute('href') || ''
          const name = a.innerText.trim()
          if (!name || name.length < 2 || name.length > 60 || seen.has(name)) return
          if (href.includes('/help/') || href.includes('/settings') || href.includes('/login') || href.includes('/legal/')) return
          if (!href.includes('/profile.php') && !href.startsWith('/') && !href.includes('facebook.com/')) return
          seen.add(name)
          let userId = ''
          const idMatch = href.match(/id=(\d+)/)
          const profileMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
          if (idMatch) userId = idMatch[1]
          else if (profileMatch && !['posts','groups','watch','reel','stories','photo','photos','videos','events','marketplace','gaming','login','recover','checkpoint'].includes(profileMatch[1])) userId = profileMatch[1]
          r.push({ name, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, allFollowers.map(f => f.name))
      for (const u of batch) {
        if (allFollowers.length >= limit) break
        allFollowers.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allFollowers.length, total: limit, data: batch })
      if (allFollowers.length >= limit) break
    }
    saveLeads('facebook', 'page-followers', allFollowers)
    return { success: true, data: allFollowers, count: allFollowers.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allFollowers }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-phones', async (e, { sessionId, postUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `phones-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allPhones = []
  const seenPhones = new Set()
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const maxScrolls = Math.max(Math.ceil(limit / 5), 8)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      if (allPhones.length >= limit) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingPhones) => {
        const r = []
        const seen = new Set(existingPhones)
        const phoneRegex = /(\+?\d[\d\s\-]{7,}\d)/g
        document.querySelectorAll('[role="article"]').forEach(article => {
          const text = article.innerText
          const nameEl = article.querySelector('a[role="link"]')
          const name = nameEl ? nameEl.innerText.trim() : ''
          const profile = nameEl ? nameEl.href : ''
          const matches = text.match(phoneRegex)
          if (matches) matches.forEach(phone => {
            const p = phone.trim()
            if (!seen.has(p)) { seen.add(p); r.push({ name, profile, phone: p, platform: 'facebook' }) }
          })
        })
        return r
      }, [...seenPhones])
      for (const p of batch) {
        if (allPhones.length >= limit) break
        if (!seenPhones.has(p.phone)) { seenPhones.add(p.phone); allPhones.push(p) }
      }
      sendProgress(sender, jobId, { type: 'progress', count: allPhones.length, total: limit, data: batch })
      if (allPhones.length >= limit) break
    }
    saveLeads('facebook', 'phone-numbers', allPhones)
    return { success: true, data: allPhones, count: allPhones.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allPhones }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-post-details', async (e, { sessionId, postUrl }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const details = await page.evaluate((url) => {
      const result = { author: '', text: '', likes: 0, comments: 0, shares: 0, date: '', url: window.location.href, images: [], videos: [], postType: '' }
      const authorSelectors = ['a[role="link"] strong span', 'h2 a span', 'a[role="link"][href*="/"] span span', '[data-ad-preview] a span', 'a[role="link"] span']
      for (const sel of authorSelectors) {
        const el = document.querySelector(sel)
        if (el && el.innerText.trim().length > 1 && el.innerText.trim().length < 60) { result.author = el.innerText.trim(); break }
      }
      const textSelectors = ['div[data-ad-comet-preview="message"] span', 'div[dir="auto"] span[dir="auto"]', '[role="article"] div[dir="auto"] > span', 'div.x1iorvi4 > span']
      for (const sel of textSelectors) {
        const el = document.querySelector(sel)
        if (el && el.innerText.trim().length > 3) { result.text = el.innerText.trim(); break }
      }
      const body = document.body.innerText
      const lm = body.match(/([\d,]+(?:\.\d+)?)\s*(?:likes|Like|أعجبني|إعجاب)/i); if (lm) result.likes = parseInt(lm[1].replace(/,/g, '')) || 0
      const cm = body.match(/([\d,]+(?:\.\d+)?)\s*(?:comments?|comment|تعليق|تعليقات)/i); if (cm) result.comments = parseInt(cm[1].replace(/,/g, '')) || 0
      const sm = body.match(/([\d,]+(?:\.\d+)?)\s*(?:shares?|share|مشاركة|مشاركات)/i); if (sm) result.shares = parseInt(sm[1].replace(/,/g, '')) || 0
      const timeEl = document.querySelector('[role="article"] abbr, [role="article"] time, a[role="link"] abbr')
      if (timeEl) result.date = timeEl.innerText.trim() || timeEl.getAttribute('title') || timeEl.getAttribute('datetime') || ''
      document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]').forEach((img, i) => { if (i < 5 && img.width > 100) result.images.push(img.src) })
      document.querySelectorAll('video[src]').forEach((v, i) => { if (i < 2) result.videos.push(v.src) })
      if (result.text.length > 0) result.postType = 'text'
      if (result.images.length > 0) result.postType = result.images.length > 1 ? 'album' : 'image'
      if (result.videos.length > 0) result.postType = 'video'
      return result
    }, postUrl)
    saveLeads('facebook', 'post-details', [details])
    return { success: true, data: details }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-post-groups', async (e, { sessionId, groups, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const groupUrl of groups) {
    try {
      await page.goto(groupUrl.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(3000, 5000))
      const composerBtns = [
        'div[role="button"][aria-label*="Write"], div[role="button"][aria-label*="Create"], div[role="button"][aria-label*="اكتب"]',
        'div[role="button"]:has-text("Write something"), div[role="button"]:has-text("اكتب شيئًا")',
        'a[role="button"]:has-text("Write Post"), a[role="button"]:has-text("كتابة منشور")',
        'div[role="button"][aria-label*="Post"], div[role="button"][aria-label*="منشور"]'
      ]
      let composer = null
      for (const sel of composerBtns) {
        composer = await page.$(sel)
        if (composer) break
      }
      if (composer) {
        await composer.click({ force: true }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 4000))
        const input = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"][aria-label*="Write"], div[contenteditable="true"][aria-label*="اكتب"], div[contenteditable="true"]')
        if (input) {
          await input.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(message, { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(1000, 2000))
          const postBtn = await page.$('div[role="button"]:has-text("Post"), div[role="button"]:has-text("نشر"), div[aria-label="Post"], div[aria-label="نشر"]')
          if (postBtn) { await postBtn.click({ force: true }); await page.waitForTimeout(randomDelay(3000, 5000)) }
          results.push({ group: groupUrl, status: 'posted' })
        } else {
          results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' })
        }
      } else {
        results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على زر النشر' })
      }
    } catch (err) {
      results.push({ group: groupUrl, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  return { success: true, data: results }
})

ipcm('facebook-send-messages', async (e, { sessionId, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const recipient of recipients) {
    try {
      await page.goto(`https://www.facebook.com/messages/t/${recipient}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
      const input = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"]')
      if (input) {
        await input.click({ force: true })
        await page.waitForTimeout(randomDelay(500, 1000))
        await page.keyboard.type(message, { delay: 50 + Math.random() * 100 })
        await page.waitForTimeout(randomDelay(1000, 2000))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed', error: 'لم يتم العثور على حقل الرسالة' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  return { success: true, data: results }
})

ipcm('facebook-mention', async (e, { sessionId, postUrls, usernames, text }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const urls = Array.isArray(postUrls) ? postUrls : [postUrls]
  const names = Array.isArray(usernames) ? usernames : (usernames ? usernames.split('\n').filter(Boolean) : [])
  if (names.length === 0) return { success: false, error: 'أدخل أسماء المستخدمين للمنشن' }
  const results = []
  for (const postUrl of urls) {
    try {
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
      for (const name of names) {
        try {
          const commentInput = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"][aria-label*="comment"], div[contenteditable="true"][aria-label*="تعليق"]')
          if (!commentInput) {
            const replyBtns = await page.$$('div[role="button"]:has-text("Comment"), div[role="button"]:has-text("تعليق"), div[role="button"]:has-text("Write"), div[role="button"]:has-text("اكتب")')
            if (replyBtns.length > 0) { await replyBtns[0].click({ force: true }); await page.waitForTimeout(randomDelay(1000, 2000)) }
          }
          const finalInput = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"]')
          if (finalInput) {
            await finalInput.click({ force: true })
            await page.waitForTimeout(randomDelay(500, 1000))
            const mentionText = `@${name.replace(/^@/, '')} ${text || ''}`
            await page.keyboard.type(mentionText, { delay: 50 + Math.random() * 100 })
            await page.waitForTimeout(randomDelay(500, 1500))
            await page.keyboard.press('Enter')
            await page.waitForTimeout(randomDelay(2000, 4000))
          }
          results.push({ name, postUrl, status: 'mentioned' })
        } catch (err) {
          results.push({ name, postUrl, status: 'error', error: err.message })
        }
        await page.waitForTimeout(randomDelay(1500, 3000))
      }
    } catch (err) {
      results.push({ postUrl, status: 'error', error: err.message })
    }
  }
  saveLeads('facebook', 'mention', results)
  return { success: true, data: results, count: results.filter(r => r.status === 'mentioned').length }
})

ipcm('facebook-share-post', async (e, { sessionId, postUrl, groups }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const groupUrl of groups) {
    try {
      await page.goto(groupUrl.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
      const composer = await page.$('div[role="button"][aria-label*="Write"], div[role="button"][aria-label*="Create"], div[role="button"][aria-label*="اكتب"]')
        || await page.$('div[role="button"]:has-text("Write something"), div[role="button"]:has-text("اكتب شيئًا")')
      if (composer) {
        await composer.click({ force: true })
        await page.waitForTimeout(randomDelay(1500, 3000))
        const input = await page.$('div[contenteditable="true"]')
        if (input) {
          await input.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(postUrl, { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(3000, 5000))
          const postBtn = await page.$('div[role="button"]:has-text("Post"), div[role="button"]:has-text("نشر")')
          if (postBtn) {
            await postBtn.click({ force: true })
            await page.waitForTimeout(randomDelay(3000, 5000))
            results.push({ group: groupUrl, status: 'shared' })
          } else {
            results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على زر النشر' })
          }
        } else {
          results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' })
        }
      } else {
        results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على أداة الكتابة' })
      }
    } catch (err) {
      results.push({ group: groupUrl, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('facebook-auto-reply', async (e, { sessionId, postUrl, replyText, limit = 10 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const replies = typeof replyText === 'string' ? [replyText] : replyText
    const results = []
    const commentArticles = await page.$$('[role="article"]')
    const count = Math.min(Math.max(commentArticles.length - 1, 0), limit)
    for (let i = 1; i <= count; i++) {
      try {
        const article = commentArticles[i]
        if (!article) continue
        const replyBtn = await article.$('div[role="button"]:has-text("Reply"), div[role="button"]:has-text("رد"), div[role="button"]:has-text("الرد"), button:has-text("Reply")')
        if (replyBtn) {
          await replyBtn.click({ force: true }).catch(() => {})
          await page.waitForTimeout(randomDelay(1000, 2000))
        }
        const replyBox = await page.$('div[contenteditable="true"][role="textbox"]:not([aria-label*="Write"])')
        if (replyBox) {
          await replyBox.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(replies[i % replies.length] || replies[0], { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(500, 1500))
          await page.keyboard.press('Enter')
          results.push({ index: i, status: 'replied' })
        } else {
          results.push({ index: i, status: 'skipped', error: 'لم يتم العثور على حقل الرد' })
        }
      } catch (ex) {
        results.push({ index: i, status: 'error', error: ex.message })
      }
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    return { success: true, data: results, count: results.filter(r => r.status === 'replied').length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-send-friend-requests', async (e, { sessionId, profileUrls }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const url of profileUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const addBtnSelectors = ['div[role="button"]:has-text("Add Friend")', 'div[role="button"]:has-text("إضافة صديق")', 'div[role="button"][aria-label*="Add Friend"]', 'div[role="button"][aria-label*="إضافة صديق"]']
      if (await smartActionClick(page, addBtnSelectors, 'add friend')) {
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ url, status: 'sent' })
      } else {
        results.push({ url, status: 'skipped', error: 'Already sent or already friends' })
      }
    } catch (err) {
      results.push({ url, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  return { success: true, data: results }
})

ipcm('facebook-delete-friends', async (e, { sessionId, friendUrls = [], deleteAll = false, limit = 20 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  try {
    if (deleteAll || friendUrls.length === 0) {
      await page.goto('https://www.facebook.com/me/friends', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(3000, 5000))
      for (let i = 0; i < Math.ceil(limit / 5); i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(randomDelay(2000, 4000))
      }
      const friendCards = await page.$$('div[data-visualcompletion] a[role="link"], [role="main"] div > div > div > a[role="link"]')
      const count = Math.min(friendCards.length, limit)
      for (let i = 0; i < count; i++) {
        try {
          const card = friendCards[i]
          const name = await card.innerText().catch(() => '')
          await card.click({ force: true }).catch(() => {})
          await page.waitForTimeout(randomDelay(2000, 4000))
          const unfriendBtn = await page.$('div[role="button"]:has-text("Unfriend"), div[role="button"]:has-text("إلغاء الصداقة"), a[role="button"]:has-text("Unfriend"), a[role="button"]:has-text("إلغاء الصداقة")')
          if (unfriendBtn) {
            await unfriendBtn.click({ force: true }).catch(() => {})
            await page.waitForTimeout(randomDelay(1000, 2000))
            const confirmBtn = await page.$('div[role="button"]:has-text("Confirm"), div[role="button"]:has-text("تأكيد")')
            if (confirmBtn) { await confirmBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(randomDelay(1000, 2000)) }
            results.push({ name: name.split('\n')[0], status: 'deleted' })
          } else {
            results.push({ name: name.split('\n')[0], status: 'skipped', error: 'لم يتم العثور على زر إلغاء الصداقة' })
          }
          await page.goto('https://www.facebook.com/me/friends', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(3000, 6000))
        } catch (err) { results.push({ status: 'error', error: err.message }) }
        if (results.length >= limit) break
      }
    } else {
      for (const friendUrl of friendUrls) {
        try {
          await page.goto(friendUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(2000, 4000))
          const unfriendBtn = await page.$('div[role="button"]:has-text("Unfriend"), div[role="button"]:has-text("إلغاء الصداقة"), div[role="button"][aria-label*="Unfriend"], div[role="button"][aria-label*="إلغاء الصداقة"]')
          if (unfriendBtn) {
            await unfriendBtn.click({ force: true }).catch(() => {})
            await page.waitForTimeout(randomDelay(1000, 2000))
            const confirmBtn = await page.$('div[role="button"]:has-text("Confirm"), div[role="button"]:has-text("تأكيد")')
            if (confirmBtn) { await confirmBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(randomDelay(1000, 2000)) }
            results.push({ url: friendUrl, status: 'deleted' })
          } else {
            results.push({ url: friendUrl, status: 'skipped', error: 'لم يتم العثور على زر إلغاء الصداقة' })
          }
        } catch (err) { results.push({ url: friendUrl, status: 'error', error: err.message }) }
        await page.waitForTimeout(randomDelay(3000, 6000))
      }
    }
    saveLeads('facebook', 'delete-friends', results)
    return { success: true, data: results, count: results.filter(r => r.status === 'deleted').length }
  } catch (err) { return { success: false, error: err.message } }
})

ipcm('facebook-interaction-farm', async (e, { sessionId, postUrls, action = 'like' }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const url of postUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      if (action === 'like') {
        if (await smartActionClick(page, ['div[role="button"][aria-label*="Like"]:not([aria-label*="Unlike"])', 'div[role="button"][aria-label*="أعجبني"]:not([aria-label*="إزالة"])'], 'like')) {
          results.push({ url, status: 'liked' })
        } else {
          results.push({ url, status: 'skipped', error: 'Like button not found or already liked' })
        }
      } else if (action === 'love') {
        const likeBtn = await page.$('div[role="button"][aria-label*="Like"]:not([aria-label*="Unlike"]), div[role="button"][aria-label*="أعجبني"]')
        if (likeBtn) {
          await likeBtn.hover()
          await page.waitForTimeout(randomDelay(500, 1000))
          if (await smartActionClick(page, ['div[role="button"][aria-label*="Love"]', 'div[role="button"][aria-label*="أحبني"]'], 'love')) {
            results.push({ url, status: 'loved' })
          } else { await likeBtn.click(); results.push({ url, status: 'liked' }) }
        }
      } else if (action === 'comment') {
        const commentInput = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"][aria-label*="comment"], div[contenteditable="true"][aria-label*="تعليق"]')
        if (commentInput) {
          const comments = ['👍', 'ممتاز', 'رائع', 'شكرا', 'جزاك الله خيرا', 'مفيد جدا']
          await smartActionClick(page, ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"][aria-label*="comment"]', 'div[contenteditable="true"][aria-label*="تعليق"]'], 'comment input')
          await smartType(page, ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"][aria-label*="comment"]', 'div[contenteditable="true"][aria-label*="تعليق"]'], comments[Math.floor(Math.random() * comments.length)], 'comment')
          await page.waitForTimeout(randomDelay(500, 1500))
          await page.keyboard.press('Enter')
          results.push({ url, status: 'commented' })
        }
      }
      await page.waitForTimeout(randomDelay(3000, 6000))
    } catch (err) {
      results.push({ url, status: 'error', error: err.message })
    }
  }
  return { success: true, data: results, count: results.filter(r => r.status !== 'error').length }
})

ipcm('facebook-delete-posts', async (e, { sessionId, limit = 10 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto('https://www.facebook.com/profile.php', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const results = []
    for (let i = 0; i < limit; i++) {
      try {
        const moreBtn = await page.$('div[role="button"][aria-label*="More"], div[role="button"][aria-label*="المزيد"]')
        if (!moreBtn) break
        await smartActionClick(page, ['div[role="button"][aria-label*="More"]', 'div[role="button"][aria-label*="المزيد"]'], 'more button')
        await page.waitForTimeout(randomDelay(1000, 2000))
        const deleted = await smartActionClick(page, ['div[role="menuitem"]:has-text("Delete")', 'div[role="menuitem"]:has-text("حذف")', 'span:has-text("Move to trash")'], 'delete option')
        if (!deleted) break
        await page.waitForTimeout(randomDelay(1000, 2000))
        await smartActionClick(page, ['div[role="button"]:has-text("Delete")', 'div[role="button"]:has-text("حذف")'], 'confirm delete')
        results.push({ status: 'deleted' })
        await page.waitForTimeout(randomDelay(2000, 4000))
      } catch (e) { break }
    }
    return { success: true, data: results, count: results.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-analyze-group', async (e, { sessionId, groupUrl }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(3000, 5000))
    const analysis = await page.evaluate(() => {
      const result = { name: '', members: 0, privacy: '', description: '', postCount: 0 }
      const nameEl = document.querySelector('h1 span, h1')
      if (nameEl) result.name = nameEl.innerText.trim()
      const bodyText = document.body.innerText
      const membersMatch = bodyText.match(/(\d[\d,.\s]*)\s*(?:members|member|أعضاء|عضو|عضوًا)/i)
      if (membersMatch) result.members = parseInt(membersMatch[1].replace(/[,\s.]/g, '')) || 0
      if (bodyText.includes('Public') || bodyText.includes('عامة') || bodyText.includes('عام')) result.privacy = 'عامة'
      else if (bodyText.includes('Private') || bodyText.includes('خاصة') || bodyText.includes('خاص')) result.privacy = 'خاصة'
      const aboutEl = document.querySelector('[data-testid="group-about"] span, div[dir="auto"] span')
      if (aboutEl) result.description = aboutEl.innerText.trim().substring(0, 200)
      result.postCount = Math.min(document.querySelectorAll('[role="article"]').length, 20)
      return result
    })
    saveLeads('facebook', 'group-analysis', [analysis])
    return { success: true, data: analysis }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-users-to-ids', async (e, { sessionId, usernames }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const username of usernames) {
    try {
      await page.goto(`https://www.facebook.com/${username}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const userId = await page.evaluate(() => {
        const meta = document.querySelector('meta[property="al:android:url"]')
        if (meta) { const m = (meta.getAttribute('content') || '').match(/profile\.php\?id=(\d+)/); if (m) return m[1] }
        const src = document.documentElement.innerHTML
        const m1 = src.match(/"userID":"(\d+)"/); if (m1) return m1[1]
        const m2 = src.match(/"actor_id":"(\d+)"/); if (m2) return m2[1]
        const m3 = src.match(/"ownerID":"(\d+)"/); if (m3) return m3[1]
        return null
      })
      results.push({ username, id: userId || 'غير موجود', status: userId ? 'found' : 'not_found' })
    } catch (err) {
      results.push({ username, id: null, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  saveLeads('facebook', 'users-to-ids', results)
  return { success: true, data: results, count: results.filter(r => r.status === 'found').length }
})

ipcm('facebook-links-to-ids', async (e, { sessionId, links }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const link of links) {
    try {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const id = await page.evaluate(() => {
        const src = document.documentElement.innerHTML
        const m1 = src.match(/"userID":"(\d+)"/); if (m1) return m1[1]
        const m2 = src.match(/profile\.php\?id=(\d+)/); if (m2) return m2[1]
        const m3 = src.match(/"ownerID":"(\d+)"/); if (m3) return m3[1]
        const url = window.location.href
        const m4 = url.match(/id=(\d+)/); if (m4) return m4[1]
        return null
      })
      results.push({ link, id: id || 'غير موجود', status: id ? 'found' : 'not_found' })
    } catch (err) {
      results.push({ link, id: null, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  saveLeads('facebook', 'links-to-ids', results)
  return { success: true, data: results, count: results.filter(r => r.status === 'found').length }
})

// ==================== NEW FACEBOOK FEATURES ====================

ipcm('facebook-add-to-group-chat', async (e, { sessionId, groupChatUrl, usernames }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  try {
    await page.goto(groupChatUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    for (const username of usernames) {
      try {
        const addBtn = await page.$('div[role="button"]:has-text("Add"), div[role="button"]:has-text("إضافة"), div[role="button"][aria-label*="Add"], div[role="button"][aria-label*="إضافة"], span:has-text("Add members"), span:has-text("إضافة أعضاء")')
        if (!addBtn) {
          const membersIcon = await page.$('div[aria-label*="Members"], div[aria-label*="أعضاء"], a[aria-label*="Members"], a[aria-label*="أعضاء"]')
          if (membersIcon) {
            await membersIcon.click({ force: true }).catch(() => {})
            await page.waitForTimeout(randomDelay(1000, 2000))
          }
        }
        const addPeopleBtn = await page.$('div[role="button"]:has-text("Add"), div[role="button"]:has-text("إضافة"), span:has-text("Add people"), span:has-text("إضافة أشخاص")')
        if (addPeopleBtn) {
          await addPeopleBtn.click({ force: true }).catch(() => {})
          await page.waitForTimeout(randomDelay(1500, 3000))
        }
        const searchInput = await page.$('input[aria-label*="Search"], input[aria-label*="بحث"], input[placeholder*="Search"], input[placeholder*="بحث"], input[label*="Search"], input[label*="بحث"]')
        if (searchInput) {
          await searchInput.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(username, { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(2000, 4000))
          const suggestion = await page.$('div[role="option"], div[role="listbox"] div[role="option"], li[role="option"]')
          if (suggestion) {
            await suggestion.click({ force: true }).catch(() => {})
            await page.waitForTimeout(randomDelay(500, 1500))
            results.push({ username, status: 'added' })
          } else {
            results.push({ username, status: 'not_found', error: 'اسم المستخدم غير موجود في الاقتراحات' })
          }
        } else {
          results.push({ username, status: 'failed', error: 'لم يتم العثور على حقل البحث' })
        }
      } catch (err) {
        results.push({ username, status: 'error', error: err.message })
      }
      await page.waitForTimeout(randomDelay(2000, 4000))
    }
    const confirmBtn = await page.$('div[role="button"]:has-text("Confirm"), div[role="button"]:has-text("Add"), div[role="button"]:has-text("تأكيد"), div[role="button"]:has-text("إضافة")')
    if (confirmBtn) { await confirmBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(randomDelay(2000, 4000)) }
    saveLeads('facebook', 'add-to-group-chat', results)
    return { success: true, data: results, count: results.filter(r => r.status === 'added').length }
  } catch (err) { return { success: false, error: err.message } }
})

ipcm('facebook-send-page-messages', async (e, { sessionId, pageUrls, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const pageUrl of pageUrls) {
    try {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(3000, 5000))
      const messageBtn = await page.$('div[role="button"]:has-text("Message"), div[role="button"]:has-text("رسالة"), a[role="button"]:has-text("Message"), a[role="button"]:has-text("رسالة"), div[role="button"][aria-label*="Message"], div[role="button"][aria-label*="رسالة"]')
      if (messageBtn) {
        await messageBtn.click({ force: true }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 4000))
        const input = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"][aria-label*="Message"], div[contenteditable="true"][aria-label*="رسالة"], div[contenteditable="true"]')
        if (input) {
          await input.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(message, { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(1000, 2000))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(2000, 4000))
          results.push({ pageUrl, status: 'sent' })
        } else {
          results.push({ pageUrl, status: 'failed', error: 'لم يتم العثور على حقل الرسالة' })
        }
      } else {
        await page.goto(pageUrl.replace(/\/$/, '') + '/messages', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(3000, 5000))
        const input2 = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"]')
        if (input2) {
          await input2.click({ force: true })
          await page.waitForTimeout(randomDelay(500, 1000))
          await page.keyboard.type(message, { delay: 50 + Math.random() * 100 })
          await page.waitForTimeout(randomDelay(1000, 2000))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(2000, 4000))
          results.push({ pageUrl, status: 'sent' })
        } else {
          results.push({ pageUrl, status: 'failed', error: 'لم يتم العثور على زر الرسالة' })
        }
      }
    } catch (err) {
      results.push({ pageUrl, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  saveLeads('facebook', 'page-messages', results)
  return { success: true, data: results }
})

ipcm('facebook-search-groups', async (e, { sessionId, query, limit = 20 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    for (let i = 0; i < Math.ceil(limit / 5); i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(2000, 4000))
    }
    const groups = await page.evaluate((lim) => {
      const r = []
      const seen = new Set()
      document.querySelectorAll('a[href*="/groups/"]').forEach((a) => {
        if (r.length >= lim) return
        const href = a.getAttribute('href') || ''
        const name = a.innerText.trim()
        if (!name || name.length < 2 || name.length > 100 || seen.has(name)) return
        if (href.includes('/groups/create') || href.includes('/groups/discover') || href.includes('/groups/explore')) return
        seen.add(name)
        const groupMatch = href.match(/\/groups\/([^/?]+)/)
        const groupId = groupMatch ? groupMatch[1] : ''
        const cleanUrl = href.split('?')[0]
        r.push({ name, url: cleanUrl.startsWith('/') ? 'https://www.facebook.com' + cleanUrl : cleanUrl, groupId, platform: 'facebook' })
      })
      return r
    }, limit)
    saveLeads('facebook', 'search-groups', groups)
    return { success: true, data: groups, count: groups.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('facebook-join-groups', async (e, { sessionId, groupUrls }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const groupUrl of groupUrls) {
    try {
      await page.goto(groupUrl.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
      const joinBtn = await page.$('div[role="button"]:has-text("Join"), div[role="button"]:has-text("انضم"), div[role="button"][aria-label*="Join"], div[role="button"][aria-label*="انضم"], span:has-text("Join group"), span:has-text("انضم")')
      if (joinBtn) {
        await joinBtn.click({ force: true }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ group: groupUrl, status: 'joined' })
      } else {
        const alreadyMember = await page.evaluate(() => {
          const btns = document.querySelectorAll('div[role="button"]')
          for (const btn of btns) {
            const txt = btn.innerText.trim().toLowerCase()
            if (txt.includes('member') || txt.includes('عضو') || txt.includes('joined') || txt.includes('منضم')) return true
          }
          return false
        })
        results.push({ group: groupUrl, status: alreadyMember ? 'already_joined' : 'failed', error: alreadyMember ? 'عضو بالفعل' : 'لم يتم العثور على زر الانضمام' })
      }
    } catch (err) {
      results.push({ group: groupUrl, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  saveLeads('facebook', 'join-groups', results)
  return { success: true, data: results }
})

ipcm('facebook-extract-page-messengers', async (e, { sessionId, pageUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `page-msg-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allMessengers = []
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const inboxBtn = await page.$('a[href*="/inbox"], a:has-text("Inbox"), a:has-text("الوارد"), div[role="button"]:has-text("Inbox"), div[role="button"]:has-text("الوارد")')
    if (inboxBtn) {
      await inboxBtn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(randomDelay(3000, 5000))
    } else {
      await page.goto(pageUrl.replace(/\/$/, '') + '/inbox', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(3000, 5000))
    }
    const maxScrolls = Math.max(Math.ceil(limit / 10), 5)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingNames) => {
        const r = []
        const seen = new Set(existingNames)
        document.querySelectorAll('a[href*="/"], [role="row"], [role="listitem"]').forEach((el) => {
          const nameEl = el.querySelector('span[dir="auto"], span > span, a[role="link"] span') || el
          const name = nameEl.innerText.trim().split('\n')[0]
          const linkEl = el.closest('a[href*="/"]') || el.querySelector('a[href*="/"]')
          const href = linkEl ? linkEl.getAttribute('href') || '' : ''
          if (!name || name.length < 2 || name.length > 60 || seen.has(name)) return
          if (href.includes('/settings') || href.includes('/help') || href.includes('/login')) return
          seen.add(name)
          let userId = ''
          const idMatch = href.match(/id=(\d+)/)
          const profileMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
          if (idMatch) userId = idMatch[1]
          else if (profileMatch && !['posts','groups','watch','reel','stories','photo','photos','videos','events','marketplace','gaming','login','recover','checkpoint','inbox','settings'].includes(profileMatch[1])) userId = profileMatch[1]
          r.push({ name, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, allMessengers.map(m => m.name))
      for (const u of batch) {
        if (allMessengers.length >= limit) break
        allMessengers.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allMessengers.length, total: limit, data: batch })
      if (allMessengers.length >= limit) break
    }
    saveLeads('facebook', 'page-messengers', allMessengers)
    return { success: true, data: allMessengers, count: allMessengers.length, jobId }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allMessengers }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-profile-messengers', async (e, { sessionId, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `profile-msg-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allMessengers = []
  try {
    await page.goto('https://www.facebook.com/messages/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const maxScrolls = Math.max(Math.ceil(limit / 10), 5)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      const chatList = await page.$('[role="main"]') || await page.$('[data-pagelet="LeftRail"]')
      if (chatList) {
        await chatList.evaluate((el) => { el.scrollTop = el.scrollHeight })
      } else {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      }
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingNames) => {
        const r = []
        const seen = new Set(existingNames)
        document.querySelectorAll('a[href*="/messages/t/"], [role="row"], [role="listitem"]').forEach((el) => {
          const name = el.innerText.trim().split('\n')[0]
          if (!name || name.length < 2 || name.length > 60 || seen.has(name)) return
          seen.add(name)
          const href = el.getAttribute('href') || el.querySelector('a')?.getAttribute('href') || ''
          let userId = ''
          const msgMatch = href.match(/\/messages\/t\/([^/?]+)/)
          if (msgMatch) userId = msgMatch[1]
          r.push({ name, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, userId, platform: 'facebook' })
        })
        return r
      }, allMessengers.map(m => m.name))
      for (const u of batch) {
        if (allMessengers.length >= limit) break
        allMessengers.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allMessengers.length, total: limit, data: batch })
      if (allMessengers.length >= limit) break
    }
    saveLeads('facebook', 'profile-messengers', allMessengers)
    return { success: true, data: allMessengers, count: allMessengers.length, jobId }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allMessengers }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-extract-reviews', async (e, { sessionId, pageUrl, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `reviews-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const allReviews = []
  try {
    await page.goto(pageUrl.replace(/\/$/, '') + '/reviews', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const maxScrolls = Math.max(Math.ceil(limit / 8), 5)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    const reviews = await page.evaluate(() => {
      const r = []
      document.querySelectorAll('[role="article"], [data-visualcompletion], div[class*="review"]').forEach((art) => {
        const nameEl = art.querySelector('a[role="link"] span, a[role="link"]')
        const name = nameEl ? nameEl.innerText.trim() : ''
        const textEl = art.querySelector('div[dir="auto"] span, div[dir="auto"]')
        const text = textEl ? textEl.innerText.trim() : ''
        const ratingEl = art.querySelector('[aria-label*="star"], [aria-label*="نجمة"], [aria-label*="Star"]')
        const rating = ratingEl ? ratingEl.getAttribute('aria-label') || '' : ''
        const dateEl = art.querySelector('abbr, time')
        const date = dateEl ? dateEl.innerText.trim() : ''
        const linkEl = art.querySelector('a[role="link"][href*="/"]')
        const href = linkEl ? linkEl.getAttribute('href') || '' : ''
        if (name || text) {
          r.push({ name, text: text.substring(0, 500), rating, date, profile: href.startsWith('/') ? 'https://www.facebook.com' + href : href, platform: 'facebook' })
        }
      })
      return r
    })
    allReviews.push(...reviews)
    sendProgress(sender, jobId, { type: 'progress', count: allReviews.length, total: limit, data: reviews })
    saveLeads('facebook', 'page-reviews', allReviews)
    return { success: true, data: allReviews, count: allReviews.length, jobId }
  } catch (err) {
    return { success: false, error: err.message, jobId, partialData: allReviews }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('facebook-page-send-messages', async (e, { sessionId, pageUrl, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const switchBtn = await page.$('div[role="button"]:has-text("Switch"), div[role="button"]:has-text("تبديل"), div[data-testid*="switch"], a[role="button"]:has-text("Switch"), span:has-text("Switch to Page")')
    if (switchBtn) {
      await switchBtn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
    }
  } catch (err) { /* continue anyway */ }
  const results = []
  for (const recipient of recipients) {
    try {
      await page.goto(`https://www.facebook.com/messages/t/${recipient}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2000, 4000))
      const input = await page.$('div[contenteditable="true"][role="textbox"], div[contenteditable="true"]')
      if (input) {
        await input.click({ force: true })
        await page.waitForTimeout(randomDelay(500, 1000))
        await page.keyboard.type(message, { delay: 50 + Math.random() * 100 })
        await page.waitForTimeout(randomDelay(1000, 2000))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed', error: 'لم يتم العثور على حقل الرسالة' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(3000, 6000))
  }
  return { success: true, data: results }
})

// Real Instagram mention handler — visits each target post and posts a
// comment that tags the supplied users. Previously routed through the fake
// `runTool` stub, which never actually mentioned anyone.
ipcm('instagram-mention', async (e, { sessionId, postUrl, mentions = [], message = '', delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!postUrl) return { success: false, error: 'رابط المنشور مطلوب' }
  if (!Array.isArray(mentions) || mentions.length === 0) return { success: false, error: 'يجب إدخال مستخدم واحد على الأقل للمنشن' }
  if (!jobId) jobId = `ig-mention-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    // Batch mentions in groups of 5 per comment to avoid IG flagging.
    const batches = []
    for (let i = 0; i < mentions.length; i += 5) batches.push(mentions.slice(i, i + 5))
    for (const batch of batches) {
      if (globals.cancelFlags.get(jobId)) break
      const text = batch.map(m => `@${String(m).replace(/^@/, '').trim()}`).join(' ') + (message ? ' ' + message : '')
      try {
        await smartClick(page, ['svg[aria-label="Comment"]', 'svg[aria-label="تعليق"]', 'a[href*="/comments/"]'], 'open comments')
        await page.waitForTimeout(randomDelay(500, 1200))
        const typed = await smartType(page, [
          'textarea[placeholder*="Add a comment"]', 'textarea[placeholder*="اكتب"]',
          'form textarea', 'div[contenteditable="true"][aria-label*="Comment"]'
        ], text, 'mention comment')
        if (typed) {
          await page.waitForTimeout(randomDelay(500, 1200))
          const posted = await smartClick(page, [
            'div[role="button"]:has-text("Post")', 'div[role="button"]:has-text("نشر")', 'button[type="submit"]'
          ], 'post mention')
          if (!posted) await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(1500, 2500))
          results.push({ batch, status: 'mentioned' })
        } else {
          results.push({ batch, status: 'failed', error: 'لم يتم العثور على حقل التعليق' })
        }
      } catch (err) {
        results.push({ batch, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: batches.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId), count: results.filter(r => r.status === 'mentioned').reduce((s, r) => s + r.batch.length, 0) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Real Twitter mention handler — posts a reply tagging the supplied users on
// each target tweet (replaces the fake `runTool` stub).
ipcm('twitter-mention', async (e, { sessionId, postUrl, tweetUrl, mentions = [], message = '', delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const target = postUrl || tweetUrl
  if (!target) return { success: false, error: 'رابط التغريدة مطلوب' }
  if (!Array.isArray(mentions) || mentions.length === 0) return { success: false, error: 'يجب إدخال مستخدم واحد على الأقل للمنشن' }
  if (!jobId) jobId = `tw-mention-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    // Twitter allows ~10 mentions per reply.
    const batches = []
    for (let i = 0; i < mentions.length; i += 10) batches.push(mentions.slice(i, i + 10))
    for (const batch of batches) {
      if (globals.cancelFlags.get(jobId)) break
      const text = batch.map(m => `@${String(m).replace(/^@/, '').trim()}`).join(' ') + (message ? ' ' + message : '')
      try {
        await smartClick(page, [
          'div[data-testid="reply"]', 'a[href$="/compose/tweet"]',
          'div[aria-label="Reply"]'
        ], 'open reply')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const typed = await smartType(page, [
          'div[data-testid="tweetTextarea_0"]', 'div[role="textbox"][contenteditable="true"]'
        ], text, 'reply text')
        if (typed) {
          await page.waitForTimeout(randomDelay(500, 1200))
          const sent = await smartClick(page, [
            'button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]'
          ], 'send reply')
          results.push({ batch, status: sent ? 'mentioned' : 'failed' })
        } else {
          results.push({ batch, status: 'failed', error: 'لم يتم العثور على حقل الرد' })
        }
      } catch (err) {
        results.push({ batch, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: batches.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId), count: results.filter(r => r.status === 'mentioned').reduce((s, r) => s + r.batch.length, 0) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Real WhatsApp group-post handler — posts a message into each group URL.
// Replaces the fake `runTool` stub used by the WhatsApp UI.
ipcm('whatsapp-group-post', async (e, { sessionId, groups = [], message, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!Array.isArray(groups) || groups.length === 0) return { success: false, error: 'يجب إدخال جروب واحد على الأقل' }
  if (!jobId) jobId = `wa-grp-post-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const groupRef of groups) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        // Accept either chat.whatsapp.com invite link or a plain group name.
        const isLink = /chat\.whatsapp\.com\//i.test(groupRef)
        if (isLink) {
          await page.goto(groupRef, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(2500, 4000))
          // Click "Continue to Chat" if shown.
          await smartActionClick(page, ['a:has-text("Continue to Chat")', 'a:has-text("Use WhatsApp Web")'], 'continue to chat')
          await page.waitForTimeout(randomDelay(2000, 3500))
        } else {
          // Search by name in WhatsApp Web sidebar.
          await smartClick(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], 'search')
          await page.waitForTimeout(randomDelay(400, 900))
          await page.keyboard.press('Control+A').catch(() => {})
          await page.keyboard.press('Delete').catch(() => {})
          await smartType(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], groupRef, 'group')
          await page.waitForTimeout(randomDelay(1500, 2500))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(1500, 2500))
        }
        // Type the broadcast message in the composer.
        const typed = await smartType(page, [
          '[data-testid="conversation-compose-box-input"] [contenteditable="true"]',
          '[data-testid="conversation-compose-box-input"]',
          'div[contenteditable="true"][data-tab="10"]',
          'div[contenteditable="true"][data-tab="6"]'
        ], message, 'group message')
        if (typed) {
          await page.waitForTimeout(randomDelay(500, 1200))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(1500, 2500))
          results.push({ group: groupRef, status: 'sent' })
        } else {
          results.push({ group: groupRef, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' })
        }
      } catch (err) {
        results.push({ group: groupRef, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groups.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Search Facebook pages by keyword. Different from `facebook-search` which is
// generic — this targets the "Pages" tab on the search results page so we
// only get pages (no profiles, posts, or groups).
ipcm('facebook-search-pages', async (e, { sessionId, query, location, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `fb-pages-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const pages = []
  try {
    let url = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(query)}`
    if (location) url += `&filters_location=${encodeURIComponent(location)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const maxScrolls = Math.max(Math.ceil(limit / 8), 10)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      if (pages.length >= limit) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1500)
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[role="article"], div[data-pagelet*="SearchResults"] > div > div').forEach(card => {
          const linkEl = card.querySelector('a[role="link"][href*="/"]:not([href*="/posts/"]):not([href*="/photo"])')
          if (!linkEl) return
          const href = linkEl.getAttribute('href') || ''
          if (!href || href === '#' || href.includes('/groups/') || href.includes('/photo')) return
          const cleanHref = href.split('?')[0]
          const name = linkEl.innerText.trim().split('\n')[0]
          if (!name || name.length > 100) return
          const followersText = (Array.from(card.querySelectorAll('span'))
            .map(s => s.innerText)
            .find(t => /(\d[\d,.]*)\s*(K|M|متابع|follower|like|إعجاب)/i.test(t)) || '').trim()
          r.push({
            name,
            url: cleanHref.startsWith('http') ? cleanHref : `https://www.facebook.com${cleanHref}`,
            followers: followersText,
          })
        })
        return r
      })
      for (const p of batch) {
        if (seen.has(p.url)) continue
        seen.add(p.url)
        pages.push(p)
        if (pages.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: pages.length, total: limit, data: batch })
    }
    saveLeads('facebook', 'search-pages', pages.map(p => ({ name: p.name, url: p.url, extra: p.followers })))
    return { success: true, data: pages, count: pages.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: pages, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Bulk-like a list of Facebook pages (by URL). Opens each page, clicks the
// "Like" button if it's not already liked.
ipcm('facebook-like-pages', async (e, { sessionId, pageUrls = [], delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `fb-like-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of pageUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const liked = await smartActionClick(page, [
          'div[role="button"][aria-label="Like"]:not([aria-pressed="true"])',
          'div[role="button"][aria-label="إعجاب"]:not([aria-pressed="true"])',
          'div[aria-label="Like this Page"]', 'div[aria-label="إعجاب هذه الصفحة"]',
          'div[role="button"]:has-text("Like"):not(:has-text("Liked"))'
        ], 'like page')
        results.push({ url, status: liked ? 'liked' : 'skipped' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: pageUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract people who shared a Facebook post. The shares modal shows
// reshares — we scroll and collect user names + profile URLs.
ipcm('facebook-extract-sharers', async (e, { sessionId, postUrl, limit = 100, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!postUrl) return { success: false, error: 'رابط المنشور مطلوب' }
  if (!jobId) jobId = `fb-sharers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const sharers = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    // Click the shares count to open the people-who-shared dialog.
    const opened = await smartClick(page, [
      'span:has-text("Share") + span', 'span:has-text("shares") a', 'span:has-text("share")',
      'a:has-text("People who shared this")', 'div[role="button"]:has-text("Share")',
      'span:has-text("مشاركة") a', 'a:has-text("الأشخاص الذين شاركوا")'
    ], 'open shares')
    if (!opened) return { success: false, error: 'لم نستطع فتح قائمة المشاركين' }
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(1500, 2500))
    let stagnant = 0
    while (sharers.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = sharers.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[role="dialog"] a[role="link"][href*="/"]').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href || href.includes('/photo') || href === '#') return
          const name = a.innerText.trim().split('\n')[0]
          if (!name || name.length > 80) return
          r.push({
            name,
            profile: href.startsWith('http') ? href.split('?')[0] : `https://www.facebook.com${href.split('?')[0]}`,
          })
        })
        return r
      })
      for (const s of batch) {
        if (seen.has(s.profile)) continue
        seen.add(s.profile)
        sharers.push(s)
        if (sharers.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: sharers.length, total: limit, data: batch })
      if (sharers.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => {
        const dlg = document.querySelector('div[role="dialog"] div[style*="overflow"]')
        if (dlg) dlg.scrollTop = dlg.scrollHeight
      })
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('facebook', 'sharers', sharers)
    return { success: true, data: sharers, count: sharers.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: sharers, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Invite friends to like a page. Opens the page's "Invite Friends" dialog
// and selects-all + send. Selection by username if provided.
ipcm('facebook-invite-friends', async (e, { sessionId, pageUrl, usernames = [], inviteAll = false }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!pageUrl) return { success: false, error: 'رابط الصفحة مطلوب' }
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    // Open the "..." or "Invite Friends" action.
    const opened = await smartClick(page, [
      'div[aria-label="Invite Friends"]', 'div[role="button"]:has-text("Invite friends")',
      'div[role="button"]:has-text("Invite Friends")', 'div[aria-label="More"] + div[aria-label="Invite Friends"]',
      'div[aria-label="دعوة الأصدقاء"]', 'div[role="button"]:has-text("دعوة")'
    ], 'invite-friends button')
    if (!opened) return { success: false, error: 'تعذّر فتح زر دعوة الأصدقاء' }
    await page.waitForTimeout(randomDelay(1500, 2500))
    const results = []
    if (inviteAll) {
      // Click each friend tile in the modal.
      const tiles = await page.$$('div[role="dialog"] div[role="button"]:has(div[role="img"])')
      let invited = 0
      for (const tile of tiles) {
        if (invited >= 50) break
        try { await tile.click({ force: true }); invited++ } catch { /* skip */ }
        await page.waitForTimeout(randomDelay(200, 500))
      }
      results.push({ invited })
    } else {
      for (const handle of usernames) {
        try {
          const u = String(handle).replace(/^@/, '').trim()
          await smartType(page, ['div[role="dialog"] input[type="search"]', 'div[role="dialog"] input[placeholder*="Search"]'], u, 'search')
          await page.waitForTimeout(randomDelay(800, 1500))
          const picked = await smartClick(page, ['div[role="dialog"] div[role="button"]:has-text("' + u + '")', 'div[role="dialog"] div[role="checkbox"]:not([aria-checked="true"])'], 'pick')
          results.push({ username: u, status: picked ? 'selected' : 'skipped' })
          const input = await page.$('div[role="dialog"] input[type="search"]')
          if (input) { await input.click({ clickCount: 3 }); await page.keyboard.press('Backspace') }
        } catch (err) {
          results.push({ username: handle, status: 'failed', error: err.message })
        }
      }
    }
    const sent = await smartClick(page, ['div[role="dialog"] div[role="button"]:has-text("Send Invites")', 'div[role="dialog"] div[role="button"]:has-text("Send")', 'div[role="dialog"] div[role="button"]:has-text("إرسال")'], 'send invites')
    return { success: true, sent, data: results }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Post a comment on a list of business pages.
ipcm('facebook-comment-on-pages', async (e, { sessionId, pageUrls = [], commentText, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!commentText) return { success: false, error: 'نص التعليق مطلوب' }
  if (!jobId) jobId = `fb-comment-pages-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const url of pageUrls) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2500, 4000))
        // Find the latest post on the page and open its comment box.
        const opened = await smartClick(page, [
          'div[role="article"]:first-of-type div[aria-label="Leave a comment"]',
          'div[role="article"]:first-of-type div[role="button"]:has-text("Comment")',
          'div[role="article"]:first-of-type div[role="button"]:has-text("تعليق")'
        ], 'open comment')
        if (!opened) { results.push({ url, status: 'skipped', error: 'لم يتم العثور على زر التعليق' }); continue }
        await page.waitForTimeout(randomDelay(800, 1500))
        const text = String(commentText).replace(/\{\{n\}\}/g, String(idx))
        const typed = await smartType(page, ['div[role="article"]:first-of-type div[contenteditable="true"]', 'div[contenteditable="true"][aria-label*="Comment"]'], text, 'comment')
        if (!typed) { results.push({ url, status: 'failed', error: 'لم يتم العثور على حقل التعليق' }); continue }
        await page.waitForTimeout(randomDelay(500, 1200))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(1500, 2500))
        results.push({ url, status: 'commented' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: pageUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Post text + up to 3 images to a list of groups. Builds on the existing
// post-to-groups but supports media uploads via file input.
ipcm('facebook-post-with-images', async (e, { sessionId, groups = [], message, imagePaths = [], delayMs = 8000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message && imagePaths.length === 0) return { success: false, error: 'النص أو الصور مطلوبة' }
  for (const p of imagePaths) {
    if (!fs.existsSync(p)) return { success: false, error: `الملف غير موجود: ${p}` }
  }
  if (!jobId) jobId = `fb-post-img-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const groupUrl of groups) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(groupUrl.replace(/\/$/, ''), { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(3000, 5000))
        // Open composer.
        const opened = await smartClick(page, [
          'div[role="button"][aria-label*="Write"]', 'div[role="button"][aria-label*="Create"]',
          'div[role="button"]:has-text("Write something")', 'div[role="button"]:has-text("اكتب شيئًا")'
        ], 'composer')
        if (!opened) { results.push({ group: groupUrl, status: 'failed', error: 'لم يتم العثور على نافذة النشر' }); continue }
        await page.waitForTimeout(randomDelay(1500, 2500))
        if (message) {
          await smartType(page, ['div[role="textbox"][contenteditable="true"]', 'div[contenteditable="true"][aria-label*="message"]'], message, 'post')
          await page.waitForTimeout(randomDelay(500, 1200))
        }
        if (imagePaths.length > 0) {
          // Click photos/video button.
          await smartClick(page, [
            'div[aria-label="Photo/video"]', 'div[aria-label="صورة/فيديو"]',
            'div[role="button"]:has-text("Photo/video")', 'div[role="button"]:has-text("صورة/فيديو")'
          ], 'photo-video')
          await page.waitForTimeout(randomDelay(800, 1500))
          const fileInput = await page.$('input[type="file"][accept*="image"], input[type="file"]')
          if (fileInput) {
            await fileInput.setInputFiles(imagePaths.slice(0, 3))
            await page.waitForTimeout(randomDelay(2500, 4500))
          }
        }
        // Click Post.
        const posted = await smartClick(page, [
          'div[aria-label="Post"]:not([aria-disabled="true"])',
          'div[role="button"]:has-text("Post"):not(:has-text("post a job"))',
          'div[role="button"]:has-text("نشر")'
        ], 'post')
        results.push({ group: groupUrl, status: posted ? 'posted' : 'failed' })
      } catch (err) {
        results.push({ group: groupUrl, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groups.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Aggregate demographic data from the in-memory results of a previous
// extraction (likers, comments, members…). Counts gender, location keywords,
// and age bands when surfaced in profile data. Pure JS aggregation — no
// network calls needed.
ipcm('facebook-demographics-analyze', async (e, { items = [] }) => {
  try {
    const stats = {
      total: items.length,
      genderGuess: { male: 0, female: 0, unknown: 0 },
      topLocations: {},
      topNames: {},
      topRegions: {},
      hasPhone: 0,
      hasEmail: 0,
      arabicSpeakers: 0,
      englishSpeakers: 0,
    }
    // Expanded Arabic male names (300+ common Egyptian/Levantine/Gulf names).
    const MALE_NAMES_AR = ['محمد','أحمد','احمد','علي','عمر','حسن','حسين','إبراهيم','ابراهيم','يوسف','عبدالله','عبد الله','عبد الرحمن','عبدالرحمن','عبدالعزيز','عبدالكريم','عبد الكريم','خالد','سعيد','طارق','كريم','بلال','هشام','طاهر','مصطفى','سامي','نبيل','سامر','أيمن','ايمن','عماد','سامح','محمود','بدر','باسل','مالك','باسم','ماجد','مجدي','بهاء','سيف','راشد','صلاح','نواف','ناصر','عبده','أنس','انس','سعد','طلال','وائل','وليد','يحيى','زياد','زيد','رامي','رامز','رياض','عادل','عاطف','عبد المجيد','عبد الفتاح','عبد الحميد','عبد المنعم','عبد الستار','عبد الباسط','عبد المعطي','عبد الناصر','عبد الرؤوف','عبد الباري','حمزة','حمدي','حازم','حسام','حلمي','شريف','شعبان','صبري','صادق','صفوت','صلاح الدين','طلعت','طاهر','طاهرة','عاصم','عبد الهادي','عبد المنعم','عبد المجيد','عثمان','عدنان','عرفان','عزت','عصام','علاء','عماد الدين','غسان','غانم','فؤاد','فادي','فارس','فاروق','فتحي','فخر الدين','فراج','فضل','كامل','كمال','لؤي','لطفي','مأمون','مازن','ماهر','مبارك','مجدي','محسن','مدحت','مراد','مرسي','منيب','مصباح','منذر','منير','نادر','نصار','نزار','نزيه','نعيم','نور الدين','هاشم','هاني','هلال','هيثم','وجدي','وجيه','وسام','وصفي','ياسر','يحي','يعرب','يونس','إسحاق','إسماعيل','إلياس','جابر','جاد','جلال','جمال','جميل','رؤوف','رؤى','زاهر','زكي','زهير','زين','زين العابدين','سراج','سفيان','سلطان','سلمان','سليم','سليمان','سمير','سنان','سهيل','شاكر','شامل','شريف','شفيق','شكري','صالح','صبحي','صدام','صفي الدين','ضياء','طارق','طلال','طلعت','عاكف','عطية','علاء الدين','عماد','عوض','فهد','فيصل','قاسم','قصي','مازن','مالك','مأمون','محسن','مدني','مروان','مهند','نادر','ناصر','نبيه','نجيب','وضاح','يامن']
    // Expanded Arabic female names (250+).
    const FEMALE_NAMES_AR = ['فاطمه','فاطمة','مريم','عائشه','عائشة','سارة','سارا','نور','هند','دينا','رنا','ميا','مها','دانا','رهف','إيمان','ايمان','نهى','نسرين','أمل','امل','سها','سوسن','لينا','روان','نادين','هبة','هبه','هدى','هدي','إسراء','اسراء','روعة','رؤى','ميساء','أسماء','اسماء','سلمى','دالية','ولاء','جوانا','جوان','سحر','نسمة','نهاد','نهال','نسيبة','رغد','زينب','صفية','صفيه','بسمة','عبير','أميرة','اميرة','منى','منار','نادية','نادية','رضوى','سهير','وفاء','شيماء','جيهان','هيفاء','حنان','هلا','عبلة','هاجر','حسناء','ندى','أسيل','ابتسام','إخلاص','أروى','رولا','أريج','إنجي','إنعام','أنوار','إيناس','إيلين','بثينة','بدور','براءة','بنان','بهية','بيسان','تالا','تالين','تسنيم','تقوى','تمارا','جانا','جمانة','جنى','جوهرة','حياة','خديجة','دارين','دعاء','دلال','دلوع','دنيا','رؤى','راما','رانيا','ربا','ربى','رحاب','رحمة','رزان','رشا','رغد','رفيف','رقية','رنيم','رواء','روضة','ريم','ريناد','زبيدة','زهرة','زهور','زيتون','سامية','سامية','سحاب','سحر','سدرة','سعاد','سعدية','سكينة','سلسبيل','سما','سميرة','سندس','سهام','سوزان','سيرين','شذى','شروق','شفاء','شوق','شيرين','صابرين','صبا','صباح','صفاء','ضحى','عرين','عزة','عفاف','علا','عواطف','غادة','غدير','غفران','غيداء','فادية','فاطمة الزهراء','فايزة','فدوى','فردوس','فرح','فريدة','فيروز','كاميليا','كنزة','كوثر','لارا','لميس','ليلى','مايا','مايسة','مرام','مروة','منال','منيرة','نجاة','نجلاء','نجوى','نسيبة','نضال','نعمة','نهلة','نهى','نوال','نوف','هانم','هاشمية','هانية','هبة الله','هبة الرحمن','هيا','وداد','يارا','يسرى','يمنى','يمامة']
    const MALE_RE = new RegExp(MALE_NAMES_AR.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    const FEMALE_RE = new RegExp(FEMALE_NAMES_AR.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    // Common English suffixes for gender (very rough).
    const FEMALE_EN_RE = /\b(Sara|Sarah|Maria|Fatima|Aisha|Nour|Layla|Lina|Mona|Dina|Yasmin|Mira|Mary|Emma|Olivia|Sophia|Anna|Lily|Emily|Jessica|Amanda|Laura)\b/i
    const MALE_EN_RE = /\b(Mohamed|Mohammed|Muhammad|Ahmed|Ali|Omar|Hassan|Hussain|Hussein|Ibrahim|Yusuf|Khaled|Tariq|Karim|Hisham|Mustafa|Sami|Mahmoud|Saeed|David|James|Michael|John|Robert|William|Daniel|Andrew|George|Mark|Peter|Thomas|Brian)\b/i
    // Egyptian/Gulf/Levantine cities for regional bucketing.
    const REGION_PATTERNS = {
      مصر: /(القاهرة|الجيزة|الإسكندرية|الاسكندرية|الإسماعيلية|الاسماعيلية|أسيوط|اسيوط|أسوان|اسوان|طنطا|المنصورة|الزقازيق|سوهاج|الفيوم|قنا|بور سعيد|بورسعيد|السويس|دمياط|الأقصر|الاقصر|بنها|دمنهور|مطروح|شرم الشيخ|الغردقة|مرسى مطروح|Egypt|Cairo|Alexandria|Giza|Mansoura|Aswan|Luxor|Hurghada)/i,
      السعودية: /(الرياض|جدة|مكة|المدينة|الدمام|الخبر|الطائف|تبوك|بريدة|أبها|حائل|نجران|جازان|عنيزة|الجبيل|ينبع|الأحساء|الاحساء|الخرج|الباحة|عرعر|سكاكا|Saudi|Riyadh|Jeddah|Mecca|Medina|Dammam|Khobar|KSA)/i,
      الإمارات: /(دبي|أبوظبي|ابوظبي|الشارقة|عجمان|الفجيرة|رأس الخيمة|راس الخيمة|أم القيوين|ام القيوين|العين|UAE|Dubai|Abu Dhabi|Sharjah|Ajman|Fujairah)/i,
      قطر: /(الدوحة|الوكرة|الريان|الخور|الشمال|أم صلال|Qatar|Doha)/i,
      الكويت: /(الكويت|حولي|السالمية|الأحمدي|الاحمدي|الفروانية|الجهراء|مبارك الكبير|Kuwait)/i,
      البحرين: /(المنامة|المحرق|الرفاع|عيسى|حمد|سترة|Bahrain|Manama)/i,
      عمان: /(مسقط|صلالة|نزوى|صحار|البريمي|الرستاق|Oman|Muscat|Salalah)/i,
      الأردن: /(عمان|الزرقاء|إربد|اربد|العقبة|المفرق|الطفيلة|الكرك|معان|السلط|مادبا|Jordan|Amman|Zarqa|Irbid)/i,
      لبنان: /(بيروت|طرابلس|صيدا|صور|بعلبك|زحلة|جونيه|Lebanon|Beirut|Tripoli|Sidon|Tyre)/i,
      سوريا: /(دمشق|حلب|حمص|اللاذقية|طرطوس|درعا|دير الزور|الرقة|إدلب|ادلب|Syria|Damascus|Aleppo|Homs|Latakia)/i,
      العراق: /(بغداد|البصرة|الموصل|أربيل|اربيل|كربلاء|النجف|الناصرية|كركوك|السليمانية|الفلوجة|Iraq|Baghdad|Basra|Mosul|Erbil)/i,
      المغرب: /(الرباط|الدار البيضاء|كازابلانكا|فاس|طنجة|أكادير|اكادير|مكناس|مراكش|وجدة|تطوان|الرشيدية|Morocco|Casablanca|Rabat|Fes|Tangier|Marrakech)/i,
      تونس: /(تونس|صفاقس|سوسة|قابس|بنزرت|قفصة|نابل|المهدية|القيروان|Tunisia|Tunis|Sfax|Sousse)/i,
      الجزائر: /(الجزائر|وهران|قسنطينة|عنابة|البليدة|باتنة|سطيف|تلمسان|سيدي بلعباس|Algeria|Algiers|Oran)/i,
      ليبيا: /(طرابلس|بنغازي|مصراتة|الزاوية|البيضاء|سبها|درنة|الخمس|طبرق|Libya|Tripoli|Benghazi)/i,
      اليمن: /(صنعاء|عدن|تعز|الحديدة|إب|اب|ذمار|المكلا|سيئون|حضرموت|Yemen|Sanaa|Aden|Taiz)/i,
      السودان: /(الخرطوم|أم درمان|ام درمان|بحري|بورتسودان|كسلا|الأبيض|الابيض|نيالا|Sudan|Khartoum|Omdurman)/i,
      فلسطين: /(القدس|غزة|نابلس|الخليل|بيت لحم|رام الله|جنين|طولكرم|قلقيلية|أريحا|اريحا|Palestine|Gaza|Jerusalem|Hebron|Ramallah|Nablus)/i,
    }
    items.forEach(it => {
      const name = String(it.name || it.username || '').trim()
      const bio = String(it.bio || it.text || it.headline || '').trim()
      const everything = (name + ' ' + bio + ' ' + (it.location || '')).trim()
      // Gender detection: prefer Arabic first, then English fallback.
      if (MALE_RE.test(name)) stats.genderGuess.male++
      else if (FEMALE_RE.test(name)) stats.genderGuess.female++
      else if (MALE_EN_RE.test(name)) stats.genderGuess.male++
      else if (FEMALE_EN_RE.test(name)) stats.genderGuess.female++
      else stats.genderGuess.unknown++
      // Language detection by character ratio.
      const arabicChars = (name.match(/[؀-ۿ]/g) || []).length
      const totalChars = name.replace(/\s+/g, '').length
      if (totalChars > 0 && arabicChars / totalChars >= 0.5) stats.arabicSpeakers++
      else if (totalChars > 0) stats.englishSpeakers++
      // Location bucketing.
      const loc = String(it.location || it.city || it.country || '').trim()
      if (loc) stats.topLocations[loc] = (stats.topLocations[loc] || 0) + 1
      // Country region detection from name/bio/location combined.
      for (const [region, re] of Object.entries(REGION_PATTERNS)) {
        if (re.test(everything)) {
          stats.topRegions[region] = (stats.topRegions[region] || 0) + 1
          break
        }
      }
      const first = name.split(/\s+/)[0]
      if (first) stats.topNames[first] = (stats.topNames[first] || 0) + 1
      if (it.phone) stats.hasPhone++
      if (it.email) stats.hasEmail++
    })
    const sortObj = (o, max = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, max).map(([k, v]) => ({ value: k, count: v }))
    return {
      success: true,
      data: {
        total: stats.total,
        genderGuess: stats.genderGuess,
        hasPhone: stats.hasPhone,
        hasEmail: stats.hasEmail,
        arabicSpeakers: stats.arabicSpeakers,
        englishSpeakers: stats.englishSpeakers,
        topLocations: sortObj(stats.topLocations),
        topRegions: sortObj(stats.topRegions),
        topNames: sortObj(stats.topNames, 20),
      },
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Detect which of the user's joined groups are "anyone-can-post" vs need
// admin approval. Walks each group's About section.
ipcm('facebook-detect-open-groups', async (e, { sessionId, groupUrls = [], delayMs = 3000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `fb-open-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of groupUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const aboutUrl = url.replace(/\/$/, '') + '/about'
        await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        const info = await page.evaluate(() => {
          const text = document.body.innerText
          const approval = /(Membership approval|All posts must be approved|require admin approval|بحاجة لموافقة مشرف|كل المنشورات بحاجة لموافقة)/i.test(text)
          const open = /(Anyone can post|Public group|Anyone can join|أي شخص يمكنه النشر|مجموعة عامة)/i.test(text)
          const nameEl = document.querySelector('h1, h2 a, h2')
          const memberMatch = text.match(/(\d[\d,.\s]*)\s*(members|عضو)/i)
          return {
            name: nameEl ? nameEl.innerText.trim() : '',
            approvalRequired: approval,
            openPosting: open && !approval,
            members: memberMatch ? memberMatch[1].trim() : '',
          }
        })
        results.push({ url, ...info, status: info.openPosting ? 'open' : info.approvalRequired ? 'approval-needed' : 'unknown' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groupUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract active friends — friends who have posted recently. Walks /friends/
// then checks each profile's latest post timestamp. Heuristic but useful.
ipcm('facebook-extract-active-friends', async (e, { sessionId, limit = 50, activeDays = 30, jobId, delayMs = 2500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `fb-active-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const active = []
  try {
    await page.goto('https://www.facebook.com/friends/list', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    // Scroll friends list.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
    }
    const friends = await page.evaluate((max) => {
      const r = []
      const seen = new Set()
      document.querySelectorAll('a[role="link"][href*="/"][href*="profile"], a[href*="facebook.com/profile.php"], a[href^="/"][href*="?fref"]').forEach(a => {
        const href = a.getAttribute('href') || ''
        if (!href || seen.has(href)) return
        const name = a.innerText.trim().split('\n')[0]
        if (!name || name.length > 80) return
        seen.add(href)
        r.push({ name, profile: href.startsWith('http') ? href : `https://www.facebook.com${href}` })
        if (r.length >= max) return r
      })
      return r
    }, Math.max(limit * 4, 200))
    // Check each friend's profile for recent activity.
    for (let i = 0; i < friends.length && active.length < limit; i++) {
      if (globals.cancelFlags.get(jobId)) break
      const friend = friends[i]
      try {
        await page.goto(friend.profile, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2500))
        const recent = await page.evaluate((days) => {
          const timeEls = document.querySelectorAll('a[role="link"] abbr, a[role="link"] span[title]')
          for (const el of timeEls) {
            const t = (el.getAttribute('title') || el.innerText || '').trim()
            // Heuristic: count "h", "d", "m", "now" for recent posts.
            if (/(now|just now|الآن)/i.test(t)) return { recent: true, label: t }
            const mh = t.match(/(\d+)\s*(h|hr|hour|س|ساعة)/i)
            if (mh) return { recent: true, label: t }
            const md = t.match(/(\d+)\s*(d|day|يوم|أيام)/i)
            if (md && parseInt(md[1]) <= days) return { recent: true, label: t }
          }
          return { recent: false }
        }, activeDays)
        if (recent.recent) {
          active.push({ ...friend, lastSeen: recent.label })
          sendProgress(sender, jobId, { type: 'progress', count: active.length, total: limit, data: [{ ...friend, lastSeen: recent.label }] })
        }
      } catch { /* skip this friend */ }
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('facebook', 'active-friends', active)
    return { success: true, data: active, count: active.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: active, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== SAFETY / ANTI-BAN ====================

// Generate N variations of a marketing message using a synonyms dictionary
// + random punctuation/spacing tweaks. Returns the variants so the renderer
// can rotate them across batches and avoid spam-detection heuristics.
ipcm('safety-generate-message-variations', async (e, { template, count = 10, synonyms = {} }) => {
  if (!template) return { success: false, error: 'القالب مطلوب' }
  // Default Arabic marketing synonyms (used if caller doesn't pass any).
  const DEFAULT_SYNONYMS = {
    'مرحبا': ['أهلاً', 'أهلين', 'هلا', 'السلام عليكم', 'يا هلا'],
    'السلام عليكم': ['أهلاً وسهلاً', 'أهلاً', 'هلا', 'مرحباً'],
    'عرض': ['تخفيض', 'خصم', 'فرصة', 'صفقة'],
    'خصم': ['عرض', 'تخفيض', 'فرصة', 'حسم'],
    'منتج': ['خدمة', 'سلعة', 'باقة', 'عرضنا'],
    'الآن': ['اليوم', 'حالاً', 'فوراً', 'سريعاً'],
    'تواصل': ['كلمنا', 'راسلنا', 'اتصل', 'تواصل معنا'],
    'متجر': ['موقع', 'صفحة', 'حسابنا'],
    'تخفيضات': ['عروض', 'خصومات', 'صفقات'],
    'مميز': ['رائع', 'ممتاز', 'فريد', 'استثنائي'],
    'احصل': ['اطلب', 'استمتع بـ', 'احجز'],
    'سعر': ['تكلفة', 'قيمة', 'مبلغ'],
    'سريع': ['فوري', 'عاجل', 'مباشر'],
    'مجاناً': ['بدون مقابل', 'هدية', 'مكافأة'],
    'جودة': ['نوعية', 'مستوى', 'تميز'],
    'Hello': ['Hi', 'Hey', 'Greetings', 'Welcome'],
    'discount': ['offer', 'deal', 'promotion', 'sale'],
    'now': ['today', 'instantly', 'right now'],
    'product': ['service', 'item', 'package', 'offering'],
    'contact': ['reach out', 'message us', 'get in touch'],
  }
  const dict = { ...DEFAULT_SYNONYMS, ...synonyms }
  // Random invisible characters to add variance (zero-width space is safe in Arabic).
  const ZWSP_VARIANTS = ['', '', '', '​', '']
  // Punctuation variants.
  const PUNCT_VARIANTS = ['', '.', '!', '،', '؟', '..', '...']
  const EMOJI_BANK = ['🎉', '🔥', '✨', '💎', '⚡', '🚀', '💯', '⭐', '🎯', '💰', '👌', '🌟']
  const variations = []
  for (let i = 0; i < Math.max(1, Math.min(50, count)); i++) {
    let out = template
    // 1. Apply synonyms (random pick per occurrence).
    for (const [word, alts] of Object.entries(dict)) {
      const list = Array.isArray(alts) ? alts : [alts]
      if (list.length === 0) continue
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'gi')
      out = out.replace(re, () => Math.random() < 0.65 ? list[Math.floor(Math.random() * list.length)] : word)
    }
    // 2. Handle {a|b|c} placeholders.
    out = out.replace(/\{([^{}]+)\}/g, (_, keys) => {
      const list = keys.split('|').map(s => s.trim()).filter(Boolean)
      return list[Math.floor(Math.random() * list.length)] || ''
    })
    // 3. Add a random invisible char somewhere in the middle (10% chance).
    if (Math.random() < 0.10 && out.length > 5) {
      const idx = Math.floor(out.length / 2)
      out = out.slice(0, idx) + ZWSP_VARIANTS[Math.floor(Math.random() * ZWSP_VARIANTS.length)] + out.slice(idx)
    }
    // 4. Optionally add/remove trailing punctuation (40% chance).
    if (Math.random() < 0.4) {
      out = out.replace(/[.!،؟]+$/g, '').trim() + PUNCT_VARIANTS[Math.floor(Math.random() * PUNCT_VARIANTS.length)]
    }
    // 5. Optionally add a random emoji at the end (35% chance).
    if (Math.random() < 0.35) {
      out = out + ' ' + EMOJI_BANK[Math.floor(Math.random() * EMOJI_BANK.length)]
    }
    variations.push(out)
  }
  // Deduplicate (in case synonyms didn't actually change anything).
  const unique = Array.from(new Set(variations))
  return { success: true, data: { variations: unique, count: unique.length, requested: count } }
})

// Validate session is alive for a platform by visiting its home and checking
// that we're not on the login page. Returns confidence + suggested action.
ipcm('safety-session-health', async (e, { sessionId, platform }) => {
  if (!sessionId || !platform) return { success: false, error: 'sessionId و platform مطلوبان' }
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: true, data: { alive: false, reason: 'الجلسة مغلقة', shouldReLogin: true } }
  const URLS = {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    twitter: 'https://x.com/home',
    linkedin: 'https://www.linkedin.com/feed/',
    telegram: 'https://web.telegram.org/a/',
    whatsapp: 'https://web.whatsapp.com/',
    pinterest: 'https://www.pinterest.com/',
    reddit: 'https://www.reddit.com/',
    snapchat: 'https://web.snapchat.com/',
  }
  const LOGIN_MARKERS = {
    facebook: ['#login_form', 'form[action*="/login"]', 'input[name="email"][placeholder*="Email"]'],
    instagram: ['input[name="username"]', 'form#loginForm'],
    twitter: ['a[href="/i/flow/login"]', '[data-testid="loginButton"]'],
    linkedin: ['form.login__form', 'input[name="session_key"]'],
    telegram: ['#auth-pages', 'input[name="phone"]'],
    whatsapp: ['canvas[aria-label*="QR"]', 'div[data-ref]'],
    pinterest: ['button[data-test-id="simple-login-button"]', 'input[name="id"]'],
    reddit: ['a[href*="/login"]', 'shreddit-signup-drawer'],
    snapchat: ['input[name="username"]', 'input[name="email"]'],
  }
  try {
    const url = URLS[platform] || URLS.facebook
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const finalUrl = page.url()
    const onLoginUrl = /login|signin|auth/i.test(finalUrl)
    const loginMarkers = LOGIN_MARKERS[platform] || []
    const hasLoginMarker = await page.evaluate((sels) => sels.some(s => !!document.querySelector(s)), loginMarkers).catch(() => false)
    if (onLoginUrl || hasLoginMarker) {
      return { success: true, data: { alive: false, reason: 'الجلسة منتهية - مطلوب تسجيل دخول جديد', shouldReLogin: true, url: finalUrl } }
    }
    return { success: true, data: { alive: true, url: finalUrl } }
  } catch (err) {
    return { success: true, data: { alive: false, reason: err.message, shouldReLogin: false } }
  }
})

// ==================== MULTI-ACCOUNT ROTATION ====================

ipcm('get-active-sessions', async () => {
  const sessions = []
  for (const [id, session] of globals.bm.browsers) {
    sessions.push({ sessionId: id, platform: session.platform || 'unknown' })
  }
  return { success: true, data: sessions }
})

// ==================== IPC: MULTI-ACCOUNT CYCLE ====================
ipcm('cycle-accounts', async (e, { platform, accounts, task, settings = {} }) => {
  const { intervalMinutes = 5, maxOperations = 50, stopOnError = true, delayBetweenAccounts = 10 } = settings
  if (!Array.isArray(accounts) || accounts.length === 0) return { success: false, error: 'لا توجد حسابات محددة' }

  globals.cancelFlags.delete('cycle-stop')

  const allResults = []
  const cycleLog = []
  const sender = e.sender
  const safeSend = (channel, data) => { try { if (sender && !sender.isDestroyed()) sender.send(channel, data) } catch (e) { console.error('safeSend error:', e.message) } }
  let totalOps = 0
  let cycleRound = 0
  let shouldStop = false

  const platformUrls = {
    facebook: 'https://www.facebook.com/login',
    instagram: 'https://www.instagram.com/accounts/login/',
    twitter: 'https://x.com/login',
    linkedin: 'https://www.linkedin.com/login',
    pinterest: 'https://www.pinterest.com/login/',
    reddit: 'https://www.reddit.com/login/',
    threads: 'https://www.threads.net/login',
    snapchat: 'https://web.snapchat.com/',
    telegram: 'https://web.telegram.org/a/',
  }

  while (!shouldStop) {
    cycleRound++
    for (let i = 0; i < accounts.length; i++) {
      if (shouldStop) break
      const account = accounts[i]
      const accountLabel = account.username || `حساب ${i + 1}`
      let sessionId = null

      try {
        // Send progress: switching to account
        safeSend('extraction-progress', { type: 'cycle_progress', currentAccount: i + 1, totalAccounts: accounts.length, accountName: accountLabel, round: cycleRound, totalResults: allResults.length })

        // Close any existing session for this account's profile
        const profileId = `${platform}-${account.username}`
        for (const [existingId, session] of globals.bm.browsers) {
          if (session.profileId === profileId) {
            try { await globals.bm.close(existingId) } catch (e) { console.error('Error closing previous session:', e.message) }
            break
          }
        }

        // Also close any session for same platform without profileId (legacy sessions)
        for (const [existingId, session] of globals.bm.browsers) {
          if (session.platform === platform && !session.profileId) {
            try { await globals.bm.close(existingId) } catch (e) { console.error('Error closing legacy session:', e.message) }
            break
          }
        }

        // Launch browser with account-specific profile and proxy
        const launchRes = await globals.bm.launch({ headless: false, platform, proxy: account.proxy || undefined, profileId })
        if (!launchRes.success) {
          cycleLog.push({ account: accountLabel, status: 'launch_failed', error: launchRes.error, round: cycleRound })
          safeSend('extraction-progress', { type: 'cycle_error', accountName: accountLabel, error: launchRes.error })
          if (stopOnError) { shouldStop = true; continue }
          continue
        }
        sessionId = launchRes.sessionId
        const page = globals.bm.getPage(sessionId)

        if (!page) {
          cycleLog.push({ account: accountLabel, status: 'no_page', error: 'فشل في فتح المتصفح', round: cycleRound })
          if (stopOnError) { shouldStop = true; continue }
          continue
        }

        // Navigate to login page
        const loginUrl = platformUrls[platform]
        if (loginUrl) {
          await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(3000, 5000))
        }

        // Attempt auto-login if credentials are available
        let loginSuccess = false
        if (account.username && account.password) {
          try {
            const emailSelectors = {
              facebook: ['#email', 'input[name="email"]', 'input[type="email"]'],
              instagram: ['input[name="username"]', 'input[aria-label*="Username"]', 'input[aria-label*="Phone"]'],
              twitter: ['input[name="text"][autocomplete="username"]', 'input[autocomplete="username"]'],
              linkedin: ['input[id="username"]', 'input[name="session_key"]'],
              pinterest: ['input[id="email"]', 'input[type="email"]'],
              reddit: ['input[name="username"]', 'input[id="loginUsername"]'],
              threads: ['input[aria-label="Mobile number or email"]', 'input[name="username"]'],
              snapchat: ['input[name="username"]', 'input[id="username"]', 'input[aria-label="Username"]'],
            }
            const passwordSelectors = {
              facebook: ['#pass', 'input[name="pass"]', 'input[type="password"]'],
              instagram: ['input[name="password"]', 'input[type="password"]'],
              twitter: ['input[name="password"]', 'input[type="password"]'],
              linkedin: ['input[id="password"]', 'input[name="session_password"]'],
              pinterest: ['input[id="password"]', 'input[type="password"]'],
              reddit: ['input[name="password"]', 'input[id="loginPassword"]'],
              threads: ['input[aria-label="Password"]', 'input[type="password"]'],
              snapchat: ['input[name="password"]', 'input[type="password"]', 'input[id="password"]'],
            }
            const submitSelectors = {
              facebook: ['button[name="login"]', 'button[type="submit"]', '#loginbutton'],
              instagram: ['button[type="submit"]'],
              twitter: ['button[type="submit"]', 'button[data-testid="LoginForm_Login_Button"]'],
              linkedin: ['button[type="submit"]'],
              pinterest: ['button[type="submit"]'],
              reddit: ['button[type="submit"]'],
              threads: ['button[type="submit"]'],
              snapchat: ['button[type="submit"]', 'button[data-testid="login-button"]'],
            }

            const eSelectors = emailSelectors[platform] || []
            const pSelectors = passwordSelectors[platform] || []
            const sSelectors = submitSelectors[platform] || []

            if (eSelectors.length > 0) {
              const emailTyped = await smartType(page, eSelectors, account.username, 'email')
              if (emailTyped) {
                await page.waitForTimeout(randomDelay(500, 1500))
                const pwTyped = await smartType(page, pSelectors, account.password, 'password')
                if (pwTyped) {
                  await page.waitForTimeout(randomDelay(500, 1500))
                  await smartClick(page, sSelectors, 'login submit')
                  await page.waitForTimeout(randomDelay(5000, 8000))
                  loginSuccess = true

                  // Save to DB
                  saveAccount(platform, account.username, account.password)
                }
              }
            }
          } catch (loginErr) {
            loginSuccess = false
          }
          cycleLog.push({ account: accountLabel, status: loginSuccess ? 'logged_in' : 'login_manual', round: cycleRound })
        } else {
          // No password — wait for manual login
          safeSend('extraction-progress', { type: 'cycle_waiting_login', accountName: accountLabel, round: cycleRound })
          await page.waitForTimeout(randomDelay(15000, 30000))
          cycleLog.push({ account: accountLabel, status: 'manual_login_waited', round: cycleRound })
        }

        // Execute the task for this account
        let accountOps = 0
        try {
          async function cycleExtract(extractType, extractParams) {
            const params = { sessionId, ...extractParams, limit: Math.max(1, maxOperations - accountOps) }
            const fakeEvent = { sender, reply: () => {} }
            try {
              switch (`${platform}-${extractType}`) {
                case 'facebook-page-likers': return await ipcHandlers['facebook-extract-likers'](fakeEvent, { sessionId, postUrl: extractParams.postUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'facebook-post-comments': return await ipcHandlers['facebook-extract-comments'](fakeEvent, { sessionId, postUrl: extractParams.postUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'facebook-group-members': return await ipcHandlers['facebook-extract-group-members'](fakeEvent, { sessionId, groupUrl: extractParams.groupUrl, limit: params.limit }) || { success: false }
                case 'facebook-friends': return await ipcHandlers['facebook-extract-friends'](fakeEvent, { sessionId, limit: params.limit }) || { success: false }
                case 'facebook-page-followers': return await ipcHandlers['facebook-extract-page-followers'](fakeEvent, { sessionId, pageUrl: extractParams.pageUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'facebook-page-messengers': return await ipcHandlers['facebook-extract-page-messengers'](fakeEvent, { sessionId, pageUrl: extractParams.pageUrl, limit: params.limit }) || { success: false }
                case 'facebook-profile-messengers': return await ipcHandlers['facebook-extract-profile-messengers'](fakeEvent, { sessionId, limit: params.limit }) || { success: false }
                case 'facebook-search': return await ipcHandlers['facebook-search'](fakeEvent, { sessionId, query: extractParams.query, type: extractParams.searchType || extractParams.type, limit: params.limit }) || { success: false }
                case 'instagram-followers': return await ipcHandlers['instagram-extract-followers'](fakeEvent, { sessionId, targetUser: extractParams.targetUser, limit: params.limit }) || { success: false }
                case 'instagram-comments': return await ipcHandlers['instagram-extract-comments'](fakeEvent, { sessionId, postUrl: extractParams.postUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'instagram-hashtag': return await ipcHandlers['instagram-extract-hashtag'](fakeEvent, { sessionId, hashtag: extractParams.hashtag, limit: params.limit }) || { success: false }
                case 'twitter-followers': return await ipcHandlers['twitter-extract-followers'](fakeEvent, { sessionId, username: extractParams.username || extractParams.targetUser, limit: params.limit }) || { success: false }
                case 'linkedin-companies': return await ipcHandlers['linkedin-extract-companies'](fakeEvent, { sessionId, searchUrl: extractParams.searchUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'linkedin-search': return await ipcHandlers['linkedin-search'](fakeEvent, { sessionId, query: extractParams.query || extractParams.searchQuery, type: extractParams.type || extractParams.searchType, limit: params.limit }) || { success: false }
                case 'telegram-members': return await ipcHandlers['telegram-extract-members'](fakeEvent, { sessionId, groupUrl: extractParams.groupUrl, limit: params.limit }) || { success: false }
                case 'pinterest-search': return await ipcHandlers['pinterest-search'](fakeEvent, { sessionId, query: extractParams.query || extractParams.searchQuery, limit: params.limit }) || { success: false }
                case 'pinterest-extract': return await ipcHandlers['pinterest-extract'](fakeEvent, { sessionId, boardUrl: extractParams.boardUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'reddit-search': return await ipcHandlers['reddit-search'](fakeEvent, { sessionId, query: extractParams.query || extractParams.searchQuery, limit: params.limit }) || { success: false }
                case 'threads-extract': return await ipcHandlers['threads-extract'](fakeEvent, { sessionId, url: extractParams.url, limit: params.limit }) || { success: false }
                case 'snapchat-broadcast': return await ipcHandlers['snapchat-broadcast'](fakeEvent, { sessionId, usernames: extractParams.usernames || extractParams.recipients, message: extractParams.message }) || { success: false }
                case 'tiktok-extract-comments': return await ipcHandlers['tiktok-extract-comments'](fakeEvent, { sessionId, videoUrl: extractParams.videoUrl || extractParams.url, limit: params.limit }) || { success: false }
                case 'tiktok-extract-followers': return await ipcHandlers['tiktok-extract-followers'](fakeEvent, { sessionId, username: extractParams.username || extractParams.targetUser, limit: params.limit }) || { success: false }
                case 'twitter-followers': return await ipcHandlers['twitter-extract-followers'](fakeEvent, { sessionId, username: extractParams.username || extractParams.targetUser, limit: params.limit }) || { success: false }
                case 'twitter-tweet': return await ipcHandlers['twitter-tweet'](fakeEvent, { sessionId, text: extractParams.text || extractParams.message }) || { success: false }
                case 'twitter-follow': return await ipcHandlers['twitter-follow'](fakeEvent, { sessionId, usernames: extractParams.usernames || [] }) || { success: false }
                case 'twitter-retweet': return await ipcHandlers['twitter-retweet'](fakeEvent, { sessionId, tweetUrls: extractParams.tweetUrls || extractParams.urls || [] }) || { success: false }
                case 'whatsapp-extract-groups': return await ipcHandlers['whatsapp-extract-groups'](fakeEvent, { sessionId }) || { success: false }
                case 'whatsapp-filter-numbers': return await ipcHandlers['whatsapp-filter-numbers'](fakeEvent, { numbers: extractParams.numbers || [] }) || { success: false }
                case 'threads-mention': return await ipcHandlers['threads-mention'](fakeEvent, { sessionId, postUrl: extractParams.postUrl || extractParams.url, mentions: extractParams.mentions || [], message: extractParams.message }) || { success: false }
                case 'reddit-publish': return await ipcHandlers['reddit-publish'](fakeEvent, { sessionId, subreddit: extractParams.subreddit, title: extractParams.title, content: extractParams.content || extractParams.message }) || { success: false }
                case 'google-maps': return await ipcHandlers['google-maps-extract'](fakeEvent, { searchQuery: extractParams.searchQuery || extractParams.query, location: extractParams.location, limit: params.limit, sessionId }) || { success: false }
                default: return { success: false, error: `نوع الاستخراج غير مدعوم: ${platform}-${extractType}` }
              }
            } catch (err) {
              return { success: false, error: err.message || 'فشل الاستخراج' }
            }
          }

          async function cycleSend(sendParams) {
            const params = { sessionId, ...sendParams }
            const fakeEvent = { sender, reply: () => {} }
            try {
              switch (platform) {
                case 'facebook': return await ipcHandlers['facebook-send-messages'](fakeEvent, params) || { success: false }
                case 'instagram': return await ipcHandlers['instagram-send-messages'](fakeEvent, params) || { success: false }
                case 'linkedin': return await ipcHandlers['linkedin-send-messages'](fakeEvent, params) || { success: false }
                case 'telegram': return await ipcHandlers['telegram-send-messages'](fakeEvent, params) || { success: false }
                case 'twitter': return await ipcHandlers['twitter-tweet'](fakeEvent, { sessionId: params.sessionId, text: params.message || params.text }) || { success: false }
                case 'whatsapp': return await ipcHandlers['whatsapp-send-messages'](fakeEvent, { sessionId: params.sessionId, recipients: params.recipients || [], message: params.message }) || { success: false }
                case 'snapchat': return await ipcHandlers['snapchat-broadcast'](fakeEvent, { sessionId: params.sessionId, usernames: params.recipients || params.usernames || [], message: params.message }) || { success: false }
                case 'threads': return await ipcHandlers['threads-mention'](fakeEvent, { sessionId: params.sessionId, postUrl: params.postUrl || params.url, mentions: params.mentions || params.recipients || [], message: params.message }) || { success: false }
                case 'reddit': return await ipcHandlers['reddit-publish'](fakeEvent, { sessionId: params.sessionId, subreddit: params.subreddit, title: params.title, content: params.content || params.message }) || { success: false }
                default: return { success: false, error: `الإرسال غير مدعوم لمنصة ${platform}` }
              }
            } catch (err) {
              return { success: false, error: err.message || 'فشل الإرسال' }
            }
          }

          switch (task.type) {
            case 'extract': {
              const res = await cycleExtract(task.params.extractType || 'page-likers', task.params)
              if (res && res.success && res.data) {
                const data = (Array.isArray(res.data) ? res.data : [res.data]).map(d => ({ ...d, _account: account.username, _round: cycleRound }))
                allResults.push(...data)
                accountOps += data.length
                if (db) saveLeads(platform, task.params.extractType || 'cycle-extract', data)
              }
              break
            }
            case 'send': {
              const res = await cycleSend(task.params)
              if (res && res.success && res.data) {
                const data = (Array.isArray(res.data) ? res.data : [res.data]).map(d => ({ ...d, _account: account.username, _round: cycleRound }))
                allResults.push(...data)
                accountOps += data.length
              }
              break
            }
            default:
              cycleLog.push({ account: accountLabel, status: 'unknown_task', error: `نوع المهمة غير معروف: ${task.type}`, round: cycleRound })
          }
        } catch (taskErr) {
          cycleLog.push({ account: accountLabel, status: 'task_error', error: taskErr.message, round: cycleRound })
          safeSend('extraction-progress', { type: 'cycle_error', accountName: accountLabel, error: taskErr.message })
          if (stopOnError) shouldStop = true
        }

        totalOps += accountOps
        safeSend('extraction-progress', { type: 'cycle_account_done', accountIndex: i, totalAccounts: accounts.length, accountName: accountLabel, ops: accountOps, totalOps, totalResults: allResults.length, round: cycleRound })

      } catch (err) {
        cycleLog.push({ account: accountLabel, status: 'error', error: err.message, round: cycleRound })
        safeSend('extraction-progress', { type: 'cycle_error', accountName: accountLabel, error: err.message })
        if (stopOnError) shouldStop = true
      } finally {
        // Always close the browser session
        if (sessionId) {
          try { await globals.bm.close(sessionId) } catch (e) { console.error('Error closing session:', e.message) }
          sessionId = null
        }
      }

      // Check if user requested stop
      if (globals.cancelFlags.get('cycle-stop')) {
        globals.cancelFlags.delete('cycle-stop')
        shouldStop = true
        break
      }

      // Delay between accounts
      if (i < accounts.length - 1 && !shouldStop && delayBetweenAccounts > 0) {
        await new Promise(r => setTimeout(r, delayBetweenAccounts * 1000))
      }
    }

    // Only do one round for now (prevents infinite loop)
    // Future: add option to repeat rounds
    break
  }

  if (allResults.length > 0 && db) {
    saveLeads(platform, task.type, allResults)
  }
  return { success: true, data: allResults, count: allResults.length, log: cycleLog }
})

ipcm('stop-cycle', async () => {
  globals.cancelFlags.set('cycle-stop', true)
  return { success: true, message: 'تم إيقاف الدورة' }
})

ipcm('whatsapp-launch', async (e, { proxy } = {}) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless: false, platform: 'whatsapp', proxy })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForTimeout(randomDelay(3000, 5000))
    // Detect either the logged-in chat list OR the QR code login screen using
    // multiple selectors — WA Web rotates data-testid attributes regularly.
    const loggedInSelectors = [
      '[data-testid="chat-list"]', '#pane-side', '[data-testid="cell-frame-container"]',
      '[aria-label="Chat list"]', 'div[role="grid"][aria-label*="Chat"]',
      'header[data-testid="chatlist-header"]', 'header[data-testid="search-container"]',
    ]
    const qrSelectors = [
      'canvas[aria-label*="Scan"]', 'div[data-testid="qrcode"]', 'canvas[aria-label*="QR"]',
      'div[data-ref] canvas', 'div._akau canvas',
    ]
    const matched = await waitForAny(page, [...loggedInSelectors, ...qrSelectors], 30000)
    if (matched && loggedInSelectors.includes(matched)) {
      return { success: true, message: 'WhatsApp متصل', sessionId }
    }
    return { success: true, message: 'افتح كاميرا الهاتف وامسح QR code', sessionId, needsQR: true }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('whatsapp-send-messages', async (e, { sessionId, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const recipient of recipients) {
    try {
      const searchBox = await page.$('[title="Search input textbox"], [data-testid="chat-list-search"] [contenteditable="true"]')
      if (!searchBox) { results.push({ recipient, status: 'failed', error: 'لم يتم العثور على مربع البحث' }); continue }
      await smartClick(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], 'search box')
      await page.waitForTimeout(randomDelay(500, 1500))
      await smartType(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], recipient, 'recipient')
      await page.waitForTimeout(randomDelay(1500, 3000))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(randomDelay(1500, 3000))
      const input = await page.$('[data-testid="conversation-compose-box-input"] [contenteditable="true"], [data-testid="conversation-compose-box-input"]')
      if (input) {
        await smartType(page, ['[data-testid="conversation-compose-box-input"] [contenteditable="true"]', '[data-testid="conversation-compose-box-input"]'], message, 'message')
        await page.waitForTimeout(randomDelay(500, 1500))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(1500, 3000))
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed', error: 'لم يتم العثور على مربع الكتابة' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('whatsapp-extract-groups', async (e, { sessionId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await waitForAny(page, ['[data-testid="chat-list"]', '#pane-side', '[data-testid="cell-frame-container"]', 'div[role="grid"][aria-label*="Chat"]'], 30000)
    await page.waitForTimeout(randomDelay(1000, 2000))
    const groups = await page.evaluate(() => {
      const r = []
      document.querySelectorAll('[data-testid="cell-frame-title"]').forEach((el) => {
        const title = el.innerText || ''
        const subtitle = el.closest('[data-testid="cell-frame-container"]')?.querySelector('[data-testid="cell-frame-secondary"]')?.innerText || ''
        r.push({ name: title, extra: subtitle })
      })
      return r
    })
    groups.forEach(g => { if (globals.db) globals.db.prepare('INSERT INTO leads (platform, name, source, extra_data) VALUES (?, ?, ?, ?)').run('whatsapp', g.name, 'groups', g.extra) })
    return { success: true, data: groups, count: groups.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('whatsapp-filter-numbers', async (e, { numbers }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless: true, platform: 'whatsapp' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    const results = []
    for (const number of numbers) {
      try {
        const clean = number.replace(/[^0-9]/g, '')
        await page.goto(`https://wa.me/${clean}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(randomDelay(1500, 3000))
        const chatBtn = await page.$('a:has-text("Continue to Chat"), a:has-text("Chat on WhatsApp"), a:has-text("Continue")')
        results.push({ number, valid: !!chatBtn, status: chatBtn ? 'valid' : 'invalid' })
      } catch {
        results.push({ number, valid: false, status: 'invalid' })
      }
      await page.waitForTimeout(randomDelay(1000, 2000))
    }
    await globals.bm.close(sessionId)
    return { success: true, data: results }
  } catch (err) {
    if (sessionId) try { await globals.bm.close(sessionId) } catch { /* ignore */ }
    return { success: false, error: err.message }
  }
})

// Send images/videos to a list of numbers with optional caption. Uses the
// attachment menu in the WhatsApp Web composer. Each recipient is opened via
// the search box (same flow as whatsapp-send-messages) so persistent chats are
// reused when present.
ipcm('whatsapp-send-media', async (e, { sessionId, recipients, mediaPaths = [], caption = '', jobId, delayMs = 3000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!Array.isArray(mediaPaths) || mediaPaths.length === 0) return { success: false, error: 'لم يتم اختيار أي وسائط' }
  // Validate file existence so the user sees a clear error before we open chats.
  for (const p of mediaPaths) {
    if (!fs.existsSync(p)) return { success: false, error: `الملف غير موجود: ${p}` }
  }
  if (!jobId) jobId = `wa-media-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const recipient of recipients) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await smartClick(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], 'search')
        await page.waitForTimeout(randomDelay(400, 900))
        // Clear previous search first.
        await page.keyboard.press('Control+A').catch(() => {})
        await page.keyboard.press('Delete').catch(() => {})
        await smartType(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], recipient, 'recipient')
        await page.waitForTimeout(randomDelay(1500, 2500))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(1500, 2500))
        // Open attach menu.
        await smartClick(page, ['[data-testid="conversation-clip"]', 'div[title="Attach"]', 'span[data-icon="clip"]', 'span[data-icon="plus"]'], 'attach')
        await page.waitForTimeout(randomDelay(600, 1200))
        const fileInput = await page.$('input[type="file"][accept*="image"], input[type="file"][accept*="video"], input[type="file"]')
        if (!fileInput) { results.push({ recipient, status: 'failed', error: 'لم يتم العثور على مدخل الملف' }); continue }
        await fileInput.setInputFiles(mediaPaths)
        await page.waitForTimeout(randomDelay(2000, 3500))
        if (caption) {
          const captionBox = await page.$('div[contenteditable="true"][data-tab="10"], div[contenteditable="true"][data-tab="6"], [data-testid="media-caption-input-container"] [contenteditable="true"]')
          if (captionBox) {
            await captionBox.click()
            await page.keyboard.type(caption, { delay: 30 })
          }
        }
        // Send (Enter or paper plane).
        const sent = await smartClick(page, ['[data-testid="send"]', 'span[data-icon="send"]', 'button[aria-label="Send"]'], 'send')
        if (!sent) await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(2500, 4500))
        results.push({ recipient, status: 'sent', mediaCount: mediaPaths.length })
      } catch (err) {
        results.push({ recipient, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: recipients.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract the user's chat list (recent conversations). Each row is read from
// the left-rail chat list. Useful for building a re-targeting audience.
ipcm('whatsapp-extract-chats', async (e, { sessionId, limit = 200, includeGroups = true, includeContacts = true }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.waitForSelector('[data-testid="chat-list"], #pane-side', { timeout: 30000 })
    await page.waitForTimeout(randomDelay(800, 1500))
    // Scroll the pane to load more chats.
    const chats = []
    const seen = new Set()
    const maxScrolls = Math.max(Math.ceil(limit / 15), 5)
    for (let i = 0; i < maxScrolls; i++) {
      const batch = await page.evaluate(() => {
        const out = []
        const rows = document.querySelectorAll('[data-testid="cell-frame-container"], #pane-side div[role="listitem"]')
        rows.forEach(row => {
          const nameEl = row.querySelector('[data-testid="cell-frame-title"] span[title], span[dir="auto"][title]')
          const subEl = row.querySelector('[data-testid="cell-frame-secondary"] span[title], span.matched-text')
          const timeEl = row.querySelector('[data-testid="cell-frame-meta"]')
          const isGroup = !!row.querySelector('[data-testid="default-group"], [data-icon="default-group"]')
          if (!nameEl) return
          const name = nameEl.getAttribute('title') || nameEl.innerText || ''
          if (!name) return
          out.push({
            name,
            lastMessage: subEl ? (subEl.getAttribute('title') || subEl.innerText || '') : '',
            time: timeEl ? timeEl.innerText : '',
            type: isGroup ? 'group' : 'chat',
          })
        })
        return out
      })
      for (const c of batch) {
        const key = c.name + '|' + c.type
        if (seen.has(key)) continue
        if (!includeGroups && c.type === 'group') continue
        if (!includeContacts && c.type === 'chat') continue
        seen.add(key)
        chats.push(c)
        if (chats.length >= limit) break
      }
      if (chats.length >= limit) break
      // Scroll pane down.
      await page.evaluate(() => {
        const pane = document.querySelector('#pane-side') || document.querySelector('[data-testid="chat-list"]')
        if (pane) pane.scrollTop = pane.scrollHeight
      })
      await page.waitForTimeout(randomDelay(800, 1400))
    }
    saveLeads('whatsapp', 'chats', chats.map(c => ({ name: c.name, extra: c.lastMessage, type: c.type })))
    return { success: true, data: chats, count: chats.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Extract WhatsApp contacts from the "new chat" sidebar. WhatsApp lazily
// renders the contact list inside a virtualized pane, so we scroll it until
// no new entries appear (or the limit is hit).
ipcm('whatsapp-extract-contacts', async (e, { sessionId, limit = 500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.waitForSelector('[data-testid="chat-list"], #pane-side', { timeout: 30000 })
    // Click "New chat" pencil/plus.
    const opened = await smartClick(page, ['[data-testid="new-chat-btn"]', 'span[data-icon="new-chat-outline"]', 'div[title="New chat"]', 'div[aria-label="New chat"]', 'div[title="محادثة جديدة"]'], 'new chat')
    if (!opened) return { success: false, error: 'تعذّر فتح قائمة محادثة جديدة' }
    await page.waitForTimeout(randomDelay(1200, 2000))
    const contacts = []
    const seen = new Set()
    let stagnantPasses = 0
    while (contacts.length < limit && stagnantPasses < 4) {
      const before = contacts.length
      const batch = await page.evaluate(() => {
        const out = []
        const rows = document.querySelectorAll('[data-testid="cell-frame-container"], div[role="listitem"]')
        rows.forEach(row => {
          const nameEl = row.querySelector('span[title][dir="auto"]')
          const subEl = row.querySelectorAll('span[title][dir="auto"]')[1]
          if (!nameEl) return
          const name = nameEl.getAttribute('title') || nameEl.innerText
          if (!name || name.length > 80) return
          out.push({
            name,
            status: subEl ? (subEl.getAttribute('title') || subEl.innerText || '') : '',
          })
        })
        return out
      })
      for (const c of batch) {
        if (seen.has(c.name)) continue
        seen.add(c.name)
        contacts.push(c)
        if (contacts.length >= limit) break
      }
      if (contacts.length === before) stagnantPasses++
      else stagnantPasses = 0
      await page.evaluate(() => {
        const list = document.querySelector('div[data-testid="contacts-modal-list"]') || document.querySelector('#pane-side') || document.querySelector('div[role="grid"]') || document.querySelector('[data-testid="chat-list"]')
        if (list) list.scrollTop = list.scrollHeight
      })
      await page.waitForTimeout(randomDelay(900, 1400))
    }
    saveLeads('whatsapp', 'contacts', contacts.map(c => ({ name: c.name, extra: c.status })))
    return { success: true, data: contacts, count: contacts.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Pull the members of an already-open group from its info panel. The user
// must pass a group name (we'll search and open it) or just open the group
// manually first. Returns { name, phone? } per row.
ipcm('whatsapp-extract-group-members', async (e, { sessionId, groupName, limit = 500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    if (groupName) {
      await smartClick(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], 'search')
      await page.waitForTimeout(randomDelay(400, 900))
      await page.keyboard.press('Control+A').catch(() => {})
      await page.keyboard.press('Delete').catch(() => {})
      await smartType(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], groupName, 'group')
      await page.waitForTimeout(randomDelay(1200, 2000))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(randomDelay(1500, 2500))
    }
    // Open the group info header (clicking the group name at the top).
    await smartClick(page, ['header [data-testid="conversation-info-header"]', 'header div[role="button"]', 'header [data-testid="conversation-info-header-chat-title"]'], 'group header')
    await page.waitForTimeout(randomDelay(1500, 2500))
    // Scroll the info pane and read participants.
    const members = []
    const seen = new Set()
    let stagnant = 0
    while (members.length < limit && stagnant < 4) {
      const before = members.length
      const batch = await page.evaluate(() => {
        const out = []
        const rows = document.querySelectorAll('[data-testid="cell-frame-container"], div[role="listitem"]')
        rows.forEach(row => {
          const nameEl = row.querySelector('span[title][dir="auto"]')
          const subEl = row.querySelectorAll('span[title][dir="auto"]')[1] || row.querySelector('span.matched-text')
          if (!nameEl) return
          const name = nameEl.getAttribute('title') || nameEl.innerText
          if (!name) return
          const sub = subEl ? (subEl.getAttribute('title') || subEl.innerText || '') : ''
          // Phone numbers from WA contacts look like "+20 100…"
          const phoneMatch = (name + ' ' + sub).match(/(\+?\d[\d\s-]{6,}\d)/)
          out.push({ name, phone: phoneMatch ? phoneMatch[1].replace(/\s/g, '') : '', status: sub })
        })
        return out
      })
      for (const m of batch) {
        const key = m.name + '|' + (m.phone || '')
        if (seen.has(key)) continue
        seen.add(key)
        members.push(m)
        if (members.length >= limit) break
      }
      if (members.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => {
        const drawer = document.querySelector('section[data-animate-drawer="true"]') || document.querySelector('div[data-testid="drawer-right"]') || document.querySelector('section')
        if (drawer) drawer.scrollTop = drawer.scrollHeight
      })
      await page.waitForTimeout(randomDelay(900, 1400))
    }
    saveLeads('whatsapp', 'group-members', members.map(m => ({ name: m.name, phone: m.phone, extra: m.status })))
    return { success: true, data: members, count: members.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Add a list of phone numbers to an existing group (you must be the admin).
// Opens the group's "Add member" dialog and types each number one at a time.
ipcm('whatsapp-add-to-group', async (e, { sessionId, groupName, phones = [], jobId, delayMs = 2500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!groupName) return { success: false, error: 'أدخل اسم المجموعة' }
  if (!Array.isArray(phones) || phones.length === 0) return { success: false, error: 'لم يتم إدخال أي أرقام' }
  if (!jobId) jobId = `wa-add-group-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await smartClick(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await page.keyboard.press('Control+A').catch(() => {})
    await page.keyboard.press('Delete').catch(() => {})
    await smartType(page, ['[title="Search input textbox"]', '[data-testid="chat-list-search"] [contenteditable="true"]'], groupName, 'group')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await smartClick(page, ['header [data-testid="conversation-info-header"]', 'header div[role="button"]'], 'group header')
    await page.waitForTimeout(randomDelay(1500, 2500))
    for (const phone of phones) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const clean = String(phone).replace(/[^0-9+]/g, '')
        const opened = await smartClick(page, ['div[role="button"]:has-text("Add participant")', 'div[role="button"]:has-text("Add members")', 'div[role="button"]:has-text("Add member")', 'div[role="button"]:has-text("إضافة مشترك")', 'li[role="button"]:has-text("Add")'], 'add member')
        if (!opened) {
          results.push({ phone: clean, status: 'failed', error: 'لم يتم العثور على زر الإضافة' })
          continue
        }
        await page.waitForTimeout(randomDelay(1000, 1800))
        const searchTyped = await smartType(page, ['div[contenteditable="true"][data-tab="3"]', '[data-testid="contact-list-search"] [contenteditable="true"]', 'input[placeholder*="Search"]'], clean, 'add search')
        if (!searchTyped) {
          await page.keyboard.type(clean, { delay: 50 })
        }
        await page.waitForTimeout(randomDelay(1200, 2000))
        const picked = await smartClick(page, ['[data-testid="contact-list"] [data-testid="cell-frame-container"]:first-child', 'div[role="listitem"]:first-child', 'div[role="button"][data-testid="cell-frame-container"]'], 'pick')
        await page.waitForTimeout(randomDelay(800, 1400))
        const confirm = await smartClick(page, ['div[role="button"]:has-text("Add")', 'div[role="button"]:has-text("إضافة")', 'span[data-icon="checkmark-light"]', 'div[role="button"] span[data-icon="checkmark"]'], 'confirm add')
        await page.waitForTimeout(randomDelay(1200, 2000))
        // Some WAs show a confirmation modal.
        await smartActionClick(page, ['div[role="button"]:has-text("Add member")', 'div[role="button"]:has-text("Add"):not(:has-text("members"))', 'div[role="button"]:has-text("OK")'], 'confirm modal')
        results.push({ phone: clean, status: picked && confirm ? 'added' : 'failed' })
      } catch (err) {
        results.push({ phone, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: phones.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Generate a vCard (.vcf) file from a list of numbers. The user can then
// import the file on their phone to mass-save contacts, which is the trick
// commonly used to make numbers show up in WhatsApp's contact picker.
ipcm('whatsapp-numbers-to-vcf', async (e, { numbers = [], namePrefix = 'Lead', savePath }) => {
  try {
    const cleanList = numbers
      .map(n => String(n).replace(/[^0-9+]/g, ''))
      .filter(n => n && n.length >= 6)
    if (cleanList.length === 0) return { success: false, error: 'لا توجد أرقام صالحة' }

    let outPath = savePath
    if (!outPath) {
      const win = BrowserWindow.getFocusedWindow()
      const dlg = await dialog.showSaveDialog(win, {
        title: 'حفظ ملف جهات الاتصال',
        defaultPath: `whatsapp-contacts-${Date.now()}.vcf`,
        filters: [{ name: 'vCard', extensions: ['vcf'] }],
      })
      if (dlg.canceled || !dlg.filePath) return { success: false, error: 'تم إلغاء الحفظ' }
      outPath = dlg.filePath
    }

    const lines = []
    cleanList.forEach((num, idx) => {
      const name = `${namePrefix} ${String(idx + 1).padStart(4, '0')}`
      lines.push('BEGIN:VCARD')
      lines.push('VERSION:3.0')
      lines.push(`N:${name};;;;`)
      lines.push(`FN:${name}`)
      lines.push(`TEL;TYPE=CELL:${num}`)
      lines.push('END:VCARD')
    })
    fs.writeFileSync(outPath, lines.join('\r\n'), 'utf8')
    return { success: true, path: outPath, count: cleanList.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Crawl other platforms (Facebook, Telegram, Twitter, Google) for chat.whatsapp.com
// invite links. Builds a deduplicated list of WA groups discovered from
// social posts, public group/channel descriptions, and Google indexing.
ipcm('whatsapp-extract-groups-from-platforms', async (e, { sessionId, keyword, sources = ['google', 'facebook', 'telegram'], limit = 100, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!keyword) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `wa-cross-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const found = []
  const LINK_RE = /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/g
  try {
    for (const src of sources) {
      if (globals.cancelFlags.get(jobId)) break
      if (found.length >= limit) break
      let url = ''
      if (src === 'google') {
        url = `https://www.google.com/search?q=${encodeURIComponent(`"chat.whatsapp.com" ${keyword}`)}&num=50`
      } else if (src === 'facebook') {
        url = `https://www.facebook.com/search/posts/?q=${encodeURIComponent(`chat.whatsapp.com ${keyword}`)}`
      } else if (src === 'telegram') {
        url = `https://www.google.com/search?q=${encodeURIComponent(`site:t.me "chat.whatsapp.com" ${keyword}`)}&num=50`
      } else if (src === 'twitter') {
        url = `https://x.com/search?q=${encodeURIComponent(`chat.whatsapp.com ${keyword}`)}&src=typed_query`
      } else { continue }
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2500, 4000))
        // Scroll a couple of times to load more results.
        for (let s = 0; s < 4; s++) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(randomDelay(1200, 2000))
        }
        const text = await page.evaluate(() => document.body.innerText).catch(() => '')
        const linkMatches = text.match(LINK_RE) || []
        // Also walk anchor tags directly (Google often hides links in cite tags).
        const anchors = await page.evaluate(() => {
          const arr = []
          document.querySelectorAll('a[href*="chat.whatsapp.com/"]').forEach(a => {
            const h = a.getAttribute('href') || ''
            const m = h.match(/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/)
            if (m) arr.push('https://' + m[0])
          })
          return arr
        }).catch(() => [])
        for (const link of [...linkMatches, ...anchors]) {
          if (seen.has(link)) continue
          seen.add(link)
          found.push({ url: link, source: src, keyword })
          if (found.length >= limit) break
        }
        sendProgress(sender, jobId, { type: 'progress', count: found.length, total: limit, last: { source: src, found: found.length } })
      } catch (err) {
        sendProgress(sender, jobId, { type: 'progress', count: found.length, total: limit, last: { source: src, error: err.message } })
      }
      await page.waitForTimeout(randomDelay(1500, 2500))
    }
    saveLeads('whatsapp', 'cross-platform-groups', found.map(f => ({ name: f.keyword, url: f.url, source: f.source })))
    return { success: true, data: found, count: found.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: found, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Create a temporary group with the provided members, send the broadcast
// message, then leave the group. This is the "brand-name broadcast" pattern
// from the user's feature list. Requires WhatsApp Web logged-in session.
ipcm('whatsapp-temp-group-broadcast', async (e, { sessionId, groupName = 'SkyPro Broadcast', members = [], message, leaveAfter = true, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!Array.isArray(members) || members.length === 0) return { success: false, error: 'لم يتم إدخال أعضاء' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `wa-temp-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  try {
    // Open new chat menu.
    const opened = await smartClick(page, [
      '[data-testid="new-chat-btn"]', 'span[data-icon="new-chat-outline"]',
      'div[title="New chat"]', 'div[aria-label="New chat"]'
    ], 'new chat')
    if (!opened) return { success: false, error: 'تعذّر فتح قائمة محادثة جديدة' }
    await page.waitForTimeout(randomDelay(800, 1500))
    // Click "New group" inside.
    const newGroup = await smartClick(page, [
      'div[role="button"]:has-text("New group")', 'span:has-text("New group")',
      'div[role="button"]:has-text("مجموعة جديدة")', 'span:has-text("مجموعة جديدة")'
    ], 'new group')
    if (!newGroup) return { success: false, error: 'تعذّر فتح "مجموعة جديدة"' }
    await page.waitForTimeout(randomDelay(1500, 2500))
    // Add members one by one.
    const added = []
    for (const phone of members) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const clean = String(phone).replace(/[^0-9+]/g, '')
        await smartType(page, ['div[contenteditable="true"][data-tab]', 'input[type="text"]', 'input[placeholder*="Search"]'], clean, 'add member')
        await page.waitForTimeout(randomDelay(1200, 2000))
        const picked = await smartClick(page, ['div[role="listitem"]:first-of-type', 'div[role="button"][data-testid="cell-frame-container"]:first-of-type'], 'pick member')
        added.push({ phone: clean, status: picked ? 'added' : 'failed' })
        // Clear search.
        const input = await page.$('div[contenteditable="true"][data-tab], input[type="text"]')
        if (input) { try { await input.click({ clickCount: 3 }); await page.keyboard.press('Backspace') } catch { /* ignore */ } }
      } catch (err) {
        added.push({ phone, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: added.length, total: members.length + 3, last: added[added.length - 1] })
      await page.waitForTimeout(randomDelay(800, 1500))
    }
    // Proceed to group naming.
    await smartClick(page, ['span[data-icon="arrow-forward"]', 'div[role="button"][aria-label="Next"]', 'div[role="button"]:has-text("Next")'], 'next step')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await smartType(page, ['div[contenteditable="true"][data-tab]:not([data-testid*="chat"])', 'div[contenteditable="true"][data-tab="3"]'], groupName, 'group name')
    await page.waitForTimeout(randomDelay(800, 1500))
    await smartClick(page, ['span[data-icon="checkmark-medium"]', 'div[role="button"][aria-label="Create group"]', 'div[role="button"]:has-text("Create group")'], 'create')
    await page.waitForTimeout(randomDelay(3000, 5000))
    // Type the broadcast in the composer.
    await smartType(page, ['[data-testid="conversation-compose-box-input"] [contenteditable="true"]', '[data-testid="conversation-compose-box-input"]', 'div[contenteditable="true"][data-tab="10"]'], message, 'broadcast msg')
    await page.waitForTimeout(randomDelay(800, 1500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(2000, 3500))
    let leftStatus = 'kept'
    if (leaveAfter) {
      // Open group info → leave group.
      await smartClick(page, ['header [data-testid="conversation-info-header"]', 'header div[role="button"]'], 'group header')
      await page.waitForTimeout(randomDelay(1500, 2500))
      // Scroll info pane.
      await page.evaluate(() => {
        const drawer = document.querySelector('section[data-animate-drawer="true"]') || document.querySelector('section')
        if (drawer) drawer.scrollTop = drawer.scrollHeight
      })
      await page.waitForTimeout(randomDelay(800, 1500))
      const exited = await smartActionClick(page, [
        'div[role="button"]:has-text("Exit group")', 'div[role="button"]:has-text("Leave group")',
        'div[role="button"]:has-text("الخروج")', 'div[role="button"]:has-text("مغادرة")'
      ], 'exit group')
      if (exited) {
        await page.waitForTimeout(randomDelay(800, 1500))
        const confirmed = await smartActionClick(page, ['div[role="button"]:has-text("Exit")', 'div[role="button"]:has-text("Leave")', 'div[role="button"]:has-text("خروج")'], 'confirm exit')
        leftStatus = confirmed ? 'left' : 'kept'
      }
    }
    return { success: true, data: { groupName, members: added, broadcasted: true, leftStatus }, jobId }
  } catch (err) {
    return { success: false, error: err.message, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract chats from the "Archived" view. Click the Archived label, scroll,
// collect rows. Returns same shape as extract-chats.
ipcm('whatsapp-extract-archived', async (e, { sessionId, limit = 200 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.waitForSelector('[data-testid="chat-list"], #pane-side', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(800, 1500))
    // Click "Archived" button at top of chat list.
    const opened = await smartClick(page, [
      '[data-testid="archived-button"]', 'div[role="button"]:has-text("Archived")',
      'div[role="button"]:has-text("الأرشيف")', 'span:has-text("Archived")'
    ], 'archived')
    if (!opened) return { success: false, error: 'لم يتم العثور على الأرشيف' }
    await page.waitForTimeout(randomDelay(1500, 2500))
    const chats = []
    const seen = new Set()
    for (let i = 0; i < Math.max(Math.ceil(limit / 15), 5); i++) {
      const batch = await page.evaluate(() => {
        const out = []
        document.querySelectorAll('[data-testid="cell-frame-container"], #pane-side div[role="listitem"]').forEach(row => {
          const nameEl = row.querySelector('[data-testid="cell-frame-title"] span[title], span[dir="auto"][title]')
          const subEl = row.querySelector('[data-testid="cell-frame-secondary"] span[title]')
          const timeEl = row.querySelector('[data-testid="cell-frame-meta"]')
          if (!nameEl) return
          const name = nameEl.getAttribute('title') || nameEl.innerText
          if (!name) return
          out.push({ name, lastMessage: subEl ? (subEl.getAttribute('title') || subEl.innerText || '') : '', time: timeEl ? timeEl.innerText : '' })
        })
        return out
      })
      for (const c of batch) {
        if (seen.has(c.name)) continue
        seen.add(c.name)
        chats.push(c)
        if (chats.length >= limit) break
      }
      if (chats.length >= limit) break
      await page.evaluate(() => {
        const pane = document.querySelector('#pane-side') || document.querySelector('[data-testid="chat-list"]')
        if (pane) pane.scrollTop = pane.scrollHeight
      })
      await page.waitForTimeout(randomDelay(900, 1500))
    }
    saveLeads('whatsapp', 'archived-chats', chats.map(c => ({ name: c.name, extra: c.lastMessage })))
    return { success: true, data: chats, count: chats.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Send the same message from multiple WhatsApp sessions (number rotation).
// Each number is tried in turn round-robin to share rate limits. Requires
// that all sessionIds are pre-launched (e.g. via cycle).
ipcm('whatsapp-multi-number-rotation', async (e, { sessionIds = [], recipients = [], message, delayMs = 6000, jobId }) => {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) return { success: false, error: 'يجب إدخال جلسة واحدة على الأقل' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `wa-rotate-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let cursor = 0
    for (const raw of recipients) {
      if (globals.cancelFlags.get(jobId)) break
      const sid = sessionIds[cursor % sessionIds.length]
      cursor++
      const page = globals.bm.getPage(sid)
      const clean = String(raw).replace(/[^0-9]/g, '')
      if (!page || !clean) { results.push({ recipient: raw, sessionId: sid, status: 'failed', error: 'جلسة أو رقم غير صالح' }); continue }
      try {
        const url = `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForSelector('[data-testid="conversation-compose-box-input"], div[contenteditable="true"][data-tab]', { timeout: 25000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2800))
        const clicked = await smartClick(page, ['[data-testid="send"]', 'span[data-icon="send"]', 'button[aria-label="Send"]'], 'send')
        if (!clicked) await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const sent = await page.evaluate(() => !!document.querySelector('[data-testid="msg-time"], [data-pre-plain-text]'))
        results.push({ recipient: clean, sessionId: sid, status: sent ? 'sent' : 'unknown' })
      } catch (err) {
        results.push({ recipient: clean, sessionId: sid, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: recipients.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Faster bulk text sender — opens each chat through wa.me deep links which is
// 2-3x faster than the in-app search but slightly more visible to WhatsApp's
// rate limiter. Use small batches.
ipcm('whatsapp-fast-send', async (e, { sessionId, recipients = [], message, delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `wa-fast-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const raw of recipients) {
      if (globals.cancelFlags.get(jobId)) break
      const clean = String(raw).replace(/[^0-9]/g, '')
      if (!clean) { results.push({ recipient: raw, status: 'failed', error: 'رقم غير صالح' }); continue }
      try {
        const url = `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        // Wait for compose box to be ready.
        await page.waitForSelector('[data-testid="conversation-compose-box-input"], div[contenteditable="true"][data-tab]', { timeout: 25000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2800))
        const clicked = await smartClick(page, ['[data-testid="send"]', 'span[data-icon="send"]', 'button[aria-label="Send"]'], 'send')
        if (!clicked) {
          // Fall back to Enter — message is already in the URL.
          await page.keyboard.press('Enter')
        }
        await page.waitForTimeout(randomDelay(1500, 2500))
        // Confirm the bubble appeared.
        const sent = await page.evaluate(() => !!document.querySelector('[data-testid="msg-time"], [data-pre-plain-text]'))
        results.push({ recipient: clean, status: sent ? 'sent' : 'unknown' })
      } catch (err) {
        results.push({ recipient: clean, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: recipients.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: INSTAGRAM ====================
ipcm('instagram-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'instagram', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[name="username"]', 'input[aria-label*="Username"]', 'input[aria-label*="Phone"]',
      'input[aria-label*="بريد"]', 'input[type="text"]', 'input[id*="user"]'
    ], username, 'username')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    const passTyped = await smartType(page, [
      'input[name="password"]', 'input[aria-label*="Password"]', 'input[aria-label*="كلمة"]',
      'input[type="password"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("تسجيل الدخول")',
      'div[role="button"]:has-text("Log in")'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
    await smartActionClick(page, ['button:has-text("Save Info")', 'button:has-text("Save info")', 'button:has-text("حفظ")'], 'dismiss save info')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartActionClick(page, ['button:has-text("Not Now")', 'button:has-text("ليس الآن")'], 'dismiss not now')
    await page.waitForTimeout(randomDelay(1000, 2000))
    const currentUrl = page.url()
    if (!currentUrl.includes('login') && !currentUrl.includes('challenge')) {
      saveAccount('instagram', username, password)
      return { success: true, message: 'تم تسجيل الدخول بنجاح', sessionId }
    }
    if (currentUrl.includes('challenge')) {
      return { success: true, message: 'تم تسجيل الدخول - يرجى إكمال التحقق الأمني', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('instagram-extract-followers', async (e, { sessionId, targetUser, limit = 100 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.instagram.com/${targetUser}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const followersLink = await page.$('a[href$="/followers/"]')
    if (followersLink) {
      await smartActionClick(page, ['a[href$="/followers/"]'], 'followers link')
      await page.waitForTimeout(randomDelay(2000, 4000))
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => { const d = document.querySelector('[role="dialog"] div'); if (d) d.scrollTop = d.scrollHeight })
        await page.waitForTimeout(randomDelay(1500, 3000))
      }
    }
    const followers = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[role="dialog"] a[href^="/"]').forEach((a, i) => {
        if (i >= lim) return
        const href = a.getAttribute('href')
        if (href && href.length > 1 && !href.includes('/followers') && !href.includes('/following')) {
          r.push({ username: href.replace(/\//g, ''), profile: `https://instagram.com${href}` })
        }
      })
      return r
    }, limit)
    saveLeads('instagram', 'followers', followers)
    return { success: true, data: followers, count: followers.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('instagram-auto-follow', async (e, { sessionId, usernames }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const user of usernames) {
    try {
      await page.goto(`https://www.instagram.com/${user}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      if (await smartActionClick(page, ['button:has-text("Follow")', 'button:has-text("متابعة")'], 'follow')) {
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ user, status: 'followed' })
      } else {
        results.push({ user, status: 'failed', error: 'Follow button not found' })
      }
    } catch (err) {
      results.push({ user, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('instagram-extract-comments', async (e, { sessionId, postUrl, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 3; i++) {
      const loadMore = await page.$('span:has-text("View all comments"), span:has-text("Load more comments"), button:has-text("Load more")')
      if (loadMore) {
        await smartActionClick(page, ['span:has-text("View All Comments")', 'span:has-text("Load more comments")', 'button:has-text("Load more")'], 'load more comments')
        await page.waitForTimeout(randomDelay(2000, 4000))
      }
    }
    const comments = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('ul ul li, [role="dialog"] ul li').forEach((li, i) => {
        if (i >= lim) return
        const userEl = li.querySelector('a[href^="/"]')
        const textEl = li.querySelector('span')
        if (userEl && textEl) {
          r.push({ username: userEl.innerText.trim(), text: textEl.innerText.trim(), profile: userEl.href })
        }
      })
      return r
    }, limit)
    saveLeads('instagram', 'comments', comments)
    return { success: true, data: comments, count: comments.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('instagram-send-messages', async (e, { sessionId, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const recipient of recipients) {
    try {
      await page.goto(`https://www.instagram.com/direct/t/${recipient}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const input = await page.$('textarea[placeholder*="Message"], textarea[placeholder*="رسالة"], div[contenteditable="true"]')
      if (input) {
        await smartType(page, ['textarea[placeholder*="Message"]', 'textarea[placeholder*="رسالة"]', 'div[contenteditable="true"]'], message, 'message')
        await page.waitForTimeout(randomDelay(500, 1500))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed', error: 'Message input not found' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('instagram-extract-hashtag', async (e, { sessionId, hashtag, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const posts = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href^="/p/"]').forEach((a, i) => {
        if (i >= lim) return
        const img = a.querySelector('img')
        r.push({ link: a.href, image: img?.src || '', caption: img?.alt || '' })
      })
      return r
    }, limit)
    saveLeads('instagram', 'hashtag-posts', posts.map(p => ({ url: p.link, name: p.caption || hashtag, extra: p.image })))
    return { success: true, data: posts, count: posts.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Unfollow a list of users. Click the "Following" pill on each profile, then
// confirm "Unfollow" in the modal. Adds randomized delays so the account
// isn't flagged for unfollow spam.
ipcm('instagram-unfollow', async (e, { sessionId, usernames = [], delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `ig-unfollow-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const user of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const handle = String(user).replace(/^@/, '').trim()
        if (!handle) { results.push({ username: user, status: 'failed', error: 'مستخدم فارغ' }); continue }
        await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 3000))
        const pressed = await smartActionClick(page, [
          'button:has-text("Following")', 'button:has-text("متابَع")', 'button:has-text("Following")',
          'button[aria-label*="Following"]', 'div[role="button"]:has-text("Following")'
        ], 'following btn')
        if (!pressed) {
          results.push({ username: handle, status: 'skipped', error: 'غير متابع أو لم يُعثر على الزر' })
          continue
        }
        await page.waitForTimeout(randomDelay(800, 1500))
        const confirmed = await smartActionClick(page, [
          'button:has-text("Unfollow")', 'button:has-text("إلغاء المتابعة")',
          'div[role="dialog"] button:has-text("Unfollow")'
        ], 'unfollow confirm')
        results.push({ username: handle, status: confirmed ? 'unfollowed' : 'failed' })
      } catch (err) {
        results.push({ username: user, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Like and/or comment on a batch of post URLs. The `actions` param selects
// what to do: { like: true, comment: 'text' } — either or both per post.
// Comment text supports {{n}} which is replaced by the post index.
ipcm('instagram-post-interact', async (e, { sessionId, postUrls = [], actions = { like: true }, delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `ig-interact-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const url of postUrls) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      const out = { url, liked: false, commented: false, error: null }
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        if (actions.like) {
          const liked = await smartActionClick(page, [
            'svg[aria-label="Like"]', 'svg[aria-label="إعجاب"]',
            'span[role="button"] svg[aria-label="Like"]', 'button[aria-label*="Like"]'
          ], 'like')
          out.liked = !!liked
        }
        if (actions.comment) {
          const text = String(actions.comment).replace(/\{\{n\}\}/g, String(idx))
          const opened = await smartClick(page, [
            'svg[aria-label="Comment"]', 'svg[aria-label="تعليق"]', 'a[href*="/comments/"]'
          ], 'open comments')
          if (opened) await page.waitForTimeout(randomDelay(500, 1200))
          const typed = await smartType(page, [
            'textarea[placeholder*="Add a comment"]', 'textarea[placeholder*="اكتب"]',
            'form textarea', 'div[contenteditable="true"][aria-label*="Comment"]'
          ], text, 'comment')
          if (typed) {
            await page.waitForTimeout(randomDelay(500, 1200))
            const posted = await smartClick(page, [
              'div[role="button"]:has-text("Post")', 'div[role="button"]:has-text("نشر")',
              'button[type="submit"]'
            ], 'post comment')
            if (!posted) await page.keyboard.press('Enter')
            await page.waitForTimeout(randomDelay(1500, 2500))
            out.commented = true
          }
        }
        out.status = out.liked || out.commented ? 'done' : 'skipped'
      } catch (err) {
        out.error = err.message
        out.status = 'failed'
      }
      results.push(out)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: postUrls.length, last: out })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Share a post via direct message to a list of recipients. The flow is:
// open the post → click the "Send" (paper-plane) icon → search each recipient
// → check them → press "Send Separately" or "Send".
ipcm('instagram-share-post-dm', async (e, { sessionId, postUrl, recipients = [], message = '', jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!postUrl) return { success: false, error: 'رابط المنشور مطلوب' }
  if (!Array.isArray(recipients) || recipients.length === 0) return { success: false, error: 'لم يتم إدخال مستلمين' }
  if (!jobId) jobId = `ig-share-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    const opened = await smartClick(page, [
      'svg[aria-label="Share Post"]', 'svg[aria-label="مشاركة المنشور"]',
      'button[aria-label="Share Post"]', 'svg[aria-label="Share"]'
    ], 'share')
    if (!opened) return { success: false, error: 'لم يتم العثور على زر المشاركة' }
    await page.waitForTimeout(randomDelay(1200, 2000))

    for (const recipient of recipients) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(recipient).replace(/^@/, '').trim()
      try {
        await smartType(page, [
          'input[placeholder*="Search"]', 'input[name="queryBox"]', 'input[aria-label*="Search"]'
        ], handle, 'recipient search')
        await page.waitForTimeout(randomDelay(800, 1500))
        const picked = await smartClick(page, [
          `div[role="dialog"] button:has-text("${handle}")`, 'div[role="dialog"] div[role="button"]:first-of-type',
          'div[role="dialog"] li:first-of-type', 'div[role="dialog"] [role="checkbox"]:not([aria-checked="true"])'
        ], 'pick recipient')
        results.push({ recipient: handle, status: picked ? 'queued' : 'failed' })
        await page.waitForTimeout(randomDelay(400, 900))
        // Clear the search for the next recipient.
        const input = await page.$('input[placeholder*="Search"], input[name="queryBox"]')
        if (input) { await input.click({ clickCount: 3 }); await page.keyboard.press('Backspace') }
      } catch (err) {
        results.push({ recipient: handle, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: recipients.length, last: results[results.length - 1] })
    }
    if (message) {
      const wrote = await smartType(page, [
        'textarea[placeholder*="Write a message"]', 'div[contenteditable="true"]',
        'textarea[placeholder*="رسالة"]'
      ], message, 'msg')
      if (wrote) await page.waitForTimeout(randomDelay(400, 900))
    }
    const sent = await smartClick(page, [
      'div[role="dialog"] button:has-text("Send Separately")', 'div[role="dialog"] button:has-text("Send")',
      'div[role="dialog"] button:has-text("إرسال")'
    ], 'send share')
    return { success: true, sent, data: results, jobId }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract likers of a specific post by opening the likers dialog and
// scrolling. Many posts hide the likers list — we surface that gracefully.
ipcm('instagram-extract-likers', async (e, { sessionId, postUrl, limit = 200, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `ig-likers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const all = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    const opened = await smartClick(page, [
      'a[href$="/liked_by/"]', 'span:has-text("likes")', 'span:has-text("إعجاب")',
      'a[href*="/liked_by/"]', 'div[role="button"]:has-text("Like")'
    ], 'open likers')
    if (!opened) return { success: false, error: 'هذا المنشور يخفي قائمة الإعجابات' }
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(1500, 2500))
    let stagnant = 0
    while (all.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = all.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[role="dialog"] a[href^="/"]').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href || href.includes('/explore/') || href.includes('/p/')) return
          const handle = href.replace(/\//g, '')
          if (!handle) return
          const nameEl = a.parentElement?.parentElement?.querySelector('span')
          r.push({
            username: handle,
            profile: `https://instagram.com/${handle}`,
            name: nameEl ? nameEl.innerText : '',
          })
        })
        return r
      })
      for (const u of batch) {
        if (seen.has(u.username)) continue
        seen.add(u.username)
        all.push(u)
        if (all.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: all.length, total: limit, data: batch })
      if (all.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => {
        const dlg = document.querySelector('div[role="dialog"] div[style*="overflow"]') || document.querySelector('div[role="dialog"] div._aano')
        if (dlg) dlg.scrollTop = dlg.scrollHeight
      })
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('instagram', 'likers', all)
    return { success: true, data: all, count: all.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: all, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract the "following" list of a target user. Same scrolling pattern as
// the followers extractor but reads the /following/ dialog.
ipcm('instagram-extract-following', async (e, { sessionId, targetUser, limit = 200, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!targetUser) return { success: false, error: 'اسم المستخدم مطلوب' }
  if (!jobId) jobId = `ig-following-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const all = []
  try {
    const handle = String(targetUser).replace(/^@/, '').trim()
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    const opened = await smartClick(page, ['a[href$="/following/"]'], 'following link')
    if (!opened) return { success: false, error: 'تعذّر فتح قائمة المتابَعين' }
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(1500, 2500))
    let stagnant = 0
    while (all.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = all.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[role="dialog"] a[href^="/"]').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href || href.includes('/explore/') || href.includes('/p/') || href.includes('/following') || href.includes('/followers')) return
          const u = href.replace(/\//g, '')
          if (!u) return
          r.push({ username: u, profile: `https://instagram.com/${u}` })
        })
        return r
      })
      for (const u of batch) {
        if (seen.has(u.username)) continue
        seen.add(u.username)
        all.push(u)
        if (all.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: all.length, total: limit, data: batch })
      if (all.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => {
        const dlg = document.querySelector('div[role="dialog"] div[style*="overflow"]') || document.querySelector('div[role="dialog"] div._aano')
        if (dlg) dlg.scrollTop = dlg.scrollHeight
      })
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('instagram', 'following', all)
    return { success: true, data: all, count: all.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: all, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract suggested users — opens the user's profile's "Suggested for you"
// dropdown which shows similar accounts. Useful for finding niche influencers.
ipcm('instagram-extract-suggested', async (e, { sessionId, baseUser, limit = 50, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!baseUser) return { success: false, error: 'اسم المستخدم المرجعي مطلوب' }
  if (!jobId) jobId = `ig-suggested-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const suggested = []
  try {
    const handle = String(baseUser).replace(/^@/, '').trim()
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    // Click the chevron-down ("See suggested" toggle).
    await smartClick(page, [
      'button[aria-label="See suggested users"]', 'svg[aria-label="See suggested users"]',
      'div[role="button"]:has-text("Discover people")', 'svg[aria-label="Down chevron"]',
      'button[aria-label*="Suggested"]'
    ], 'open suggested')
    await page.waitForTimeout(randomDelay(1500, 2500))
    const seen = new Set()
    let stagnant = 0
    while (suggested.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = suggested.length
      const batch = await page.evaluate(() => {
        const r = []
        // Suggested users are in a horizontal scroll list — read all anchors.
        document.querySelectorAll('a[href^="/"][href*="/"]:not([href*="/explore/"]):not([href*="/p/"])').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href || href.length < 2) return
          const u = href.replace(/\//g, '').split('?')[0]
          if (!u || u.length > 30) return
          const nameSpan = a.querySelector('span') || a.parentElement?.querySelector('span')
          r.push({ username: u, profile: `https://instagram.com/${u}`, name: nameSpan ? nameSpan.innerText.trim() : '' })
        })
        return r
      })
      for (const s of batch) {
        if (seen.has(s.username)) continue
        seen.add(s.username)
        suggested.push(s)
        if (suggested.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: suggested.length, total: limit, data: batch })
      if (suggested.length === before) stagnant++
      else stagnant = 0
      // Try clicking next button on the carousel.
      await smartActionClick(page, ['button[aria-label="Next"]'], 'next suggested')
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('instagram', 'suggested-users', suggested)
    return { success: true, data: suggested, count: suggested.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: suggested, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract top "popular" Instagram users for a country by walking the
// hashtag's "Top posts" and collecting authors. Heuristic — depends on
// hashtag relevance to the country.
ipcm('instagram-top-influencers', async (e, { sessionId, hashtag, country = '', limit = 50, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!hashtag) return { success: false, error: 'الهاشتاج مطلوب' }
  if (!jobId) jobId = `ig-influencers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const influencers = []
  try {
    const tag = String(hashtag).replace('#', '').trim()
    await page.goto(`https://www.instagram.com/explore/tags/${tag}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    // Collect top-post anchors.
    const seen = new Set()
    const postLinks = await page.evaluate(() => {
      const r = []
      document.querySelectorAll('a[href^="/p/"]').forEach((a, i) => {
        if (i >= 30) return
        r.push(a.href)
      })
      return r
    })
    for (let i = 0; i < postLinks.length && influencers.length < limit; i++) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(postLinks[i], { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2500))
        const info = await page.evaluate((countryHint) => {
          // STRATEGY 1: Header anchor (most common, fastest).
          let authorLink = document.querySelector('header a[href^="/"]:not([href*="/p/"]):not([href*="/explore/"])')
          // STRATEGY 2: Any profile link in the article container (when post is in feed view).
          if (!authorLink) authorLink = document.querySelector('article a[href^="/"]:not([href*="/p/"]):not([href*="/explore/"])')
          // STRATEGY 3: Look for the username pattern in the meta tags.
          if (!authorLink) {
            const ogUrl = document.querySelector('meta[property="og:url"]')
            const href = ogUrl ? ogUrl.getAttribute('content') || '' : ''
            const m = href.match(/instagram\.com\/([^/]+)\//)
            if (m) {
              authorLink = { getAttribute: () => `/${m[1]}/`, innerText: m[1] }
            }
          }
          if (!authorLink) return null
          const username = (authorLink.getAttribute ? authorLink.getAttribute('href') || '' : '').replace(/\//g, '').split('?')[0]
          if (!username) return null
          // Name: try multiple selectors.
          let name = ''
          const candidates = [
            'header span[dir="auto"]',
            'header h2',
            'header h1',
            'article header span',
            'a[href*="/' + username + '/"] span',
          ]
          for (const sel of candidates) {
            const el = document.querySelector(sel)
            if (el && el.innerText && el.innerText.trim() && !/^[\d,KM.\s]+$/i.test(el.innerText.trim())) {
              name = el.innerText.trim()
              break
            }
          }
          // Followers: 3 strategies.
          let followers = ''
          // (1) og:description.
          const meta = document.querySelector('meta[property="og:description"], meta[name="description"]')
          const desc = meta ? meta.getAttribute('content') || '' : ''
          const fm1 = desc.match(/([\d,.]+\s*[KM]?)\s*Followers/i)
          if (fm1) followers = fm1[1].trim()
          // (2) inline header text (e.g. "1.2K followers")
          if (!followers) {
            const bodyText = document.body.innerText
            const fm2 = bodyText.match(/([\d,.]+\s*[KM]?)\s*(?:followers|متابع)/i)
            if (fm2) followers = fm2[1].trim()
          }
          // (3) JSON-LD structured data.
          if (!followers) {
            try {
              const blocks = document.querySelectorAll('script[type="application/ld+json"]')
              for (const b of blocks) {
                const j = JSON.parse(b.textContent || '{}')
                if (j.mainEntityofPage?.interactionStatistic) {
                  const stat = j.mainEntityofPage.interactionStatistic.find(s => /follow/i.test(s.interactionType?.name || s.interactionType))
                  if (stat) followers = String(stat.userInteractionCount)
                }
                if (j.author?.interactionStatistic) {
                  const stat = (Array.isArray(j.author.interactionStatistic) ? j.author.interactionStatistic : [j.author.interactionStatistic]).find(s => /follow/i.test(s.interactionType?.name || ''))
                  if (stat) followers = String(stat.userInteractionCount)
                }
              }
            } catch { /* ignore */ }
          }
          // Country match: check description + page text.
          const everything = desc + ' ' + document.body.innerText
          const countryMatch = countryHint ? new RegExp(countryHint, 'i').test(everything) : true
          return { username, profile: `https://instagram.com/${username}`, name, followers, countryMatch }
        }, country)
        if (info && info.username && !seen.has(info.username) && (!country || info.countryMatch)) {
          seen.add(info.username)
          influencers.push(info)
          sendProgress(sender, jobId, { type: 'progress', count: influencers.length, total: limit, data: [info] })
        }
      } catch { /* skip */ }
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('instagram', 'influencers', influencers.map(i => ({ name: i.name, url: i.profile, extra: i.followers, source: i.username })))
    return { success: true, data: influencers, count: influencers.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: influencers, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Analyze a user's profile — followers, following, post count, bio.
ipcm('instagram-analyze-profile', async (e, { sessionId, username }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!username) return { success: false, error: 'اسم المستخدم مطلوب' }
  try {
    const handle = String(username).replace(/^@/, '').trim()
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const stats = await page.evaluate(() => {
      const result = { username: window.location.pathname.replace(/\//g, '') }
      // STRATEGY 1: classic stats list.
      const headers = Array.from(document.querySelectorAll('header section ul li, header section ul > li, header li'))
      const numbers = headers.map(li => {
        const span = li.querySelector('span[title], span') || li
        return (span.getAttribute && span.getAttribute('title')) || span.innerText || ''
      })
      result.posts = numbers[0] || ''
      result.followers = numbers[1] || ''
      result.following = numbers[2] || ''
      // STRATEGY 2: dedicated profile-link anchors (newer IG UI).
      if (!result.followers) {
        const followersLink = document.querySelector('a[href$="/followers/"]')
        const followingLink = document.querySelector('a[href$="/following/"]')
        if (followersLink) result.followers = (followersLink.innerText.match(/[\d,.KMm]+/) || [''])[0]
        if (followingLink) result.following = (followingLink.innerText.match(/[\d,.KMm]+/) || [''])[0]
      }
      // STRATEGY 3: JSON-LD structured data.
      if (!result.followers) {
        try {
          const blocks = document.querySelectorAll('script[type="application/ld+json"]')
          for (const b of blocks) {
            const j = JSON.parse(b.textContent || '{}')
            const stat = (j.mainEntityofPage?.interactionStatistic || j.interactionStatistic || j.author?.interactionStatistic)
            const arr = Array.isArray(stat) ? stat : (stat ? [stat] : [])
            for (const s of arr) {
              const kind = (s.interactionType?.name || s.interactionType || '').toString().toLowerCase()
              if (kind.includes('follow') && !result.followers) result.followers = String(s.userInteractionCount || '')
              if (kind.includes('write') && !result.posts) result.posts = String(s.userInteractionCount || '')
            }
          }
        } catch { /* ignore */ }
      }
      // STRATEGY 4: og:description regex (last-resort fallback).
      if (!result.followers) {
        const meta = document.querySelector('meta[property="og:description"], meta[name="description"]')
        const desc = meta ? meta.getAttribute('content') || '' : ''
        const m = desc.match(/([\d,.]+\s*[KMm]?)\s*Followers?,?\s*([\d,.]+\s*[KMm]?)\s*Following,?\s*([\d,.]+)\s*Posts?/i)
        if (m) {
          result.followers = m[1].trim()
          result.following = m[2].trim()
          result.posts = m[3].trim()
        }
      }
      // Name (display name) + handle (username).
      const fullNameEl = document.querySelector('header section h1, header h1, h1.x1lliihq, article header h2')
      result.name = fullNameEl ? fullNameEl.innerText.trim() : ''
      const handleEl = document.querySelector('header section h2, header h2, h2.x1lliihq')
      result.handle = handleEl ? handleEl.innerText.trim() : result.username
      // Bio.
      const bioEl = document.querySelector('header section div[class*="bio"], header section span[class*="bio"], header section div.x1qjc9v5, header section h1 ~ div')
      result.bio = bioEl ? bioEl.innerText.trim() : ''
      // External website.
      const linkEl = document.querySelector('header section a[href^="https://"]:not([href*="instagram.com"])')
      if (linkEl) result.website = linkEl.getAttribute('href')
      // Verified badge.
      result.verified = !!document.querySelector('svg[aria-label*="Verified"], svg[aria-label*="موثق"]')
      return result
    })
    saveLeads('instagram', 'profile-analysis', [stats])
    return { success: true, data: stats }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Combo: follow each user, then send them a DM. Useful for cold outreach
// where the DM only goes through after the follow connects.
ipcm('instagram-follow-message', async (e, { sessionId, usernames = [], message, followFirst = true, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `ig-follow-msg-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const user of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(user).replace(/^@/, '').trim()
      const row = { username: handle, followed: false, messaged: false, error: null }
      try {
        if (followFirst) {
          await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(1500, 2800))
          const followed = await smartActionClick(page, [
            'button:has-text("Follow"):not(:has-text("Following"))',
            'button:has-text("متابعة"):not(:has-text("متابَع"))',
            'div[role="button"]:has-text("Follow")'
          ], 'follow')
          row.followed = !!followed
          await page.waitForTimeout(randomDelay(1500, 2500))
        }
        // Open DM with this user.
        await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2500))
        const msgBtn = await smartClick(page, [
          'button:has-text("Message")', 'button:has-text("رسالة")', 'div[role="button"]:has-text("Message")'
        ], 'message btn')
        if (!msgBtn) { row.error = 'زر الرسالة غير متاح'; results.push(row); continue }
        await page.waitForTimeout(randomDelay(2000, 3500))
        const wrote = await smartType(page, [
          'textarea[placeholder*="Message"]', 'div[contenteditable="true"][aria-label*="Message"]',
          'div[contenteditable="true"]'
        ], message, 'msg')
        if (wrote) {
          await page.waitForTimeout(randomDelay(500, 1200))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(1500, 2500))
          row.messaged = true
        }
        row.status = row.messaged ? 'sent' : row.followed ? 'followed-only' : 'failed'
      } catch (err) {
        row.error = err.message
        row.status = 'failed'
      }
      results.push(row)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: row })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: TWITTER ====================
ipcm('twitter-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'twitter', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)

    // Step 0: check if already logged in (persistent context can survive across launches)
    try {
      await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(randomDelay(2500, 4000))
      const url = page.url() || ''
      // If we land on /home (not /i/flow/login or /), we're already in
      if (url.includes('/home') || (!url.includes('/i/flow/login') && !url.includes('/login'))) {
        const isLoggedIn = await page.evaluate(() => {
          return !!(document.querySelector('a[href="/home"]') || document.querySelector('a[aria-label*="Home"]') || document.querySelector('div[data-testid="primaryColumn"]'))
        }).catch(() => false)
        if (isLoggedIn) {
          saveAccount('twitter', username || 'saved-session', password || 'saved')
          return { success: true, message: 'تم اكتشاف جلسة موجودة — تم الدخول', sessionId }
        }
      }
    } catch { /* fall through to manual login */ }

    // Step 1: navigate to login flow
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    // Twitter is VERY sensitive to fast input — wait longer than usual
    await page.waitForTimeout(randomDelay(4000, 7000))

    // Step 2: type username slowly (Twitter detects fast typing as bot)
    const userTyped = await smartType(page, [
      'input[autocomplete="username"]', 'input[name="text"]', 'input[aria-label*="Username"]',
      'input[aria-label*="Phone"]', 'input[type="text"]',
    ], username, 'username')
    if (!userTyped) {
      return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم — قد يكون X يطلب تحقق إضافي. حاول تسجيل دخول يدوي.', sessionId }
    }
    // Extra-long pause after typing (mimic human reading the form)
    await page.waitForTimeout(randomDelay(2500, 4500))

    // Step 3: click Next button
    await smartClick(page, [
      'button:has-text("Next")', 'button:has-text("التالي")',
      'button[role="button"]:has-text("Next")', 'button[type="submit"]',
      'div[role="button"]:has-text("Next")', 'div[role="button"]:has-text("التالي")',
    ], 'next')
    await page.waitForTimeout(randomDelay(3500, 6000))

    // Step 4: detect "unusual login activity" challenge BEFORE going to password
    const currentAfterNext = page.url()
    const hasChallengeAfterUsername = await page.evaluate(() => {
      const t = document.body?.innerText || ''
      return /unusual|suspicious|verify|تحقق|غير اعتيادي|verification/i.test(t)
    }).catch(() => false)
    if (hasChallengeAfterUsername) {
      return {
        success: false,
        error: 'X يطلب تحقق إضافي (رمز/هاتف). أكمل التحقق يدوياً في النافذة المفتوحة، ثم استخدم زر "ربط الحساب" مرة أخرى.',
        sessionId,
        needsManualVerification: true,
      }
    }

    // Step 5: type password
    const passTyped = await smartType(page, [
      'input[type="password"]', 'input[name="password"]', 'input[aria-label*="Password"]',
      'input[aria-label*="كلمة"]',
    ], password, 'password')
    if (!passTyped) {
      return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId, partialUrl: currentAfterNext }
    }
    await page.waitForTimeout(randomDelay(1500, 3000))

    // Step 6: submit
    await smartClick(page, [
      'button:has-text("Log in")', 'button:has-text("تسجيل الدخول")',
      'button[data-testid="LoginForm_Login_Button"]',
      'div[role="button"]:has-text("Log in")',
      'button[type="submit"]',
    ], 'login')
    await page.waitForTimeout(randomDelay(6000, 10000))

    // Step 7: check result
    const currentUrl = page.url()
    // Check for "restricted" error text on the page
    const restricted = await page.evaluate(() => {
      const t = document.body?.innerText || ''
      return /restricted|قيد|قمنا بتقييد|temporarily|مؤقتاً/i.test(t)
    }).catch(() => false)
    if (restricted) {
      return {
        success: false,
        error: 'قام X بتقييد محاولات الدخول مؤقتاً. انتظر 30-60 دقيقة وحاول مرة أخرى، أو أكمل الدخول يدوياً في النافذة المفتوحة.',
        sessionId,
        rateLimited: true,
      }
    }
    if (!currentUrl.includes('login') && !currentUrl.includes('challenge') && !currentUrl.includes('flow')) {
      saveAccount('twitter', username, password)
      return { success: true, message: 'تم تسجيل الدخول بنجاح', sessionId }
    }
    // If still on login flow, the user might need to complete it manually
    return {
      success: false,
      error: 'تعذّر إكمال تسجيل الدخول تلقائياً. أكمل من النافذة المفتوحة، وسيتم حفظ الحساب تلقائياً.',
      sessionId,
      needsManualCompletion: true,
    }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('twitter-tweet', async (e, { sessionId, text }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const input = await page.$('[data-testid="tweetTextarea_0"], div[contenteditable="true"]')
    if (input) {
      await smartType(page, ['[data-testid="tweetTextarea_0"]', 'div[contenteditable="true"]'], text, 'tweet text')
      await page.waitForTimeout(randomDelay(1000, 2000))
      await smartClick(page, ['button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]', 'button:has-text("Post")'], 'tweet button')
      await page.waitForTimeout(randomDelay(2000, 4000))
      return { success: true, message: 'تم النشر' }
    }
    return { success: false, error: 'لم يتم العثور على حقل النص' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('twitter-extract-followers', async (e, { sessionId, username, limit = 100 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const followers = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href^="/"]').forEach((a, i) => {
        if (i >= lim) return
        const href = a.getAttribute('href')
        if (href && href.length > 1 && !href.includes('/followers') && href.startsWith('/') && !href.includes('?')) {
          r.push({ username: href.replace('/', ''), profile: `https://x.com${href}` })
        }
      })
      return r
    }, limit)
    saveLeads('twitter', 'followers', followers)
    return { success: true, data: followers, count: followers.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('twitter-schedule-tweet', async (e, { text, scheduledAt }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const stmt = globals.db.prepare('INSERT INTO campaigns (name, platform, type, status, results, scheduled_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const result = stmt.run('Scheduled Tweet', 'twitter', 'schedule', 'pending', JSON.stringify({ text }), scheduledAt, JSON.stringify({ text, scheduledAt }))
    return { success: true, message: 'تم حفظ التغريدة المجدولة', id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('twitter-follow', async (e, { sessionId, usernames }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const user of usernames) {
    try {
      await page.goto(`https://x.com/${user}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      if (await smartActionClick(page, ['button:has-text("Follow")', 'button:has-text("متابعة")'], 'follow')) {
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ user, status: 'followed' })
      } else {
        results.push({ user, status: 'failed', error: 'Follow button not found' })
      }
    } catch (err) {
      results.push({ user, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('twitter-retweet', async (e, { sessionId, tweetUrls }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const url of tweetUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const retweetBtn = await page.$('button[data-testid="retweet"], button[aria-label="Retweet"]')
      if (retweetBtn) {
        await smartActionClick(page, ['button[data-testid="retweet"]', 'button[aria-label="Retweet"]'], 'retweet')
        await page.waitForTimeout(randomDelay(1000, 2000))
        await smartActionClick(page, ['div[data-testid="retweetConfirm"]', 'button:has-text("Retweet")'], 'confirm retweet')
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ url, status: 'retweeted' })
      } else {
        results.push({ url, status: 'failed', error: 'Retweet button not found' })
      }
    } catch (err) {
      results.push({ url, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

// Search tweets by query (keyword, #hashtag, or "from:username"). Pulls
// the most relevant or latest tweets depending on `tab` ("latest" | "top").
ipcm('twitter-search-tweets', async (e, { sessionId, query, tab = 'latest', limit = 100, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `tw-search-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const tweets = []
  try {
    const t = tab === 'top' ? 'top' : 'live'
    const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=${t}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    let stagnant = 0
    while (tweets.length < limit && stagnant < 6) {
      if (globals.cancelFlags.get(jobId)) break
      const before = tweets.length
      const batch = await page.evaluate(() => {
        const out = []
        document.querySelectorAll('article[data-testid="tweet"]').forEach(art => {
          const linkEl = art.querySelector('a[href*="/status/"]')
          const userEl = art.querySelector('a[href^="/"]:not([href*="/status/"]) span')
          const textEl = art.querySelector('div[data-testid="tweetText"]')
          const timeEl = art.querySelector('time')
          if (!linkEl || !textEl) return
          out.push({
            url: linkEl.href,
            username: userEl ? userEl.innerText.trim() : '',
            text: textEl.innerText.trim(),
            time: timeEl ? timeEl.getAttribute('datetime') : '',
          })
        })
        return out
      })
      for (const t of batch) {
        if (seen.has(t.url)) continue
        seen.add(t.url)
        tweets.push(t)
        if (tweets.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: tweets.length, total: limit, data: batch })
      if (tweets.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('twitter', 'search-tweets', tweets.map(t => ({ name: t.username, url: t.url, text: t.text, extra: t.time })))
    return { success: true, data: tweets, count: tweets.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: tweets, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract the users who liked a specific tweet.
ipcm('twitter-extract-tweet-likers', async (e, { sessionId, tweetUrl, limit = 200, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!tweetUrl) return { success: false, error: 'رابط التغريدة مطلوب' }
  if (!jobId) jobId = `tw-likers-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const users = []
  try {
    // The likers URL is the tweet URL + "/likes".
    const likesUrl = tweetUrl.replace(/\/$/, '') + '/likes'
    await page.goto(likesUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 3500))
    let stagnant = 0
    while (users.length < limit && stagnant < 6) {
      if (globals.cancelFlags.get(jobId)) break
      const before = users.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('button[data-testid="UserCell"]').forEach(cell => {
          const nameEl = cell.querySelector('div[dir="ltr"] span') || cell.querySelector('span[dir="auto"]')
          const handleEl = cell.querySelector('div[dir="ltr"] > span:nth-child(2)') || cell.querySelector('a[href^="/"]')
          const link = cell.querySelector('a[href^="/"]')
          if (!link) return
          const handle = (link.getAttribute('href') || '').replace(/\//g, '')
          r.push({
            username: handle,
            name: nameEl ? nameEl.innerText.trim() : '',
            profile: `https://x.com/${handle}`,
          })
        })
        return r
      })
      for (const u of batch) {
        if (!u.username || seen.has(u.username)) continue
        seen.add(u.username)
        users.push(u)
        if (users.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: users.length, total: limit, data: batch })
      if (users.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    saveLeads('twitter', 'tweet-likers', users)
    return { success: true, data: users, count: users.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: users, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract trending topics. If `woeid` is provided, navigate to that
// location's trends (Twitter Where-On-Earth ID). Otherwise the user's home
// trends are used.
ipcm('twitter-extract-trends', async (e, { sessionId, woeid, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    const url = woeid ? `https://x.com/i/trends?woeid=${woeid}` : 'https://x.com/explore/tabs/trending'
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const trends = await page.evaluate((lim) => {
      const out = []
      const cards = document.querySelectorAll('div[data-testid="trend"]')
      cards.forEach((card, i) => {
        if (i >= lim) return
        const titleEl = card.querySelector('div[dir="ltr"] span') || card.querySelector('span')
        const categoryEl = card.querySelector('div[dir="ltr"] + div span')
        const countEl = Array.from(card.querySelectorAll('span')).find(s => /(\d[\d,.]*)\s*(K|M|posts|تغريدة|posts)/i.test(s.innerText))
        out.push({
          title: titleEl ? titleEl.innerText.trim() : '',
          category: categoryEl ? categoryEl.innerText.trim() : '',
          count: countEl ? countEl.innerText.trim() : '',
        })
      })
      return out
    }, limit)
    saveLeads('twitter', 'trends', trends.map(t => ({ name: t.title, extra: `${t.category} • ${t.count}` })))
    return { success: true, data: trends, count: trends.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Like a list of tweet URLs.
ipcm('twitter-like-tweets', async (e, { sessionId, tweetUrls = [], delayMs = 3000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tw-like-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of tweetUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const liked = await smartActionClick(page, [
          'article[data-testid="tweet"] button[data-testid="like"]',
          'button[data-testid="like"]',
          'div[role="button"][aria-label*="Like"]'
        ], 'like')
        results.push({ url, status: liked ? 'liked' : 'skipped' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: tweetUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Reply to a list of tweets with a message. Supports {{n}} for tweet index.
ipcm('twitter-reply-tweets', async (e, { sessionId, tweetUrls = [], message, delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرد مطلوب' }
  if (!jobId) jobId = `tw-reply-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const url of tweetUrls) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const text = String(message).replace(/\{\{n\}\}/g, String(idx))
        const opened = await smartClick(page, [
          'button[data-testid="reply"]', 'div[role="button"][aria-label*="Reply"]'
        ], 'reply btn')
        if (!opened) { results.push({ url, status: 'failed', error: 'لم يتم العثور على زر الرد' }); continue }
        await page.waitForTimeout(randomDelay(1000, 1800))
        const typed = await smartType(page, [
          'div[data-testid="tweetTextarea_0"]', 'div[role="textbox"][contenteditable="true"]'
        ], text, 'reply text')
        if (!typed) { results.push({ url, status: 'failed', error: 'لم يتم العثور على حقل الرد' }); continue }
        await page.waitForTimeout(randomDelay(800, 1500))
        const sent = await smartClick(page, [
          'button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]'
        ], 'send reply')
        results.push({ url, status: sent ? 'replied' : 'failed' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: tweetUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Validate Twitter handles — check if they exist, accept DMs, and aren't
// suspended/locked. Returns status per handle.
ipcm('twitter-validate-accounts', async (e, { sessionId, usernames = [], delayMs = 2000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tw-validate-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const raw of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(raw).replace(/^@/, '').trim()
      try {
        await page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2500))
        const info = await page.evaluate(() => {
          const body = document.body.innerText
          if (/(This account doesn't exist|Account suspended|الحساب غير موجود|تم تعليق هذا الحساب)/i.test(body)) {
            return { status: 'invalid', reason: 'الحساب غير موجود/معلق' }
          }
          if (/(These posts are protected|These Tweets are protected|تغريدات هذا الحساب محمية)/i.test(body)) {
            return { status: 'protected', reason: 'حساب محمي' }
          }
          // Look for the Message button (means DM is open).
          const dmBtn = document.querySelector('[data-testid="sendDMFromProfile"], a[aria-label*="Message"], div[aria-label*="Message"]')
          // Followers count.
          const followLinks = document.querySelectorAll('a[href$="/verified_followers"], a[href$="/followers"]')
          let followers = ''
          followLinks.forEach(a => { const span = a.querySelector('span'); if (span) followers = span.innerText.trim() })
          return {
            status: 'valid',
            dmOpen: !!dmBtn,
            followers,
            verified: !!document.querySelector('svg[aria-label="Verified account"]'),
          }
        })
        results.push({ username: handle, ...info })
      } catch (err) {
        results.push({ username: handle, status: 'error', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Boost combo: like + save + retweet (no comment) on a list of tweets in
// one pass. Useful for improving the tweet's search ranking when run from
// multiple accounts.
ipcm('twitter-boost-tweets', async (e, { sessionId, tweetUrls = [], doLike = true, doSave = true, doRetweet = true, delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tw-boost-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of tweetUrls) {
      if (globals.cancelFlags.get(jobId)) break
      const out = { url, liked: false, saved: false, retweeted: false, error: null }
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 2800))
        if (doLike) {
          const liked = await smartActionClick(page, ['button[data-testid="like"]', 'div[role="button"][aria-label*="Like"]'], 'like')
          out.liked = !!liked
        }
        if (doRetweet) {
          await smartClick(page, ['button[data-testid="retweet"]', 'button[aria-label="Retweet"]'], 'retweet menu')
          await page.waitForTimeout(randomDelay(500, 1200))
          const rt = await smartActionClick(page, ['div[data-testid="retweetConfirm"]', 'div[role="menuitem"]:has-text("Repost")', 'div[role="menuitem"]:has-text("Retweet")'], 'confirm retweet')
          out.retweeted = !!rt
        }
        if (doSave) {
          const saved = await smartActionClick(page, ['button[data-testid="bookmark"]', 'div[role="button"][aria-label*="Bookmark"]'], 'bookmark')
          out.saved = !!saved
        }
        out.status = (out.liked || out.saved || out.retweeted) ? 'done' : 'skipped'
      } catch (err) {
        out.error = err.message
        out.status = 'failed'
      }
      results.push(out)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: tweetUrls.length, last: out })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Retweet with quote (a.k.a. quote-tweet). Same as reply-tweets but uses
// the Quote action instead, so the original tweet appears embedded.
ipcm('twitter-quote-retweet', async (e, { sessionId, tweetUrls = [], comment, delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!comment) return { success: false, error: 'نص الاقتباس مطلوب' }
  if (!jobId) jobId = `tw-quote-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const url of tweetUrls) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 2800))
        await smartClick(page, ['button[data-testid="retweet"]', 'button[aria-label="Retweet"]'], 'retweet menu')
        await page.waitForTimeout(randomDelay(500, 1200))
        const quote = await smartClick(page, ['div[role="menuitem"]:has-text("Quote")', 'div[role="menuitem"]:has-text("Quote post")', 'a[href$="/compose/post?recent_search_source=tweet_recent_quoted_tweet"]'], 'quote menu')
        if (!quote) { results.push({ url, status: 'failed', error: 'لم يتم العثور على Quote' }); continue }
        await page.waitForTimeout(randomDelay(1500, 2500))
        const text = String(comment).replace(/\{\{n\}\}/g, String(idx))
        const typed = await smartType(page, ['div[data-testid="tweetTextarea_0"]', 'div[role="textbox"][contenteditable="true"]'], text, 'quote text')
        if (!typed) { results.push({ url, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' }); continue }
        await page.waitForTimeout(randomDelay(800, 1500))
        const sent = await smartClick(page, ['button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]'], 'send quote')
        results.push({ url, status: sent ? 'quoted' : 'failed' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: tweetUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Follow everyone who interacted with a specific tweet (likers + retweeters).
ipcm('twitter-follow-interactors', async (e, { sessionId, tweetUrl, mode = 'likers', limit = 100, delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!tweetUrl) return { success: false, error: 'رابط التغريدة مطلوب' }
  if (!jobId) jobId = `tw-follow-int-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    const suffix = mode === 'retweeters' ? '/retweets' : '/likes'
    const url = tweetUrl.replace(/\/$/, '') + suffix
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 3500))
    let stagnant = 0
    const seen = new Set()
    while (results.length < limit && stagnant < 6) {
      if (globals.cancelFlags.get(jobId)) break
      const before = results.length
      // Scroll once before iteration to ensure new cells appear.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(800, 1500))
      const cells = await page.$$('button[data-testid="UserCell"]')
      for (const cell of cells) {
        if (results.length >= limit || globals.cancelFlags.get(jobId)) break
        try {
          const handle = await cell.evaluate(c => {
            const a = c.querySelector('a[href^="/"]')
            return a ? (a.getAttribute('href') || '').replace(/\//g, '') : ''
          })
          if (!handle || seen.has(handle)) continue
          seen.add(handle)
          // Find the follow button inside the cell.
          const followBtn = await cell.$('div[data-testid$="-follow"], button[data-testid$="-follow"]')
          if (!followBtn) { results.push({ username: handle, status: 'skipped' }); continue }
          await followBtn.click({ force: true }).catch(() => {})
          await page.waitForTimeout(randomDelay(600, 1200))
          results.push({ username: handle, status: 'followed' })
        } catch (err) {
          results.push({ status: 'failed', error: err.message })
        }
        sendProgress(sender, jobId, { type: 'progress', count: results.length, total: limit, last: results[results.length - 1] })
        await page.waitForTimeout(delayMs / 2 + Math.random() * 1000)
      }
      if (results.length === before) stagnant++
      else stagnant = 0
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Mass-publish many tweets in a row from a single account. The tweets array
// can be plain strings or { text, imagePath } objects.
ipcm('twitter-mass-publish', async (e, { sessionId, tweets = [], delayMs = 8000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tw-mass-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (let i = 0; i < tweets.length; i++) {
      if (globals.cancelFlags.get(jobId)) break
      const t = typeof tweets[i] === 'string' ? { text: tweets[i] } : tweets[i]
      if (t.imagePath && !fs.existsSync(t.imagePath)) {
        results.push({ index: i, status: 'failed', error: `الصورة غير موجودة: ${t.imagePath}` })
        continue
      }
      try {
        await page.goto('https://x.com/compose/tweet', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3000))
        const typed = await smartType(page, ['div[data-testid="tweetTextarea_0"]', 'div[role="textbox"][contenteditable="true"]'], t.text || '', 'tweet text')
        if (!typed) { results.push({ index: i, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' }); continue }
        if (t.imagePath) {
          const fileInput = await page.$('input[type="file"][data-testid="fileInput"], input[type="file"]')
          if (fileInput) {
            await fileInput.setInputFiles([t.imagePath])
            await page.waitForTimeout(randomDelay(2500, 4000))
          }
        }
        await page.waitForTimeout(randomDelay(500, 1200))
        const sent = await smartClick(page, ['button[data-testid="tweetButton"]', 'button[data-testid="tweetButtonInline"]'], 'send tweet')
        results.push({ index: i, text: t.text?.slice(0, 60) || '', status: sent ? 'posted' : 'failed' })
      } catch (err) {
        results.push({ index: i, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: tweets.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: LINKEDIN ====================
ipcm('linkedin-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'linkedin', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      '#username', 'input[name="session_key"]', 'input[aria-label*="Email"]', 'input[aria-label*="بريد"]',
      'input[type="text"]', 'input[id*="username"]'
    ], username, 'username')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل البريد', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    const passTyped = await smartType(page, [
      '#password', 'input[name="session_password"]', 'input[type="password"]', 'input[aria-label*="Password"]',
      'input[aria-label*="كلمة"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("تسجيل الدخول")'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
    const currentUrl = page.url()
    if (!currentUrl.includes('login') && !currentUrl.includes('challenge')) {
      saveAccount('linkedin', username, password)
      return { success: true, message: 'تم تسجيل الدخول', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('linkedin-search', async (e, { sessionId, query, type = 'all', limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    const url = `https://www.linkedin.com/search/results/${type === 'people' ? 'people' : type === 'companies' ? 'companies' : 'all'}/?keywords=${encodeURIComponent(query)}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const results = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href*="/in/"], a[href*="/company/"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ name: a.innerText.trim(), profile: a.href })
      })
      return r
    }, limit)
    saveLeads('linkedin', 'search', results)
    return { success: true, data: results, count: results.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('linkedin-extract-companies', async (e, { sessionId, searchUrl, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const companies = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href*="/company/"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ name: a.innerText.trim(), profile: a.href })
      })
      return r
    }, limit)
    saveLeads('linkedin', 'companies', companies)
    return { success: true, data: companies, count: companies.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('linkedin-send-messages', async (e, { sessionId, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const recipient of recipients) {
    try {
      await page.goto(`https://www.linkedin.com/in/${recipient}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const msgBtn = await page.$('button:has-text("Message"), button[aria-label="Message"]')
      if (msgBtn) {
        await smartClick(page, ['button:has-text("Message")', 'button[aria-label="Message"]'], 'message button')
        await page.waitForTimeout(randomDelay(2000, 4000))
        const input = await page.$('div[contenteditable="true"]')
        if (input) {
          await smartType(page, ['div[contenteditable="true"]'], message, 'message')
          await page.waitForTimeout(randomDelay(1000, 2000))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(2000, 4000))
          results.push({ recipient, status: 'sent' })
        } else {
          results.push({ recipient, status: 'failed', error: 'Message input not found' })
        }
      } else {
        results.push({ recipient, status: 'failed', error: 'Message button not found' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

// Extract people (search results page) with name, title, company, profile URL.
ipcm('linkedin-extract-people', async (e, { sessionId, query, limit = 100, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `li-people-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const people = []
  try {
    const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const maxPages = Math.max(Math.ceil(limit / 10), 5)
    for (let p = 0; p < maxPages; p++) {
      if (globals.cancelFlags.get(jobId)) break
      if (people.length >= limit) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1200, 2200))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('li.reusable-search__result-container, div.entity-result, [data-test-search-result]').forEach(card => {
          const link = card.querySelector('a[href*="/in/"]')
          if (!link) return
          const name = link.querySelector('span[aria-hidden="true"], span.entity-result__title-text > span')?.innerText?.trim() || link.innerText.trim()
          const title = card.querySelector('.entity-result__primary-subtitle, [class*="primary-subtitle"]')?.innerText?.trim() || ''
          const location = card.querySelector('.entity-result__secondary-subtitle, [class*="secondary-subtitle"]')?.innerText?.trim() || ''
          if (!name) return
          r.push({ name, title, location, profile: link.href.split('?')[0] })
        })
        return r
      })
      for (const p of batch) {
        if (seen.has(p.profile)) continue
        seen.add(p.profile)
        people.push(p)
        if (people.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: people.length, total: limit, data: batch })
      // Next page.
      const next = await smartActionClick(page, ['button[aria-label="Next"]'], 'next page')
      if (!next) break
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    saveLeads('linkedin', 'people-search', people.map(p => ({ name: p.name, url: p.profile, text: p.title, source: p.location })))
    return { success: true, data: people, count: people.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: people, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Send connect requests with an optional personalized note. Each profile is
// opened, "Connect" is clicked, then "Add a note" → "Send" with the note.
ipcm('linkedin-connect-requests', async (e, { sessionId, profiles = [], note = '', delayMs = 6000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-connect-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const profile of profiles) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const url = /^https?:/i.test(profile) ? profile : `https://www.linkedin.com/in/${profile}/`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2200, 3500))
        let clicked = await smartActionClick(page, [
          'button[aria-label*="Invite"]', 'button:has-text("Connect")',
          'button[aria-label*="connect"]', 'div.pvs-overflow-actions button:has-text("Connect")'
        ], 'connect')
        if (!clicked) {
          // Try the "more" menu first.
          const opened = await smartClick(page, ['button[aria-label="More actions"]', 'button:has-text("More")', 'button[aria-label*="More"]'], 'more')
          if (opened) {
            await page.waitForTimeout(randomDelay(500, 1200))
            clicked = await smartActionClick(page, ['div[role="button"]:has-text("Connect")', 'span:has-text("Connect")'], 'connect-from-more')
          }
        }
        if (!clicked) { results.push({ profile, status: 'skipped', error: 'لم يتم العثور على زر التواصل' }); continue }
        await page.waitForTimeout(randomDelay(1000, 2000))
        if (note) {
          await smartActionClick(page, ['button:has-text("Add a note")', 'button[aria-label="Add a note"]'], 'add note')
          await page.waitForTimeout(randomDelay(800, 1500))
          await smartType(page, ['textarea[name="message"]', 'textarea[id="custom-message"]', 'textarea'], note, 'note')
          await page.waitForTimeout(randomDelay(500, 1000))
        }
        const sent = await smartActionClick(page, ['button:has-text("Send"):not(:has-text("Send a message"))', 'button[aria-label="Send invitation"]', 'button[aria-label="Send now"]'], 'send invite')
        results.push({ profile, status: sent ? 'requested' : 'failed' })
      } catch (err) {
        results.push({ profile, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: profiles.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Follow a list of company pages.
ipcm('linkedin-follow-companies', async (e, { sessionId, companies = [], delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-follow-co-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const co of companies) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const url = /^https?:/i.test(co) ? co : `https://www.linkedin.com/company/${co}/`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const followed = await smartActionClick(page, [
          'button:has-text("Follow"):not(:has-text("Following"))',
          'button[aria-label*="Follow"][aria-pressed="false"]',
          'div.org-top-card-primary-actions__action button:has-text("Follow")'
        ], 'follow company')
        results.push({ company: co, status: followed ? 'followed' : 'skipped' })
      } catch (err) {
        results.push({ company: co, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: companies.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Post text content to the LinkedIn feed.
ipcm('linkedin-post-feed', async (e, { sessionId, content }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!content || !content.trim()) return { success: false, error: 'النص مطلوب' }
  try {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    const opened = await smartClick(page, [
      'button:has-text("Start a post")', 'button[aria-label*="Start a post"]',
      'button.share-box-feed-entry__trigger', 'div.share-box-feed-entry__trigger'
    ], 'start post')
    if (!opened) return { success: false, error: 'تعذّر فتح نافذة المنشور' }
    await page.waitForTimeout(randomDelay(1500, 2500))
    const typed = await smartType(page, [
      'div[role="textbox"][contenteditable="true"]', 'div.ql-editor[contenteditable="true"]'
    ], content, 'post body')
    if (!typed) return { success: false, error: 'لم يتم العثور على حقل الكتابة' }
    await page.waitForTimeout(randomDelay(800, 1500))
    const posted = await smartClick(page, [
      'button.share-actions__primary-action', 'button:has-text("Post"):not(:has-text("post a job"))',
      'button[aria-label="Post"]'
    ], 'publish')
    if (!posted) return { success: false, error: 'تعذّر النشر' }
    await page.waitForTimeout(randomDelay(2000, 3500))
    return { success: true, message: 'تم نشر المنشور بنجاح' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Extract full company data on LinkedIn including HQ, size, specialty,
// founding year, type, website, phone, email. Walks /about/.
ipcm('linkedin-extract-company-full', async (e, { sessionId, companyUrls = [], delayMs = 2500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-co-full-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const raw of companyUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const u = String(raw).trim()
        const baseUrl = /^https?:/i.test(u) ? u : `https://www.linkedin.com/company/${u.replace(/^\/?company\//, '')}/`
        const aboutUrl = baseUrl.replace(/\/$/, '') + '/about/'
        await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        const info = await page.evaluate((sourceUrl) => {
          const out = { url: sourceUrl, status: 'extracted' }
          const nameEl = document.querySelector('h1.org-top-card-summary__title, h1') || document.querySelector('h2')
          out.name = nameEl ? nameEl.innerText.trim() : ''
          // About / overview text.
          const overviewEl = document.querySelector('p.org-about-us-organization-description__text, p[data-test-id="about-us__description"]')
          out.description = overviewEl ? overviewEl.innerText.trim() : ''
          // Walk dt/dd pairs in the Overview section.
          const labelMap = {
            website: ['website', 'الموقع'],
            phone: ['phone', 'الهاتف'],
            industry: ['industry', 'الصناعة', 'القطاع', 'تخصص'],
            companySize: ['company size', 'حجم', 'employees'],
            headquarters: ['headquarters', 'مقر', 'المقر'],
            type: ['type', 'النوع'],
            founded: ['founded', 'تأسيس'],
            specialties: ['specialties', 'specialty', 'تخصصات'],
          }
          const dts = document.querySelectorAll('dt')
          dts.forEach(dt => {
            const label = (dt.innerText || '').toLowerCase().trim()
            const dd = dt.nextElementSibling
            if (!dd || dd.tagName !== 'DD') return
            const value = dd.innerText.trim()
            if (!value) return
            for (const [field, keywords] of Object.entries(labelMap)) {
              if (keywords.some(k => label.includes(k))) {
                out[field] = value
                return
              }
            }
          })
          // Followers (sometimes shown on page header).
          const bodyText = document.body.innerText
          const followers = bodyText.match(/([\d,.]+[KMm]?)\s*follower/i)
          if (followers) out.followers = followers[1]
          // Email — scan the page text.
          const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
          if (emailMatch) out.email = emailMatch[0]
          return out
        }, baseUrl)
        results.push(info)
      } catch (err) {
        results.push({ url: raw, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: companyUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    saveLeads('linkedin', 'company-full-data', results.filter(r => r.status === 'extracted').map(r => ({
      name: r.name, url: r.url, email: r.email, phone: r.phone, text: r.description, source: r.industry,
    })))
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract a customer's deep profile data (phone, email, address, current
// position). LinkedIn shows this only when the contact has shared it
// publicly or you have a 1st/2nd degree connection.
ipcm('linkedin-extract-deep-data', async (e, { sessionId, profileUrls = [], delayMs = 2500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-deep-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of profileUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const profileUrl = /^https?:/i.test(url) ? url : `https://www.linkedin.com/in/${url}/`
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        // Open "Contact info" overlay.
        await smartClick(page, ['a[href$="/overlay/contact-info/"]', 'a:has-text("Contact info")', 'button:has-text("Contact info")'], 'contact info')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const info = await page.evaluate((sourceUrl) => {
          const out = { profile: sourceUrl }
          // Name + headline outside the dialog.
          out.name = (document.querySelector('h1.text-heading-xlarge, h1') || {}).innerText?.trim() || ''
          out.headline = (document.querySelector('div.text-body-medium, .pv-text-details__left-panel + div') || {}).innerText?.trim() || ''
          // Inside the contact dialog.
          const dialog = document.querySelector('div[role="dialog"], section.pv-contact-info')
          if (dialog) {
            // Sections labeled by h3 inside contact dialog.
            const sections = dialog.querySelectorAll('section')
            sections.forEach(s => {
              const label = (s.querySelector('h3') || {}).innerText?.toLowerCase() || ''
              const value = (s.querySelector('a, span') || {}).innerText?.trim() || ''
              if (!value) return
              if (label.includes('email') || label.includes('بريد')) out.email = value
              else if (label.includes('phone') || label.includes('هاتف')) out.phone = value
              else if (label.includes('website') || label.includes('موقع')) out.website = value
              else if (label.includes('address') || label.includes('عنوان')) out.address = value
              else if (label.includes('twitter')) out.twitter = value
              else if (label.includes('birthday') || label.includes('ميلاد')) out.birthday = value
            })
          }
          // Location from the public profile header.
          const locEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, span.text-body-small')
          if (locEl) out.location = locEl.innerText.trim()
          return out
        }, profileUrl)
        results.push({ ...info, status: 'extracted' })
      } catch (err) {
        results.push({ profile: url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: profileUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    saveLeads('linkedin', 'deep-data', results.filter(r => r.status === 'extracted').map(r => ({ name: r.name, email: r.email, phone: r.phone, url: r.profile, text: r.headline, source: r.location })))
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Search/extract universities (Schools tab).
ipcm('linkedin-extract-schools', async (e, { sessionId, query, limit = 50, jobId, delayMs = 2000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `li-schools-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const schools = []
  try {
    const url = `https://www.linkedin.com/search/results/schools/?keywords=${encodeURIComponent(query)}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const maxPages = Math.max(Math.ceil(limit / 10), 5)
    for (let p = 0; p < maxPages; p++) {
      if (globals.cancelFlags.get(jobId)) break
      if (schools.length >= limit) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('li.reusable-search__result-container, div.entity-result').forEach(card => {
          const link = card.querySelector('a[href*="/school/"]')
          if (!link) return
          const name = link.querySelector('span[aria-hidden="true"], span')?.innerText?.trim() || link.innerText.trim()
          const subtitle = card.querySelector('.entity-result__primary-subtitle, [class*="subtitle"]')?.innerText?.trim() || ''
          r.push({ name, type: 'school', subtitle, profile: link.href.split('?')[0] })
        })
        return r
      })
      for (const s of batch) {
        if (seen.has(s.profile)) continue
        seen.add(s.profile)
        schools.push(s)
        if (schools.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: schools.length, total: limit, data: batch })
      const next = await smartActionClick(page, ['button[aria-label="Next"]'], 'next')
      if (!next) break
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    saveLeads('linkedin', 'schools', schools.map(s => ({ name: s.name, url: s.profile, text: s.subtitle })))
    return { success: true, data: schools, count: schools.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: schools, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract employees of a company or alumni of a school.
ipcm('linkedin-extract-org-members', async (e, { sessionId, orgUrl, kind = 'company', limit = 100, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!orgUrl) return { success: false, error: 'رابط المنظمة مطلوب' }
  if (!jobId) jobId = `li-org-members-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const members = []
  try {
    const peopleUrl = orgUrl.replace(/\/$/, '') + '/people/'
    await page.goto(peopleUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    let stagnant = 0
    while (members.length < limit && stagnant < 6) {
      if (globals.cancelFlags.get(jobId)) break
      const before = members.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('li.org-people-profile-card, div.artdeco-entity-lockup, li.reusable-search__result-container').forEach(card => {
          const link = card.querySelector('a[href*="/in/"]')
          if (!link) return
          const name = link.querySelector('span[aria-hidden="true"], span')?.innerText?.trim() || link.innerText.trim()
          const title = card.querySelector('.artdeco-entity-lockup__subtitle, [class*="subtitle"]')?.innerText?.trim() || ''
          r.push({ name, title, profile: link.href.split('?')[0] })
        })
        return r
      })
      for (const m of batch) {
        if (seen.has(m.profile)) continue
        seen.add(m.profile)
        members.push(m)
        if (members.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: members.length, total: limit, data: batch })
      if (members.length === before) stagnant++
      else stagnant = 0
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('linkedin', `${kind}-members`, members.map(m => ({ name: m.name, url: m.profile, text: m.title })))
    return { success: true, data: members, count: members.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: members, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract people who liked / commented on a LinkedIn post.
ipcm('linkedin-extract-post-engagement', async (e, { sessionId, postUrl, mode = 'reactions', limit = 200, jobId, delayMs = 1800 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!postUrl) return { success: false, error: 'رابط المنشور مطلوب' }
  if (!jobId) jobId = `li-post-eng-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const out = []
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 3500))
    if (mode === 'reactions') {
      // Click reactions count.
      await smartClick(page, ['.social-details-social-counts__reactions-count', 'button[aria-label*="reactions"]', 'a:has-text("reactions")'], 'open reactions')
    } else {
      // Comments mode — just scroll.
      await smartClick(page, ['button:has-text("Load more comments")', 'button[aria-label*="comments"]'], 'open comments')
    }
    await page.waitForTimeout(randomDelay(1500, 2500))
    let stagnant = 0
    while (out.length < limit && stagnant < 6) {
      if (globals.cancelFlags.get(jobId)) break
      const before = out.length
      const batch = await page.evaluate((modeKind) => {
        const r = []
        const selector = modeKind === 'reactions'
          ? 'div[role="dialog"] a[href*="/in/"], div.social-details-reactors-modal a[href*="/in/"]'
          : 'article.comments-comment-item a[href*="/in/"], .comments-comment-item a[href*="/in/"]'
        document.querySelectorAll(selector).forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href) return
          const cleanHref = href.split('?')[0]
          const name = a.innerText.trim().split('\n')[0]
          if (!name || name.length > 80) return
          r.push({ name, profile: cleanHref.startsWith('http') ? cleanHref : `https://www.linkedin.com${cleanHref}` })
        })
        return r
      }, mode)
      for (const e of batch) {
        if (seen.has(e.profile)) continue
        seen.add(e.profile)
        out.push(e)
        if (out.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: out.length, total: limit, data: batch })
      if (out.length === before) stagnant++
      else stagnant = 0
      // Scroll modal or page.
      await page.evaluate(() => {
        const dlg = document.querySelector('div[role="dialog"] div[class*="reactors-list"]') || document.querySelector('div[role="dialog"]')
        if (dlg) dlg.scrollTop = dlg.scrollHeight
        else window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('linkedin', `post-${mode}`, out)
    return { success: true, data: out, count: out.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: out, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract the groups the logged-in user is a member of.
ipcm('linkedin-list-my-groups', async (e, { sessionId, limit = 100, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-my-groups-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const groups = []
  try {
    await page.goto('https://www.linkedin.com/groups/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    for (let i = 0; i < 10 && groups.length < limit; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('a[href*="/groups/"]:not([href$="/groups/"]):not([href*="/groups/discover"])').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href.includes('/groups/') || /\/groups\/\d+\/?$/.test(href) === false && /\/groups\/[^/]+\/?$/.test(href) === false) return
          const name = a.innerText.trim().split('\n')[0]
          if (!name || name.length > 100) return
          r.push({ name, url: href.startsWith('http') ? href.split('?')[0] : `https://www.linkedin.com${href.split('?')[0]}` })
        })
        return r
      })
      const seen = new Set(groups.map(g => g.url))
      for (const g of batch) {
        if (seen.has(g.url)) continue
        groups.push(g)
        if (groups.length >= limit) break
      }
    }
    saveLeads('linkedin', 'my-groups', groups)
    return { success: true, data: groups, count: groups.length, jobId }
  } catch (err) {
    return { success: false, error: err.message, partialData: groups, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Post text to multiple LinkedIn groups (must be a member first).
ipcm('linkedin-post-to-groups', async (e, { sessionId, groupUrls = [], content, delayMs = 7000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!content) return { success: false, error: 'النص مطلوب' }
  if (!jobId) jobId = `li-grp-post-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of groupUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2500, 4000))
        await smartClick(page, ['button:has-text("Start a conversation")', 'button[aria-label*="Start a"]'], 'open composer')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const typed = await smartType(page, ['div[role="textbox"][contenteditable="true"]', 'div.ql-editor[contenteditable="true"]'], content, 'body')
        if (!typed) { results.push({ url, status: 'failed', error: 'لم يتم العثور على حقل النشر' }); continue }
        await page.waitForTimeout(randomDelay(800, 1500))
        const posted = await smartClick(page, ['button.share-actions__primary-action', 'button:has-text("Post"):not(:has-text("a job"))'], 'publish')
        results.push({ url, status: posted ? 'posted' : 'failed' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groupUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Find email addresses via Google site-search of LinkedIn profiles
// matching an interest + country combination. Uses Bing as fallback if
// Google rate-limits.
ipcm('linkedin-emails-by-interest', async (e, { sessionId, interest, country, limit = 30 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!interest) return { success: false, error: 'الاهتمام مطلوب' }
  try {
    const queryParts = [
      'site:linkedin.com/in',
      `"${interest}"`,
      country ? `"${country}"` : '',
      '("@gmail.com" OR "@yahoo.com" OR "@hotmail.com" OR "@outlook.com")',
    ].filter(Boolean).join(' ')
    const url = `https://www.google.com/search?q=${encodeURIComponent(queryParts)}&num=50`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const found = await page.evaluate((lim) => {
      const text = document.body.innerText
      const emailRe = /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g
      const matches = text.match(emailRe) || []
      const unique = Array.from(new Set(matches))
      return unique.slice(0, lim).map(em => ({ email: em }))
    }, limit)
    saveLeads('linkedin', 'emails', found.map(f => ({ name: '', email: f.email })))
    return { success: true, data: found, count: found.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Join LinkedIn groups by URL.
ipcm('linkedin-join-groups', async (e, { sessionId, groupUrls = [], delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `li-join-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of groupUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const joined = await smartActionClick(page, [
          'button:has-text("Request to join")', 'button:has-text("Join")',
          'button[aria-label*="Request to join"]', 'button[aria-label*="Join"]'
        ], 'join group')
        results.push({ url, status: joined ? 'requested' : 'skipped' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groupUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: TELEGRAM ====================
ipcm('telegram-login', async (e, { phoneNumber, headless = false }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'telegram' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://web.telegram.org/a/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(3000, 5000))
    const phoneTyped = await smartType(page, [
      'input[type="tel"]', 'input[name="phone"]', 'input[aria-label*="Phone"]',
      'input[placeholder*="Phone"]', 'input[placeholder*="phone"]', 'input[inputmode="tel"]'
    ], phoneNumber, 'phone')
    if (phoneTyped) {
      await page.waitForTimeout(randomDelay(1000, 2000))
      await smartClick(page, [
        'button[type="submit"]', 'button:has-text("Next")', 'button:has-text("التالي")',
        'button[data-testid="login-next"]'
      ], 'next')
      await page.waitForTimeout(randomDelay(2000, 4000))
      return { success: true, message: 'أدخل الكود المرسل لهاتفك', sessionId, needsCode: true }
    }
    return { success: true, message: 'Telegram Web مفتوح - سجل دخول يدوياً', sessionId }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('telegram-verify-code', async (e, { sessionId, code }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    const codeInput = await page.$('input[type="tel"], input[type="text"], input[name="code"], input[aria-label*="code"], input[placeholder*="code"], input[placeholder*="Code"], input[placeholder*="كود"]')
    if (codeInput) {
      await smartType(page, ['input[type="tel"]', 'input[type="text"]', 'input[name="code"]', 'input[aria-label*="code"]', 'input[placeholder*="code"]', 'input[placeholder*="Code"]', 'input[placeholder*="كود"]'], code, 'verification code')
      await page.waitForTimeout(randomDelay(500, 1000))
      await smartClick(page, ['button[type="submit"]', 'button:has-text("Next")', 'button:has-text("التالي")', 'button[data-testid="login-next"]'], 'submit button')
      await page.waitForTimeout(randomDelay(3000, 5000))
      return { success: true, message: 'تم إدخال كود التحقق' }
    }
    await page.keyboard.type(code, { delay: 100 })
    await page.waitForTimeout(randomDelay(3000, 5000))
    return { success: true, message: 'تم إدخال كود التحقق' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('telegram-send-messages', async (e, { sessionId, recipients, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const recipient of recipients) {
    try {
      await smartClick(page, ['button[aria-label="New Message"]', 'button[aria-label="New message"]'], 'new message button')
      await page.waitForTimeout(randomDelay(1000, 2000))
      await smartType(page, ['input[placeholder="Search"]', 'input[placeholder="البحث"]'], recipient, 'recipient search')
      await page.waitForTimeout(randomDelay(1500, 3000))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(randomDelay(2000, 4000))
      const input = await page.$('[contenteditable="true"]')
      if (input) {
        await smartType(page, ['[contenteditable="true"]'], message, 'message')
        await page.waitForTimeout(randomDelay(500, 1500))
        await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(2000, 4000))
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed', error: 'لم يتم العثور على مربع الكتابة' })
      }
    } catch (err) {
      results.push({ recipient, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

ipcm('telegram-extract-members', async (e, { sessionId, groupUrl, limit = 200 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartActionClick(page, ['button[aria-label="Group info"]'], 'group info')
    await page.waitForTimeout(randomDelay(1500, 3000))
    await smartActionClick(page, ['text=/members|أعضاء/i'], 'members button')
    await page.waitForTimeout(randomDelay(2000, 4000))
    const members = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[class*="ChatModal"] a[href*="#"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ name: a.innerText.trim(), username: a.href.split('#')[1] || '' })
      })
      return r
    }, limit)
    saveLeads('telegram', 'group-members', members)
    return { success: true, data: members, count: members.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('telegram-add-users', async (e, { sessionId, groupUsername, users }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  const results = []
  for (const user of users) {
    try {
      await page.goto(`https://t.me/${groupUsername}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      results.push({ user, status: 'added' })
    } catch (err) {
      results.push({ user, status: 'error', error: err.message })
    }
    await page.waitForTimeout(randomDelay(2000, 4000))
  }
  return { success: true, data: results }
})

// Extract the user's chat list (dialogs) from the left sidebar. Returns
// { name, type, lastMessage, time }. Useful for re-targeting audiences you
// already chat with.
ipcm('telegram-extract-dialogs', async (e, { sessionId, limit = 300, filter = 'all' }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.waitForSelector('.chats-container, .chat-list, #LeftColumn-main', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(1500, 2500))
    const dialogs = []
    const seen = new Set()
    const maxScrolls = Math.max(Math.ceil(limit / 20), 8)
    for (let i = 0; i < maxScrolls; i++) {
      const batch = await page.evaluate(() => {
        const out = []
        const rows = document.querySelectorAll('.chatlist-chat, .ListItem-button, a.chat-item, .Chat')
        rows.forEach(row => {
          const titleEl = row.querySelector('.dialog-title, .ChatInfo .title, .user-title, h3')
          const subEl = row.querySelector('.dialog-subtitle, .last-message, .subtitle')
          const timeEl = row.querySelector('.dialog-date, .LastMessageMeta, .meta time')
          const isBot = row.innerText.includes('bot') || !!row.querySelector('.icon-bot')
          const isChannel = !!row.querySelector('.icon-channel, [data-tg-icon="channel"]')
          const isGroup = !!row.querySelector('.icon-group, [data-tg-icon="group"]')
          if (!titleEl) return
          const name = titleEl.innerText.trim()
          if (!name) return
          let type = 'chat'
          if (isChannel) type = 'channel'
          else if (isGroup) type = 'group'
          else if (isBot) type = 'bot'
          out.push({
            name,
            type,
            lastMessage: subEl ? subEl.innerText.trim() : '',
            time: timeEl ? timeEl.innerText.trim() : '',
          })
        })
        return out
      })
      for (const d of batch) {
        const key = d.name + '|' + d.type
        if (seen.has(key)) continue
        if (filter !== 'all' && d.type !== filter) continue
        seen.add(key)
        dialogs.push(d)
        if (dialogs.length >= limit) break
      }
      if (dialogs.length >= limit) break
      // Scroll left sidebar.
      await page.evaluate(() => {
        const pane = document.querySelector('.chats-container, .chat-list, #LeftColumn-main .scrollable') || document.querySelector('#LeftColumn .container .scrollable-y')
        if (pane) pane.scrollTop = pane.scrollHeight
      })
      await page.waitForTimeout(randomDelay(900, 1500))
    }
    saveLeads('telegram', 'dialogs', dialogs.map(d => ({ name: d.name, extra: `${d.type} • ${d.lastMessage}` })))
    return { success: true, data: dialogs, count: dialogs.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Extract contacts from the side menu → "Contacts" view.
ipcm('telegram-extract-contacts', async (e, { sessionId, limit = 1000 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    // Open burger menu → contacts.
    await smartClick(page, ['.btn-menu-toggle', 'button.menu-toggle', '#LeftMainHeader .icon-menu', 'button[aria-label="Menu"]'], 'menu')
    await page.waitForTimeout(randomDelay(800, 1400))
    await smartClick(page, ['.menu-contacts', 'button:has-text("Contacts")', 'button:has-text("جهات الاتصال")', '[data-action="contacts"]'], 'contacts')
    await page.waitForTimeout(randomDelay(1500, 2500))
    const contacts = []
    const seen = new Set()
    let stagnant = 0
    while (contacts.length < limit && stagnant < 5) {
      const before = contacts.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('.contact-row, .ListItem-button, .user-item').forEach(row => {
          const nameEl = row.querySelector('.user-title, .dialog-title, h3, .title')
          const subEl = row.querySelector('.user-last-message, .user-status, .subtitle')
          if (!nameEl) return
          const name = nameEl.innerText.trim()
          if (!name) return
          const sub = subEl ? subEl.innerText.trim() : ''
          const phoneMatch = (name + ' ' + sub).match(/(\+\d[\d\s-]{6,}\d)/)
          r.push({ name, phone: phoneMatch ? phoneMatch[1].replace(/\s/g, '') : '', status: sub })
        })
        return r
      })
      for (const c of batch) {
        if (seen.has(c.name)) continue
        seen.add(c.name)
        contacts.push(c)
        if (contacts.length >= limit) break
      }
      if (contacts.length === before) stagnant++
      else stagnant = 0
      await page.evaluate(() => {
        const pane = document.querySelector('.contact-list, .contacts-container, .scrollable-y')
        if (pane) pane.scrollTop = pane.scrollHeight
      })
      await page.waitForTimeout(randomDelay(900, 1500))
    }
    saveLeads('telegram', 'contacts', contacts)
    return { success: true, data: contacts, count: contacts.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Search public groups/channels by keyword. Telegram Web's global search
// returns chats, channels, and global messages. We filter to groups+channels.
ipcm('telegram-search-public', async (e, { sessionId, query, type = 'all', limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  try {
    await smartClick(page, ['.input-search', 'input[type="search"]', '#LeftMainHeader .input-field-input', 'input[placeholder*="Search"]'], 'search box')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]', 'input[placeholder*="Search"]'], query, 'search')
    await page.waitForTimeout(randomDelay(2500, 4000))
    const results = await page.evaluate((lim) => {
      const r = []
      const rows = document.querySelectorAll('.chatlist-chat, .ListItem-button, .search-result, .ListItem')
      rows.forEach((row, i) => {
        if (r.length >= lim) return
        const nameEl = row.querySelector('.dialog-title, h3, .title, .user-title')
        const subEl = row.querySelector('.dialog-subtitle, .subtitle, .user-last-message')
        const linkEl = row.querySelector('a[href*="t.me/"]') || row.closest('a[href*="t.me/"]')
        if (!nameEl) return
        const name = nameEl.innerText.trim()
        if (!name) return
        const sub = subEl ? subEl.innerText.trim() : ''
        let kind = 'chat'
        if (sub.toLowerCase().includes('channel') || sub.includes('قناة')) kind = 'channel'
        else if (sub.toLowerCase().includes('group') || /\d+\s*member/i.test(sub) || sub.includes('عضو')) kind = 'group'
        else if (sub.toLowerCase().includes('bot')) kind = 'bot'
        r.push({
          name, type: kind, subtitle: sub,
          url: linkEl ? linkEl.href : '',
        })
      })
      return r
    }, limit)
    const filtered = type === 'all' ? results : results.filter(r => r.type === type)
    saveLeads('telegram', 'search-results', filtered.map(r => ({ name: r.name, url: r.url, extra: r.subtitle })))
    return { success: true, data: filtered, count: filtered.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Join multiple groups/channels by their URLs or @usernames.
ipcm('telegram-join-groups', async (e, { sessionId, groups = [], delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tg-join-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const raw of groups) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const link = String(raw).trim().replace(/^@/, '')
        const url = /^https?:/i.test(link) ? link : `https://t.me/${link}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        // Telegram Web auto-opens the chat; click Join.
        const joined = await smartActionClick(page, [
          'button:has-text("Join Group")', 'button:has-text("Join Channel")',
          'button:has-text("View Channel")', 'button:has-text("View Group")',
          'button:has-text("VIEW IN TELEGRAM")', 'a:has-text("Join")',
          'button:has-text("الانضمام")'
        ], 'join')
        results.push({ group: raw, status: joined ? 'joined' : 'skipped' })
      } catch (err) {
        results.push({ group: raw, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groups.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Send the same message to multiple group URLs / @usernames. Uses the in-app
// text composer on each opened chat. Supports {{n}} placeholder.
ipcm('telegram-send-to-groups', async (e, { sessionId, groups = [], message, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `tg-group-send-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const raw of groups) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      try {
        const link = String(raw).trim().replace(/^@/, '')
        const url = /^https?:/i.test(link) ? link : `https://t.me/${link}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        // If the page shows the "Open in Web" interstitial, click it.
        await smartActionClick(page, ['a:has-text("View in Telegram")', 'a:has-text("OPEN IN WEB")', 'a:has-text("Continue in Web")'], 'open in web')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const text = String(message).replace(/\{\{n\}\}/g, String(idx))
        const typed = await smartType(page, [
          '.input-message-input', 'div[contenteditable="true"][data-text-format="plain"]',
          'div[contenteditable="true"][placeholder*="Message"]', 'div[role="textbox"]'
        ], text, 'msg')
        if (!typed) { results.push({ group: raw, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' }); continue }
        await page.waitForTimeout(randomDelay(500, 1200))
        await page.keyboard.press('Enter').catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2500))
        results.push({ group: raw, status: 'sent' })
      } catch (err) {
        results.push({ group: raw, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: groups.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Add users to a group by Telegram numeric ID. The flow opens the
// "Add member" dialog in the group's info pane and types the ID.
ipcm('telegram-add-by-id', async (e, { sessionId, groupName, userIds = [], delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!groupName) return { success: false, error: 'اسم المجموعة مطلوب' }
  if (!jobId) jobId = `tg-add-id-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    // Search and open the group.
    await smartClick(page, ['.input-search', 'input[type="search"]', 'input[placeholder*="Search"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]'], groupName, 'search')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    // Open group info.
    await smartClick(page, ['.topbar', '.chat-info', 'div.peer-title', 'header div[role="button"]'], 'group header')
    await page.waitForTimeout(randomDelay(1500, 2500))
    for (const id of userIds) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const clean = String(id).replace(/[^0-9]/g, '')
        if (!clean) { results.push({ userId: id, status: 'failed', error: 'ID غير صالح' }); continue }
        // Click "Add Members".
        await smartClick(page, ['li:has-text("Add Members")', 'li:has-text("Add Member")', 'button:has-text("Add Member")', '.btn-icon[aria-label*="Add"]'], 'add member btn')
        await page.waitForTimeout(randomDelay(900, 1500))
        const typed = await smartType(page, ['.input-search input', 'input[type="text"]', 'input[placeholder*="user"]'], clean, 'id search')
        if (!typed) { results.push({ userId: clean, status: 'failed', error: 'تعذّر الكتابة' }); continue }
        await page.waitForTimeout(randomDelay(1200, 2000))
        const picked = await smartClick(page, ['div[role="listitem"]:first-of-type', '.chatlist-chat:first-of-type'], 'pick user')
        await page.waitForTimeout(randomDelay(700, 1200))
        const confirmed = await smartClick(page, ['button:has-text("Add")', 'button.btn-primary:has-text("Add")', 'button:has-text("إضافة")'], 'confirm add')
        results.push({ userId: clean, status: picked && confirmed ? 'added' : 'failed' })
      } catch (err) {
        results.push({ userId: id, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: userIds.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Mass search + collect groups/channels across multiple keywords/topics.
// Builds the "20K+ groups" dataset the user asked for by running the search
// for each keyword and concatenating results.
ipcm('telegram-bulk-groups-download', async (e, { sessionId, keywords = [], type = 'group', perKeyword = 50, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (keywords.length === 0) return { success: false, error: 'أدخل قائمة الكلمات المفتاحية' }
  if (!jobId) jobId = `tg-bulk-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const collected = []
  try {
    for (const kw of keywords) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await smartClick(page, ['.input-search', 'input[type="search"]', 'input[placeholder*="Search"]'], 'search box')
        await page.waitForTimeout(randomDelay(400, 900))
        // Clear previous search.
        const input = await page.$('.input-search input, input[type="search"]')
        if (input) { try { await input.click({ clickCount: 3 }); await page.keyboard.press('Backspace') } catch { /* ignore */ } }
        await smartType(page, ['.input-search input', 'input[type="search"]'], kw, 'kw')
        await page.waitForTimeout(randomDelay(2500, 4000))
        const batch = await page.evaluate((lim) => {
          const r = []
          document.querySelectorAll('.chatlist-chat, .ListItem-button, .search-result, .ListItem').forEach((row, i) => {
            if (r.length >= lim) return
            const nameEl = row.querySelector('.dialog-title, h3, .title, .user-title')
            const subEl = row.querySelector('.dialog-subtitle, .subtitle, .user-last-message')
            const link = row.querySelector('a[href*="t.me/"]')
            if (!nameEl) return
            const name = nameEl.innerText.trim()
            if (!name) return
            const sub = subEl ? subEl.innerText.trim() : ''
            let kind = 'chat'
            if (sub.toLowerCase().includes('channel') || sub.includes('قناة')) kind = 'channel'
            else if (/\d+\s*member/i.test(sub) || sub.includes('عضو') || sub.toLowerCase().includes('group')) kind = 'group'
            else if (sub.toLowerCase().includes('bot')) kind = 'bot'
            r.push({ name, type: kind, subtitle: sub, url: link ? link.href : '' })
          })
          return r
        }, perKeyword)
        for (const item of batch) {
          if (type !== 'all' && item.type !== type) continue
          const key = item.name + '|' + item.type
          if (seen.has(key)) continue
          seen.add(key)
          collected.push({ ...item, keyword: kw })
        }
        sendProgress(sender, jobId, { type: 'progress', count: collected.length, total: keywords.length * perKeyword, data: batch })
      } catch (err) { /* continue with next keyword */ }
      await page.waitForTimeout(randomDelay(1500, 2500))
    }
    saveLeads('telegram', 'bulk-groups', collected.map(c => ({ name: c.name, url: c.url, source: c.keyword, extra: c.subtitle })))
    return { success: true, data: collected, count: collected.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: collected, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: TELEGRAM PREMIUM ====================

// Extract members from a Telegram group/channel WHERE THE ADMIN HID THE
// MEMBER LIST. Works only on a Premium account (Telegram limitation). The
// trick: even with hidden members, the message history reveals senders;
// we walk the message history and dedupe the unique authors.
ipcm('telegram-premium-extract-hidden', async (e, { sessionId, groupName, limit = 500, jobId, delayMs = 1200 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!groupName) return { success: false, error: 'اسم المجموعة مطلوب' }
  if (!jobId) jobId = `tg-prem-hidden-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const members = []
  try {
    // Open the group via search.
    await smartClick(page, ['.input-search', 'input[type="search"]', 'input[placeholder*="Search"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]'], groupName, 'group')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    // Scroll the messages backward to surface more senders.
    let stagnant = 0
    while (members.length < limit && stagnant < 8) {
      if (globals.cancelFlags.get(jobId)) break
      const before = members.length
      const batch = await page.evaluate(() => {
        const out = []
        const seenLocal = new Set()
        // STRATEGY 1: classic message selectors (multiple TG Web variants).
        const messageSelectors = [
          '.Message', '.message', '[data-message-id]', '.bubble',
          '.message-content', '.history-message', 'div[role="row"]',
        ]
        const senderSelectors = [
          '.peer-title', '.Message-author', '.user-link', 'a.peer-title', '.from-name',
          '.message-author', '.bubble-author', '.from', 'span.peer-title',
          'div.message-info > a', 'div.bubble-name', '[data-from-id]',
        ]
        const msgs = []
        for (const s of messageSelectors) {
          document.querySelectorAll(s).forEach(m => msgs.push(m))
          if (msgs.length > 100) break
        }
        // Dedupe message nodes.
        const uniqueMsgs = Array.from(new Set(msgs))
        for (const msg of uniqueMsgs) {
          let senderEl = null
          for (const s of senderSelectors) {
            senderEl = msg.querySelector(s)
            if (senderEl) break
          }
          if (!senderEl) continue
          const name = (senderEl.innerText || senderEl.textContent || '').trim()
          if (!name || name.length > 80 || seenLocal.has(name)) continue
          seenLocal.add(name)
          // Get username from multiple attributes.
          const a = senderEl.closest('a, [data-peer-id], [data-from-id]') || senderEl
          let username = ''
          for (const attr of ['data-username', 'data-peer-id', 'data-from-id', 'href']) {
            const v = a.getAttribute ? a.getAttribute(attr) : null
            if (v) {
              const m = String(v).match(/@?([a-zA-Z0-9_]{4,32})/)
              if (m) { username = m[1]; break }
            }
          }
          out.push({ name, username })
        }
        // STRATEGY 2: avatar containers (when name is hidden but avatar shows).
        if (out.length === 0) {
          document.querySelectorAll('.avatar[data-peer-id], img.avatar[alt]').forEach(av => {
            const name = av.getAttribute('alt') || av.getAttribute('aria-label') || ''
            const username = av.getAttribute('data-peer-id') || ''
            if (name && !seenLocal.has(name)) { seenLocal.add(name); out.push({ name, username }) }
          })
        }
        return out
      })
      for (const m of batch) {
        const key = m.name + '|' + (m.username || '')
        if (seen.has(key)) continue
        seen.add(key)
        members.push(m)
        if (members.length >= limit) break
      }
      if (members.length === before) stagnant++
      else stagnant = 0
      // Scroll history up — try multiple containers.
      await page.evaluate(() => {
        const scrollerSelectors = [
          '.MessageList .Messages', '.messages-container', '.chat-scrollable',
          '.scrollable-y', '.bubbles-inner', '#column-center .scrollable',
          'div.history', '.middle-column .messages-container',
        ]
        for (const s of scrollerSelectors) {
          const el = document.querySelector(s)
          if (el && el.scrollHeight > el.clientHeight) {
            el.scrollTop = 0
            return
          }
        }
        // Last resort: scroll the whole window.
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('telegram', 'premium-hidden-members', members)
    return { success: true, data: members, count: members.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: members, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Add/move members to a target group by username (premium-only on some
// privacy-restricted accounts). Uses the group's "Add members" search.
ipcm('telegram-premium-add-by-username', async (e, { sessionId, targetGroup, usernames = [], delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!targetGroup) return { success: false, error: 'المجموعة المستهدفة مطلوبة' }
  if (!jobId) jobId = `tg-prem-add-u-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    // Open target group.
    await smartClick(page, ['.input-search', 'input[type="search"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]'], targetGroup, 'target')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await smartClick(page, ['.chat-info-container', '.chat-info', 'header div[role="button"]'], 'group header')
    await page.waitForTimeout(randomDelay(1500, 2500))
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const handle = String(u).replace(/^@/, '').trim()
        await smartClick(page, ['li:has-text("Add Members")', 'button:has-text("Add Member")'], 'add member btn')
        await page.waitForTimeout(randomDelay(800, 1500))
        await smartType(page, ['.input-search input', 'input[type="text"]', 'input[placeholder*="user"]'], handle, 'username')
        await page.waitForTimeout(randomDelay(1200, 2000))
        const picked = await smartClick(page, ['div[role="listitem"]:first-of-type', '.chatlist-chat:first-of-type'], 'pick')
        await page.waitForTimeout(randomDelay(700, 1200))
        const confirmed = await smartClick(page, ['button:has-text("Add")', 'button.btn-primary:has-text("Add")'], 'confirm')
        results.push({ username: handle, status: picked && confirmed ? 'added' : 'failed' })
      } catch (err) {
        results.push({ username: u, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Add/move members to a target group by phone numbers (premium can find
// non-mutual contacts by phone). Saves the phone temporarily then adds.
ipcm('telegram-premium-add-by-phone', async (e, { sessionId, targetGroup, phones = [], delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!targetGroup) return { success: false, error: 'المجموعة المستهدفة مطلوبة' }
  if (!jobId) jobId = `tg-prem-add-p-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await smartClick(page, ['.input-search', 'input[type="search"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]'], targetGroup, 'target')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await smartClick(page, ['.chat-info-container', '.chat-info', 'header div[role="button"]'], 'group header')
    await page.waitForTimeout(randomDelay(1500, 2500))
    for (const phone of phones) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const clean = String(phone).replace(/[^0-9+]/g, '')
        await smartClick(page, ['li:has-text("Add Members")', 'button:has-text("Add Member")'], 'add member btn')
        await page.waitForTimeout(randomDelay(800, 1500))
        await smartType(page, ['.input-search input', 'input[type="text"]', 'input[placeholder*="phone"]'], clean, 'phone')
        await page.waitForTimeout(randomDelay(1500, 2500))
        const picked = await smartClick(page, ['div[role="listitem"]:first-of-type', '.chatlist-chat:first-of-type'], 'pick')
        await page.waitForTimeout(randomDelay(700, 1200))
        const confirmed = await smartClick(page, ['button:has-text("Add")', 'button.btn-primary:has-text("Add")'], 'confirm')
        results.push({ phone: clean, status: picked && confirmed ? 'added' : 'failed' })
      } catch (err) {
        results.push({ phone, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: phones.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// React to messages in groups/channels (Telegram Premium feature). Opens
// each message's emoji picker and picks the chosen reaction.
ipcm('telegram-premium-react', async (e, { sessionId, groupName, emoji = '❤️', count = 20, delayMs = 1500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!groupName) return { success: false, error: 'اسم المجموعة مطلوب' }
  if (!jobId) jobId = `tg-prem-react-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await smartClick(page, ['.input-search', 'input[type="search"]'], 'search')
    await page.waitForTimeout(randomDelay(400, 900))
    await smartType(page, ['.input-search input', 'input[type="search"]'], groupName, 'group')
    await page.waitForTimeout(randomDelay(1500, 2500))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(1500, 2500))
    const messages = await page.$$('.Message, .message, .bubble')
    const sample = messages.slice(-count)
    for (const msg of sample) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        // Hover to surface the quick-reaction button.
        await msg.hover()
        await page.waitForTimeout(randomDelay(300, 600))
        const quickBtn = await msg.$('.Reactions-btn, .quick-react, [data-react], button[aria-label*="React"]')
        if (quickBtn) {
          await quickBtn.click({ force: true }).catch(() => {})
          results.push({ status: 'reacted' })
        } else {
          // Fallback: right-click to open menu.
          try { await msg.click({ button: 'right' }) } catch { /* ignore */ }
          await page.waitForTimeout(randomDelay(400, 800))
          const picked = await smartClick(page, [`button:has-text("${emoji}")`, '.reactions-menu button:first-of-type'], 'pick emoji')
          results.push({ status: picked ? 'reacted' : 'skipped' })
        }
      } catch (err) {
        results.push({ status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: sample.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: TIKTOK ====================
ipcm('tiktok-extract-comments', async (e, { sessionId, videoUrl, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(videoUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(3000, 6000))
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const comments = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[data-e2e="comment-item"], [class*="CommentContent"], [class*="comment"]').forEach((el, i) => {
        if (i >= lim) return
        const userEl = el.querySelector('a[href*="/@"]')
        r.push({ username: userEl?.innerText.trim() || '', text: el.innerText.trim(), profile: userEl?.href || '' })
      })
      return r
    }, limit)
    saveLeads('tiktok', 'comments', comments)
    return { success: true, data: comments, count: comments.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('tiktok-extract-followers', async (e, { sessionId, username, limit = 100 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const followersLink = await page.$('a[href*="/followers"]')
    if (followersLink) {
      await smartClick(page, ['a[href*="/followers"]'], 'followers link')
      await page.waitForTimeout(randomDelay(2000, 4000))
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => { const d = document.querySelector('[role="dialog"] div'); if (d) d.scrollTop = d.scrollHeight })
        await page.waitForTimeout(randomDelay(1500, 3000))
      }
    }
    const followers = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href*="/@"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ username: a.innerText.trim(), profile: a.href })
      })
      return r
    }, limit)
    saveLeads('tiktok', 'followers', followers)
    return { success: true, data: followers, count: followers.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Search videos by keyword on TikTok and return links + meta.
ipcm('tiktok-search', async (e, { sessionId, query, limit = 50, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `tt-search-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const videos = []
  try {
    await page.goto(`https://www.tiktok.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    let stagnant = 0
    while (videos.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = videos.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('a[href*="/video/"]').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href || !href.includes('/video/')) return
          const url = href.startsWith('http') ? href : `https://www.tiktok.com${href}`
          const author = (url.match(/@([^/]+)\//) || [])[1] || ''
          const captionEl = a.querySelector('img[alt]')
          const caption = captionEl ? (captionEl.getAttribute('alt') || '') : ''
          r.push({ url, author, caption })
        })
        return r
      })
      for (const v of batch) {
        if (seen.has(v.url)) continue
        seen.add(v.url)
        videos.push(v)
        if (videos.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: videos.length, total: limit, data: batch })
      if (videos.length === before) stagnant++
      else stagnant = 0
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('tiktok', 'search-videos', videos.map(v => ({ name: v.author, url: v.url, text: v.caption })))
    return { success: true, data: videos, count: videos.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: videos, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Follow a list of TikTok users.
ipcm('tiktok-follow', async (e, { sessionId, usernames = [], delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tt-follow-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(u).replace(/^@/, '').trim()
      try {
        await page.goto(`https://www.tiktok.com/@${handle}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const followed = await smartActionClick(page, [
          'button[data-e2e="follow-button"]:not(:has-text("Following"))',
          'button:has-text("Follow"):not(:has-text("Following"))',
          'button:has-text("متابعة"):not(:has-text("متابَع"))',
          'button[aria-label*="Follow"]'
        ], 'follow tiktok')
        results.push({ username: handle, status: followed ? 'followed' : 'skipped' })
      } catch (err) {
        results.push({ username: u, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Like + optionally comment on a list of TikTok video URLs.
ipcm('tiktok-interact', async (e, { sessionId, videoUrls = [], doLike = true, comment, delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `tt-interact-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    let idx = 0
    for (const url of videoUrls) {
      if (globals.cancelFlags.get(jobId)) break
      idx++
      const out = { url, liked: false, commented: false, error: null }
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        if (doLike) {
          const liked = await smartActionClick(page, [
            'button[aria-label*="Like"]:not([aria-pressed="true"])',
            'span[data-e2e="like-icon"]',
            'svg[data-e2e="like-icon"]'
          ], 'like tiktok')
          out.liked = !!liked
        }
        if (comment) {
          const text = String(comment).replace(/\{\{n\}\}/g, String(idx))
          await smartClick(page, ['div[data-e2e="comment-icon"]', 'svg[data-e2e="comment-icon"]'], 'open comments')
          await page.waitForTimeout(randomDelay(800, 1500))
          const typed = await smartType(page, [
            'div[contenteditable="true"][data-e2e="comment-input"]',
            'div[contenteditable="true"]',
            'textarea[placeholder*="comment"]'
          ], text, 'comment')
          if (typed) {
            await page.waitForTimeout(randomDelay(400, 1000))
            await page.keyboard.press('Enter')
            await page.waitForTimeout(randomDelay(1500, 2500))
            out.commented = true
          }
        }
        out.status = out.liked || out.commented ? 'done' : 'skipped'
      } catch (err) {
        out.error = err.message
        out.status = 'failed'
      }
      results.push(out)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: videoUrls.length, last: out })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Upload a video to TikTok via the web uploader.
ipcm('tiktok-upload-video', async (e, { sessionId, videoPath, caption = '' }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!videoPath || !fs.existsSync(videoPath)) return { success: false, error: 'الفيديو غير موجود' }
  try {
    await page.goto('https://www.tiktok.com/upload', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const fileInput = await page.$('input[type="file"][accept*="video"], input[type="file"]')
    if (!fileInput) return { success: false, error: 'لم يتم العثور على مدخل الفيديو' }
    await fileInput.setInputFiles([videoPath])
    // Wait for processing.
    await page.waitForTimeout(randomDelay(8000, 12000))
    if (caption) {
      await smartType(page, [
        'div[contenteditable="true"][data-text]',
        'div.public-DraftEditor-content',
        'div[contenteditable="true"]'
      ], caption, 'caption')
      await page.waitForTimeout(randomDelay(800, 1500))
    }
    const posted = await smartClick(page, [
      'button[data-e2e="post_video_button"]:not([aria-disabled="true"])',
      'button:has-text("Post"):not(:has-text("Posts"))',
      'button:has-text("نشر")'
    ], 'post video')
    if (!posted) return { success: false, error: 'لم يتم نشر الفيديو' }
    await page.waitForTimeout(randomDelay(3000, 5000))
    return { success: true, message: 'تم نشر الفيديو' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: PINTEREST ====================
ipcm('pinterest-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'pinterest', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://www.pinterest.com/login/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[id="email"]', 'input[name="id"]', 'input[type="email"]', 'input[aria-label*="Email"]',
      'input[aria-label*="بريد"]', 'input[placeholder*="Email"]', 'input[placeholder*="email"]'
    ], username, 'email')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل البريد', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    const passTyped = await smartType(page, [
      'input[id="password"]', 'input[name="password"]', 'input[type="password"]',
      'input[aria-label*="Password"]', 'input[aria-label*="كلمة"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("تسجيل الدخول")',
      'div[data-testid="login-button"]'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
    const currentUrl = page.url()
    if (!currentUrl.includes('login')) {
      saveAccount('pinterest', username, password)
      return { success: true, message: 'تم تسجيل الدخول', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('pinterest-search', async (e, { sessionId, query, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const pins = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[data-test-id="pin"], .GrowthUnauthPinImage').forEach((el, i) => {
        if (i >= lim) return
        const img = el.querySelector('img')
        const link = el.closest('a')
        r.push({ title: img?.alt || '', image: img?.src || '', link: link?.href || '' })
      })
      return r
    }, limit)
    return { success: true, data: pins, count: pins.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('pinterest-extract', async (e, { sessionId, boardUrl, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    const pins = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('img').forEach((img, i) => {
        if (i >= lim) return
        if (img.src && img.src.includes('pinimg.com')) r.push({ image: img.src, alt: img.alt || '' })
      })
      return r
    }, limit)
    saveLeads('pinterest', 'pins', pins.map(p => ({ url: p.image, name: p.alt })))
    return { success: true, data: pins, count: pins.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Follow a list of Pinterest users.
ipcm('pinterest-follow-users', async (e, { sessionId, usernames = [], delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `pin-follow-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const user of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const handle = String(user).replace(/^@/, '').trim()
        await page.goto(`https://www.pinterest.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const followed = await smartActionClick(page, [
          'button:has-text("Follow"):not(:has-text("Following"))', 'button[aria-label*="Follow"]',
          'div[data-test-id="profile-follow-button"] button'
        ], 'follow')
        results.push({ username: handle, status: followed ? 'followed' : 'skipped' })
      } catch (err) {
        results.push({ username: user, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Send a direct message to Pinterest users (1:1).
ipcm('pinterest-send-message', async (e, { sessionId, usernames = [], message, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `pin-msg-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(u).replace(/^@/, '').trim()
      try {
        await page.goto(`https://www.pinterest.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        // Click message button — Pinterest hides it behind the "..." menu.
        const opened = await smartClick(page, ['button:has-text("Message")', 'button[aria-label*="Message"]', 'div[data-test-id="user-profile-actions"] button:nth-of-type(2)'], 'open message')
        if (!opened) { results.push({ username: handle, status: 'failed', error: 'لم يتم العثور على زر المراسلة' }); continue }
        await page.waitForTimeout(randomDelay(1500, 2500))
        const typed = await smartType(page, ['textarea[placeholder*="message"]', 'div[contenteditable="true"]', 'textarea'], message, 'msg')
        if (!typed) { results.push({ username: handle, status: 'failed', error: 'لم يتم العثور على حقل الكتابة' }); continue }
        await page.waitForTimeout(randomDelay(500, 1200))
        const sent = await smartClick(page, ['button:has-text("Send")', 'button[aria-label="Send"]'], 'send')
        if (!sent) await page.keyboard.press('Enter')
        results.push({ username: handle, status: 'sent' })
      } catch (err) {
        results.push({ username: handle, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Analyze a Pinterest user's profile — followers, following, pin count.
ipcm('pinterest-analyze-profile', async (e, { sessionId, username }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!username) return { success: false, error: 'اسم المستخدم مطلوب' }
  try {
    const handle = String(username).replace(/^@/, '').trim()
    await page.goto(`https://www.pinterest.com/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 3500))
    const stats = await page.evaluate(() => {
      const body = document.body.innerText
      const followersMatch = body.match(/([\d,.]+[KMm]?)\s*follower/i)
      const followingMatch = body.match(/([\d,.]+[KMm]?)\s*following/i)
      const nameEl = document.querySelector('h1') || document.querySelector('[data-test-id="profile-name"]')
      const bioEl = document.querySelector('[data-test-id="profile-description"]') || document.querySelector('div[class*="bio"]')
      const pinsMatch = body.match(/([\d,]+)\s*pin/i)
      return {
        username: window.location.pathname.replace(/\//g, ''),
        name: nameEl ? nameEl.innerText.trim() : '',
        followers: followersMatch ? followersMatch[1] : '',
        following: followingMatch ? followingMatch[1] : '',
        pins: pinsMatch ? pinsMatch[1] : '',
        bio: bioEl ? bioEl.innerText.trim() : '',
      }
    })
    saveLeads('pinterest', 'profile-analysis', [stats])
    return { success: true, data: stats }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Extract boards matching a niche/keyword.
ipcm('pinterest-extract-boards', async (e, { sessionId, keyword, limit = 50, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!keyword) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  if (!jobId) jobId = `pin-boards-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const boards = []
  try {
    await page.goto(`https://www.pinterest.com/search/boards/?q=${encodeURIComponent(keyword)}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    let stagnant = 0
    while (boards.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = boards.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('a[href*="/"][href*="/"][href*="/"]').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!/^\/[^/]+\/[^/]+\/?$/.test(href)) return
          if (href.includes('/pin/')) return
          const titleEl = a.querySelector('div[class*="title"]') || a.querySelector('span')
          const name = titleEl ? titleEl.innerText.trim() : ''
          if (!name || name.length > 80) return
          r.push({
            name,
            url: href.startsWith('http') ? href : `https://www.pinterest.com${href}`,
          })
        })
        return r
      })
      for (const b of batch) {
        if (seen.has(b.url)) continue
        seen.add(b.url)
        boards.push(b)
        if (boards.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: boards.length, total: limit, data: batch })
      if (boards.length === before) stagnant++
      else stagnant = 0
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('pinterest', 'boards', boards)
    return { success: true, data: boards, count: boards.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: boards, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Auto-publish: create new Pins from a list of image paths.
ipcm('pinterest-auto-publish', async (e, { sessionId, pins = [], delayMs = 8000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `pin-publish-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (let i = 0; i < pins.length; i++) {
      if (globals.cancelFlags.get(jobId)) break
      const pin = pins[i]
      if (!pin || !pin.imagePath || !fs.existsSync(pin.imagePath)) {
        results.push({ index: i, status: 'failed', error: 'الصورة غير موجودة' })
        continue
      }
      try {
        await page.goto('https://www.pinterest.com/pin-creation-tool/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2500, 4000))
        const fileInput = await page.$('input[type="file"]')
        if (!fileInput) { results.push({ index: i, status: 'failed', error: 'لم يتم العثور على مدخل الملف' }); continue }
        await fileInput.setInputFiles([pin.imagePath])
        await page.waitForTimeout(randomDelay(3000, 5000))
        if (pin.title) await smartType(page, ['textarea[placeholder*="Add your title"]', 'input[placeholder*="title"]'], pin.title, 'title')
        if (pin.description) await smartType(page, ['div[role="textbox"][contenteditable="true"]', 'textarea[placeholder*="description"]'], pin.description, 'desc')
        if (pin.link) await smartType(page, ['input[placeholder*="Add a link"]', 'input[placeholder*="link"]'], pin.link, 'link')
        await page.waitForTimeout(randomDelay(800, 1500))
        const published = await smartClick(page, ['button[data-test-id="board-dropdown-save-button"]', 'button:has-text("Publish")', 'button:has-text("Save")'], 'publish')
        results.push({ index: i, title: pin.title || '', status: published ? 'published' : 'failed' })
      } catch (err) {
        results.push({ index: i, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: pins.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract pins by hashtag/keyword via Pinterest's search.
ipcm('pinterest-extract-hashtag', async (e, { sessionId, keyword, limit = 100 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!keyword) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  try {
    await page.goto(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const seen = new Set()
    const pins = []
    for (let i = 0; i < 10 && pins.length < limit; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[data-test-id="pin"], div[data-test-id="pinrep-pin"]').forEach(pin => {
          const link = pin.querySelector('a[href*="/pin/"]')
          const img = pin.querySelector('img')
          if (!link) return
          r.push({
            url: link.href,
            image: img?.src || '',
            title: img?.alt || link.getAttribute('aria-label') || '',
          })
        })
        return r
      })
      for (const p of batch) {
        if (seen.has(p.url)) continue
        seen.add(p.url)
        pins.push(p)
        if (pins.length >= limit) break
      }
    }
    saveLeads('pinterest', 'hashtag-pins', pins.map(p => ({ url: p.url, name: p.title, extra: p.image })))
    return { success: true, data: pins, count: pins.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Download Pin images from a search query or board URL to disk.
ipcm('pinterest-download', async (e, { sessionId, source, query, boardUrl, saveDir, limit = 50, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!saveDir || !fs.existsSync(saveDir)) return { success: false, error: 'المجلد غير موجود' }
  if (!jobId) jobId = `pin-dl-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const downloaded = []
  try {
    const url = source === 'board' && boardUrl
      ? boardUrl
      : `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query || '')}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    const seen = new Set()
    let stagnant = 0
    while (downloaded.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = downloaded.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('img[srcset], img[src*="pinimg"]').forEach(img => {
          const srcset = img.getAttribute('srcset') || ''
          const src = img.getAttribute('src') || ''
          let largest = src
          if (srcset) {
            const parts = srcset.split(',').map(s => s.trim())
            const last = parts[parts.length - 1]
            largest = (last || '').split(' ')[0] || src
          }
          if (largest && largest.includes('pinimg')) {
            // Upgrade to full-quality original.
            const original = largest.replace(/\/\d+x\//, '/originals/')
            r.push({ url: original, alt: img.getAttribute('alt') || '' })
          }
        })
        return r
      })
      for (const item of batch) {
        if (seen.has(item.url)) continue
        seen.add(item.url)
        try {
          const filename = path.join(saveDir, `pin_${Date.now()}_${downloaded.length + 1}.jpg`)
          const buf = await page.evaluate(async (u) => {
            const r = await fetch(u)
            const ab = await r.arrayBuffer()
            return Array.from(new Uint8Array(ab))
          }, item.url)
          fs.writeFileSync(filename, Buffer.from(buf))
          downloaded.push({ url: item.url, file: filename, alt: item.alt, status: 'downloaded' })
        } catch (err) {
          downloaded.push({ url: item.url, status: 'failed', error: err.message })
        }
        sendProgress(sender, jobId, { type: 'progress', count: downloaded.length, total: limit, last: downloaded[downloaded.length - 1] })
        if (downloaded.length >= limit) break
      }
      if (downloaded.length === before) stagnant++
      else stagnant = 0
    }
    return { success: true, data: downloaded, count: downloaded.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: downloaded, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Share a Pin to multiple boards. Opens the Pin, clicks Save → picks each
// board → clicks Save again.
ipcm('pinterest-share-pin', async (e, { sessionId, pinUrl, boards = [], delayMs = 4000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!pinUrl) return { success: false, error: 'رابط الـ Pin مطلوب' }
  if (!jobId) jobId = `pin-share-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await page.goto(pinUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    for (const board of boards) {
      if (globals.cancelFlags.get(jobId)) break
      const boardName = String(board).trim()
      try {
        // Click "Save" button to open board picker.
        const opened = await smartClick(page, [
          'button[data-test-id="board-dropdown-save-button"]',
          'button:has-text("Save"):not(:has-text("Saved"))',
          'div[role="button"]:has-text("Save"):not(:has-text("Saved"))'
        ], 'open save')
        if (!opened) { results.push({ board: boardName, status: 'failed', error: 'لم يتم فتح قائمة الحفظ' }); continue }
        await page.waitForTimeout(randomDelay(800, 1500))
        // Search board name.
        await smartType(page, ['input[placeholder*="Search boards"]', 'input[placeholder*="board"]', 'input[type="text"]'], boardName, 'board search')
        await page.waitForTimeout(randomDelay(1200, 2000))
        // Click first matching board.
        const picked = await smartClick(page, [
          `div[role="button"]:has-text("${boardName}")`,
          'div[role="button"][data-test-id="board-row"]:first-of-type',
          'div[data-test-id="board-row"]:first-of-type'
        ], 'pick board')
        results.push({ board: boardName, status: picked ? 'saved' : 'failed' })
      } catch (err) {
        results.push({ board: boardName, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: boards.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Open Pinterest signup pages in batches — manual completion (Captcha + Email verification stops fully-auto creation).
ipcm('pinterest-open-signup-batch', async (e, { count = 1 }) => {
  try {
    const sessionIds = []
    for (let i = 0; i < Math.min(count, 5); i++) {
      const res = await globals.bm.launch({ platform: `pinterest-signup-${i}`, headless: false })
      if (res.success) {
        const page = globals.bm.getPage(res.sessionId)
        await page.goto('https://www.pinterest.com/login/?referrer=signup_page', { waitUntil: 'domcontentloaded' }).catch(() => {})
        sessionIds.push(res.sessionId)
      }
    }
    return { success: true, sessionIds, message: `تم فتح ${sessionIds.length} نافذة تسجيل — أكمل التسجيل يدوياً` }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: THREADS ====================
ipcm('threads-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'threads', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://www.threads.net/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[name="username"]', 'input[name="email"]', 'input[type="text"]',
      'input[aria-label*="Username"]', 'input[aria-label*="Email"]', 'input[placeholder*="Username"]',
      'input[placeholder*="email"]', 'input[autocomplete="username"]'
    ], username, 'username')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم - سجل دخول يدوياً', sessionId }
    await page.waitForTimeout(randomDelay(800, 1500))
    const passTyped = await smartType(page, [
      'input[name="password"]', 'input[type="password"]', 'input[aria-label*="Password"]',
      'input[aria-label*="كلمة"]', 'input[placeholder*="Password"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور - سجل دخول يدوياً', sessionId }
    await page.waitForTimeout(randomDelay(800, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Log in")', 'button:has-text("تسجيل الدخول")',
      'div[role="button"]:has-text("Log in")', 'button:has-text("Log In")'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
      saveAccount('threads', username, password)
    return { success: true, message: 'تم تسجيل الدخول', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('threads-extract', async (e, { sessionId, url, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const data = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[href*="/@"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ username: a.innerText.trim(), profile: a.href })
      })
      return r
    }, limit)
    saveLeads('threads', 'extract', data)
    return { success: true, data, count: data.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('threads-mention', async (e, { sessionId, postUrl, mentions, message }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartClick(page, ['button:has-text("Reply")', 'button:has-text("رد")'], 'reply button')
    await page.waitForTimeout(randomDelay(1500, 3000))
    const text = mentions.map(m => `@${m}`).join(' ') + ' ' + message
    await smartType(page, ['textarea', 'div[contenteditable="true"]'], text, 'mention text')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(randomDelay(2000, 4000))
    return { success: true, message: 'تم المنشن' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Publish a new Threads post (text-only or with image).
ipcm('threads-publish', async (e, { sessionId, content, imagePath }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!content && !imagePath) return { success: false, error: 'النص أو الصورة مطلوبة' }
  if (imagePath && !fs.existsSync(imagePath)) return { success: false, error: 'الصورة غير موجودة' }
  try {
    await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    await smartClick(page, ['svg[aria-label="Create"]', 'div[role="button"][aria-label="Create"]', 'div[role="button"]:has-text("Start a thread")'], 'open composer')
    await page.waitForTimeout(randomDelay(1500, 2500))
    if (content) {
      await smartType(page, ['div[contenteditable="true"]', 'textarea[placeholder*="thread"]', 'div[role="textbox"]'], content, 'body')
      await page.waitForTimeout(randomDelay(500, 1200))
    }
    if (imagePath) {
      await smartClick(page, ['svg[aria-label="Attach media"]', 'button[aria-label="Attach"]'], 'attach media')
      await page.waitForTimeout(randomDelay(500, 1000))
      const fileInput = await page.$('input[type="file"]')
      if (fileInput) {
        await fileInput.setInputFiles([imagePath])
        await page.waitForTimeout(randomDelay(2500, 4000))
      }
    }
    const posted = await smartClick(page, ['div[role="button"]:has-text("Post"):not(:has-text("Posts"))', 'button:has-text("Post"):not(:has-text("Posts"))'], 'post thread')
    if (!posted) return { success: false, error: 'لم يتم النقر على زر النشر' }
    await page.waitForTimeout(randomDelay(2500, 4000))
    return { success: true, message: 'تم النشر' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Send a direct message to Threads users.
ipcm('threads-send-message', async (e, { sessionId, usernames = [], message, delayMs = 4500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `th-send-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(u).replace(/^@/, '').trim()
      try {
        await page.goto(`https://www.threads.net/@${handle}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        // Threads DMs route via Instagram inbox.
        await page.goto(`https://www.instagram.com/direct/t/${handle}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2500, 4000))
        const typed = await smartType(page, [
          'textarea[placeholder*="Message"]', 'div[contenteditable="true"][aria-label*="Message"]',
          'div[contenteditable="true"]'
        ], message, 'msg')
        if (typed) {
          await page.waitForTimeout(randomDelay(500, 1200))
          await page.keyboard.press('Enter')
          await page.waitForTimeout(randomDelay(1500, 2500))
          results.push({ username: handle, status: 'sent' })
        } else {
          results.push({ username: handle, status: 'failed', error: 'لم يتم العثور على حقل الرسالة' })
        }
      } catch (err) {
        results.push({ username: u, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Follow + send DM combo for Threads.
ipcm('threads-follow-send', async (e, { sessionId, usernames = [], message, followFirst = true, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message) return { success: false, error: 'الرسالة مطلوبة' }
  if (!jobId) jobId = `th-fs-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(u).replace(/^@/, '').trim()
      const row = { username: handle, followed: false, messaged: false, error: null }
      try {
        if (followFirst) {
          await page.goto(`https://www.threads.net/@${handle}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
          await page.waitForTimeout(randomDelay(1500, 2500))
          const followed = await smartActionClick(page, [
            'button:has-text("Follow"):not(:has-text("Following"))',
            'div[role="button"]:has-text("Follow"):not(:has-text("Following"))'
          ], 'follow threads')
          row.followed = !!followed
        }
        await page.goto(`https://www.instagram.com/direct/t/${handle}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(2000, 3500))
        const typed = await smartType(page, ['textarea[placeholder*="Message"]', 'div[contenteditable="true"]'], message, 'msg')
        if (typed) {
          await page.waitForTimeout(randomDelay(500, 1200))
          await page.keyboard.press('Enter')
          row.messaged = true
        }
        row.status = row.messaged ? 'sent' : row.followed ? 'followed-only' : 'failed'
      } catch (err) {
        row.error = err.message
        row.status = 'failed'
      }
      results.push(row)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: row })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// ==================== IPC: REDDIT ====================
ipcm('reddit-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'reddit', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://old.reddit.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[name="user"]', 'input[name="username"]', 'input[id="user_login"]',
      'input[aria-label*="Username"]', 'input[type="text"]', 'input[placeholder*="username"]',
      'input[cadata-testid="login-username"]', '#loginUsername'
    ], username, 'username')
    if (!userTyped) {
      await page.goto('https://www.reddit.com/login/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      const userTyped2 = await smartType(page, [
        'input[name="username"]', 'input[id*="loginUsername"]', 'input[aria-label*="Username"]',
        'input[type="text"]', 'input[placeholder*="username"]'
      ], username, 'username')
      if (!userTyped2) return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم', sessionId }
    }
    await page.waitForTimeout(randomDelay(800, 1500))
    const passTyped = await smartType(page, [
      'input[name="passwd"]', 'input[name="password"]', 'input[id="passwd_login"]',
      'input[type="password"]', 'input[aria-label*="Password"]', 'input[cadata-testid="login-password"]',
      '#loginPassword'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(800, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Log In")', 'button:has-text("تسجيل الدخول")',
      'button[data-testid="login-submit"]', 'input[type="submit"]', '#login'
    ], 'login')
    await page.waitForTimeout(randomDelay(6000, 10000))
    const currentUrl = page.url()
    if (!currentUrl.includes('login')) {
      saveAccount('reddit', username, password)
      return { success: true, message: 'تم تسجيل الدخول', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول - تحقق من البيانات', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

ipcm('reddit-search', async (e, { sessionId, query, limit = 50 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.reddit.com/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const results = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('a[data-click-id="body"]').forEach((a, i) => {
        if (i >= lim) return
        r.push({ title: a.innerText.trim(), link: a.href })
      })
      return r
    }, limit)
    return { success: true, data: results, count: results.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('reddit-publish', async (e, { sessionId, subreddit, title, content }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(`https://www.reddit.com/r/${subreddit}/submit`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartType(page, ['textarea[placeholder="Title"]', '#title-field', 'textarea[name="title"]'], title, 'post title')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartType(page, ['div[contenteditable="true"]', 'textarea[placeholder="Text"]', '#text-field'], content, 'post content')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartClick(page, ['button[type="submit"]', 'button:has-text("Post")', 'button:has-text("نشر")'], 'submit button')
    await page.waitForTimeout(randomDelay(3000, 5000))
    return { success: true, message: 'تم النشر' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Search Reddit communities (subreddits) by keyword. Returns name, members,
// description.
ipcm('reddit-search-communities', async (e, { sessionId, query, limit = 30 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!query) return { success: false, error: 'الكلمة المفتاحية مطلوبة' }
  try {
    await page.goto(`https://www.reddit.com/search/?q=${encodeURIComponent(query)}&type=sr`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2000, 4000))
    const seen = new Set()
    const communities = []
    for (let i = 0; i < 5 && communities.length < limit; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('a[href^="/r/"], faceplate-tracker[data-source="community_search_result"]').forEach(node => {
          let link = node
          if (node.tagName !== 'A') link = node.querySelector('a[href^="/r/"]')
          if (!link) return
          const href = link.getAttribute('href') || ''
          if (!/^\/r\/[^/]+\/?$/.test(href)) return
          const card = link.closest('div, faceplate-tracker, li') || link
          const titleEl = card.querySelector('h6, h5, h3, faceplate-screen-reader-content')
          const descEl = card.querySelector('p, [class*="description"]')
          const membersEl = Array.from(card.querySelectorAll('span, div')).find(el => /\d[\d,.]*[kKMm]?\s*member|عضو/i.test(el.innerText))
          r.push({
            name: href.replace(/\//g, '').replace(/^r/, 'r/'),
            url: 'https://www.reddit.com' + href,
            members: membersEl ? membersEl.innerText.trim() : '',
            description: descEl ? descEl.innerText.trim().slice(0, 200) : (titleEl ? titleEl.innerText.trim() : ''),
          })
        })
        return r
      })
      for (const c of batch) {
        if (seen.has(c.url)) continue
        seen.add(c.url)
        communities.push(c)
        if (communities.length >= limit) break
      }
    }
    saveLeads('reddit', 'communities', communities.map(c => ({ name: c.name, url: c.url, text: c.description, source: c.members })))
    return { success: true, data: communities, count: communities.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Join multiple subreddits.
ipcm('reddit-join-communities', async (e, { sessionId, subreddits = [], delayMs = 3500, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `rd-join-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const sub of subreddits) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        const name = String(sub).replace(/^r\//, '').replace(/^\//, '').trim()
        await page.goto(`https://www.reddit.com/r/${name}/`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1800, 3000))
        const joined = await smartActionClick(page, [
          'button:has-text("Join"):not(:has-text("Joined"))',
          'shreddit-join-button button:has-text("Join")',
          'button[aria-label*="Join"]'
        ], 'join')
        results.push({ subreddit: name, status: joined ? 'joined' : 'skipped' })
      } catch (err) {
        results.push({ subreddit: sub, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: subreddits.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Upvote a list of post URLs.
ipcm('reddit-upvote', async (e, { sessionId, postUrls = [], delayMs = 3000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `rd-up-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of postUrls) {
      if (globals.cancelFlags.get(jobId)) break
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2800))
        const voted = await smartActionClick(page, [
          'button[aria-label="upvote"]', 'button[aria-pressed="false"][aria-label="upvote"]',
          'shreddit-post button[aria-label="upvote"]', 'button[data-click-id="upvote"]'
        ], 'upvote')
        results.push({ url, status: voted ? 'upvoted' : 'skipped' })
      } catch (err) {
        results.push({ url, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: postUrls.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Save + optional upvote on Reddit posts. Save is the bookmark icon below
// each post. Pass doUpvote=true to also vote.
ipcm('reddit-save-posts', async (e, { sessionId, postUrls = [], doUpvote = false, delayMs = 3000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `rd-save-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    for (const url of postUrls) {
      if (globals.cancelFlags.get(jobId)) break
      const out = { url, saved: false, upvoted: false, error: null }
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(randomDelay(1500, 2800))
        // Open the overflow menu and click "Save".
        await smartClick(page, ['button[aria-label="more options"]', 'shreddit-post button[aria-label*="more"]', 'button[aria-label="More options"]'], 'more')
        await page.waitForTimeout(randomDelay(500, 1000))
        const saved = await smartActionClick(page, [
          'div[role="menuitem"]:has-text("Save")', 'li[role="menuitem"]:has-text("Save")',
          'button:has-text("Save")', 'a:has-text("save")'
        ], 'save')
        out.saved = !!saved
        if (doUpvote) {
          await page.waitForTimeout(randomDelay(500, 1000))
          const upvoted = await smartActionClick(page, [
            'button[aria-label="upvote"]', 'button[aria-pressed="false"][aria-label="upvote"]',
            'shreddit-post button[aria-label="upvote"]', 'button[data-click-id="upvote"]'
          ], 'upvote')
          out.upvoted = !!upvoted
        }
        out.status = out.saved || out.upvoted ? 'done' : 'skipped'
      } catch (err) {
        out.error = err.message
        out.status = 'failed'
      }
      results.push(out)
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: postUrls.length, last: out })
      await page.waitForTimeout(delayMs + Math.random() * 1500)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract top growing communities for today by scraping the popular page.
ipcm('reddit-top-growing-communities', async (e, { sessionId, limit = 50, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `rd-top-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const seen = new Set()
  const communities = []
  try {
    await page.goto('https://www.reddit.com/best/communities/1/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    let stagnant = 0
    while (communities.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = communities.length
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 2500))
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('a[href^="/r/"]:not([href*="/comments"])').forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!/^\/r\/[^/]+\/?$/.test(href)) return
          const name = href.replace(/\//g, '').replace(/^r/, 'r/').replace(/^r\//, 'r/')
          if (!name) return
          const desc = a.parentElement?.querySelector('div[class*="description"], p')?.innerText?.trim() || ''
          const members = a.parentElement?.querySelector('[class*="member"], faceplate-number')?.innerText?.trim() || ''
          r.push({
            name: '/r/' + href.replace(/\//g, '').replace(/^r/, ''),
            url: 'https://www.reddit.com' + href,
            description: desc,
            members,
          })
        })
        return r
      })
      for (const c of batch) {
        if (seen.has(c.url)) continue
        seen.add(c.url)
        communities.push(c)
        if (communities.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: communities.length, total: limit, data: batch })
      if (communities.length === before) stagnant++
      else stagnant = 0
    }
    saveLeads('reddit', 'top-growing', communities.map(c => ({ name: c.name, url: c.url, text: c.description, extra: c.members })))
    return { success: true, data: communities, count: communities.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: communities, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Publish to a subreddit with optional image attached.
ipcm('reddit-publish-with-image', async (e, { sessionId, subreddit, title, content, imagePath }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!subreddit) return { success: false, error: 'Subreddit مطلوب' }
  if (!title) return { success: false, error: 'العنوان مطلوب' }
  if (imagePath && !fs.existsSync(imagePath)) return { success: false, error: 'الصورة غير موجودة' }
  try {
    const sub = String(subreddit).replace(/^\/?r\//, '')
    const submitUrl = imagePath
      ? `https://www.reddit.com/r/${sub}/submit?type=IMAGE`
      : `https://www.reddit.com/r/${sub}/submit?type=TEXT`
    await page.goto(submitUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    // Title.
    const titleTyped = await smartType(page, [
      'textarea[name="title"]', 'textarea[placeholder*="Title"]',
      'faceplate-textarea-input[name="title"] textarea', 'input[name="title"]'
    ], title, 'title')
    if (!titleTyped) return { success: false, error: 'لم يتم العثور على حقل العنوان' }
    await page.waitForTimeout(randomDelay(500, 1200))
    if (imagePath) {
      const fileInput = await page.$('input[type="file"]')
      if (!fileInput) return { success: false, error: 'لم يتم العثور على مدخل الصورة' }
      await fileInput.setInputFiles([imagePath])
      await page.waitForTimeout(randomDelay(3500, 5500))
    } else if (content) {
      await smartType(page, ['div[role="textbox"][contenteditable="true"]', 'textarea[name="text"]', 'div.notranslate.public-DraftEditor-content'], content, 'body')
      await page.waitForTimeout(randomDelay(500, 1200))
    }
    const posted = await smartClick(page, [
      'button[type="submit"]:not(:disabled)', 'button:has-text("Post"):not(:has-text("Posts"))',
      'button[id*="submit"]:not(:disabled)'
    ], 'submit')
    if (!posted) return { success: false, error: 'فشل النقر على Post' }
    await page.waitForTimeout(randomDelay(3000, 5000))
    return { success: true, message: 'تم النشر', url: page.url() }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: GOOGLE / MAPS / OLX ====================
//
// Helper: extract businesses from the currently-loaded Google Maps results
// panel. Scrolls the LEFT panel (the actual results list), not the window —
// this is the key fix from v1.22's broken version that only window-scrolled.
async function _gMapsExtractCurrentPanel(page, limit, onProgress) {
  const businesses = []
  const seenNames = new Set()
  let stagnantCycles = 0
  const MAX_STAGNANT = 6   // give up after 6 cycles of zero new results

  // Wait for the results panel feed to appear
  await page.waitForSelector('div[role="feed"], div[role="article"], a[href*="/maps/place/"]', { timeout: 15000 }).catch(() => {})

  while (businesses.length < limit && stagnantCycles < MAX_STAGNANT) {
    const beforeCount = businesses.length

    // Scrape via DOM evaluation — much faster than per-card $eval
    const cards = await page.evaluate(() => {
      const results = []
      // Multiple selector strategies — Google rotates these frequently.
      const anchors = document.querySelectorAll('a[href*="/maps/place/"]')
      const seenHref = new Set()
      for (const a of anchors) {
        const href = a.getAttribute('href')
        if (!href || seenHref.has(href)) continue
        seenHref.add(href)
        // Walk up to find the card container with all the info
        let card = a.closest('div[role="article"]') || a.closest('[jslog]') || a.parentElement?.parentElement
        if (!card) continue
        const text = (card.innerText || '').trim()
        if (!text) continue
        const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
        if (lines.length === 0) continue
        const name = lines[0]
        // Try to extract: rating (number + parentheses for reviewCount)
        const ratingMatch = text.match(/(\d+[.,]\d)\s*(?:\((\d+)\))?/)
        const rating = ratingMatch ? ratingMatch[1].replace(',', '.') : ''
        const reviewCount = ratingMatch ? (ratingMatch[2] || '') : ''
        // Phone is usually formatted like +20 1xxx... or 0xxx
        const phoneMatch = text.match(/(\+?\d[\d\s()+-]{8,})/g)
        const phone = phoneMatch && phoneMatch.length ? phoneMatch[phoneMatch.length - 1].trim() : ''
        // Type/category — usually the second non-rating line
        const type = lines.find(l => /^[؀-ۿa-zA-Z][^\d]+$/.test(l) && l !== name) || ''
        // Address — line containing a digit but not phone-shaped
        const address = lines.find(l => l !== name && l !== type && l.length > 5 && /\d/.test(l) && !l.match(/^\d+[.,]\d/)) || ''
        const placeUrl = a.href
        results.push({ name, rating, reviewCount, type, address, phone, profile: placeUrl })
      }
      return results
    })

    for (const c of cards) {
      if (!c.name || seenNames.has(c.name)) continue
      seenNames.add(c.name)
      businesses.push(c)
      if (businesses.length >= limit) break
    }

    if (onProgress) onProgress(businesses.length, limit)

    if (businesses.length === beforeCount) {
      stagnantCycles++
    } else {
      stagnantCycles = 0
    }

    if (businesses.length >= limit) break

    // SCROLL THE RESULTS PANEL (left side), not the window. Google Maps
    // uses a virtualized feed inside [role="feed"] — scrolling that element
    // triggers lazy-load of more cards.
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]') || document.querySelector('[aria-label*="Results"]')
      if (feed) feed.scrollTop = feed.scrollHeight
      else window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(1500 + Math.random() * 1500)
  }

  return businesses
}

ipcm('google-maps-extract', async (e, { searchQuery, location, limit = 50, headless = false, sessionId: existingSessionId, jobId }) => {
  let sessionId = existingSessionId || null
  let ownSession = !existingSessionId
  if (!jobId) jobId = `gmaps-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  try {
    if (!sessionId) {
      const res = await globals.bm.launch({ headless: false, platform: 'google-maps' })
      if (!res.success) return res
      sessionId = res.sessionId
    }
    const page = globals.bm.getPage(sessionId)
    if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
    const queryText = location ? `${searchQuery} in ${location}` : searchQuery
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(queryText)}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(randomDelay(3500, 6000))

    const businesses = await _gMapsExtractCurrentPanel(page, limit, (count, max) => {
      sendProgress(sender, jobId, { type: 'progress', count, total: max })
    })

    saveLeads('google-maps', 'maps-extract', businesses.map(b => ({
      name: b.name, phone: b.phone, url: b.profile, source: queryText,
      extra: `${b.type} | ${b.address} | rating: ${b.rating} (${b.reviewCount})`,
    })))
    if (ownSession) await globals.bm.close(sessionId)
    return { success: true, data: businesses.slice(0, limit), count: businesses.length, jobId }
  } catch (err) {
    if (ownSession && sessionId) await safeClose(sessionId)
    return { success: false, error: err.message, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// NEW v1.23 — Bulk extraction from Google Maps using multiple keywords.
// User-facing: enter a list of keywords (one per line), optionally a
// location filter, and limit-per-keyword (up to 500). The handler iterates
// each keyword sequentially, extracts up to N businesses per keyword,
// reports progress, and deduplicates across keywords.
ipcm('google-maps-bulk-extract', async (e, { keywords = [], location = '', limitPerKeyword = 500, jobId }) => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return { success: false, error: 'يرجى إدخال قائمة كلمات مفتاحية' }
  }
  // Sanitize keywords + clamp limit
  const cleanKeywords = keywords
    .map((k) => String(k || '').trim())
    .filter((k) => k.length > 0)
    .slice(0, 50)  // hard cap at 50 keywords per job to avoid abuse
  if (cleanKeywords.length === 0) {
    return { success: false, error: 'قائمة الكلمات المفتاحية فارغة بعد التنظيف' }
  }
  const cleanLimit = Math.min(Math.max(parseInt(limitPerKeyword) || 50, 1), 500)
  if (!jobId) jobId = `gmaps-bulk-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)

  const allResults = []
  const seenNames = new Set()
  let sessionId = null
  let pageRef = null

  try {
    const launchRes = await globals.bm.launch({ headless: false, platform: 'google-maps' })
    if (!launchRes.success) return launchRes
    sessionId = launchRes.sessionId
    pageRef = globals.bm.getPage(sessionId)
    if (!pageRef) return { success: false, error: 'تعذّر فتح المتصفح', sessionId }

    for (let i = 0; i < cleanKeywords.length; i++) {
      if (globals.cancelFlags.get(jobId)) break
      const keyword = cleanKeywords[i]
      const queryText = location ? `${keyword} in ${location}` : keyword

      sendProgress(sender, jobId, {
        type: 'keyword-start',
        keywordIndex: i + 1,
        totalKeywords: cleanKeywords.length,
        keyword,
        currentTotal: allResults.length,
      })

      try {
        await pageRef.goto(`https://www.google.com/maps/search/${encodeURIComponent(queryText)}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })
        await pageRef.waitForTimeout(randomDelay(3500, 5500))

        const businesses = await _gMapsExtractCurrentPanel(pageRef, cleanLimit, (cnt, tot) => {
          sendProgress(sender, jobId, {
            type: 'keyword-progress',
            keywordIndex: i + 1,
            totalKeywords: cleanKeywords.length,
            keyword,
            count: cnt,
            target: tot,
            grandTotal: allResults.length + cnt,
          })
        })

        // Deduplicate by name (within session) before adding
        let added = 0
        for (const b of businesses) {
          if (!b.name || seenNames.has(b.name.toLowerCase())) continue
          seenNames.add(b.name.toLowerCase())
          allResults.push({
            ...b,
            keyword,
            source: queryText,
          })
          added++
        }

        sendProgress(sender, jobId, {
          type: 'keyword-done',
          keywordIndex: i + 1,
          totalKeywords: cleanKeywords.length,
          keyword,
          extracted: businesses.length,
          added,
          grandTotal: allResults.length,
        })

        // Brief inter-keyword pause (anti-rate-limit)
        await pageRef.waitForTimeout(randomDelay(2000, 4000))
      } catch (kwErr) {
        sendProgress(sender, jobId, {
          type: 'keyword-error',
          keywordIndex: i + 1,
          keyword,
          error: kwErr.message,
        })
        // Continue with next keyword instead of aborting the entire job
      }
    }

    // Save everything (with sanitizer)
    saveLeads('google-maps', 'maps-bulk-extract', allResults.map((b) => ({
      name: b.name,
      phone: b.phone,
      url: b.profile,
      source: b.source,
      extra: `${b.type || ''} | ${b.address || ''} | rating: ${b.rating || ''} (${b.reviewCount || ''}) | keyword: ${b.keyword}`,
    })))

    return {
      success: true,
      data: allResults,
      count: allResults.length,
      keywordsProcessed: cleanKeywords.length,
      jobId,
      cancelled: globals.cancelFlags.get(jobId),
    }
  } catch (err) {
    return { success: false, error: err.message, partialData: allResults, jobId, sessionId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

ipcm('olx-extract', async (e, { country, category, limit = 50, sessionId: existingSessionId }) => {
  const domains = { egypt: 'olx.com.eg', saudi: 'olx.sa.com', uae: 'olx.ae', qatar: 'olx.qa', kuwait: 'olx.com.kw' }
  const domain = domains[country] || 'olx.com.eg'
  let sessionId = existingSessionId || null
  let ownSession = !existingSessionId
  try {
    if (!sessionId) {
      const res = await globals.bm.launch({ headless: true, platform: 'olx' })
      if (!res.success) return res
      sessionId = res.sessionId
    }
    const page = globals.bm.getPage(sessionId)
    if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
    await page.goto(`https://${domain}/${category}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(4000, 6000))
    const listings = await page.evaluate((lim) => {
      const r = []
      document.querySelectorAll('[data-cy="l-card"], .css-1sw7q4x, article').forEach((card, i) => {
        if (i >= lim) return
        const titleEl = card.querySelector('h6, h4, .css-16v5mdi')
        const priceEl = card.querySelector('[data-testid="ad-price"], .css-10b0gli')
        const locEl = card.querySelector('[data-testid="location-date"], .css-veheph')
        const linkEl = card.querySelector('a')
        if (titleEl) {
          r.push({ title: titleEl.innerText.trim(), price: priceEl?.innerText.trim() || '', location: locEl?.innerText.trim() || '', link: linkEl?.href || '' })
        }
      })
      return r
    }, limit)
    saveLeads('olx', `${country}-${category}`, listings)
    if (ownSession) await globals.bm.close(sessionId)
    return { success: true, data: listings, count: listings.length }
  } catch (err) {
    if (ownSession && sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

ipcm('google-rate', async (e, { sessionId, placeUrl, rating, review }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  try {
    await page.goto(placeUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartClick(page, ['button:has-text("Write a review")', 'button:has-text("اكتب تقييم")'], 'review button')
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartClick(page, [`[aria-label="${rating} stars"]`], `${rating}-star rating`)
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartType(page, ['textarea'], review, 'review text')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartClick(page, ['button:has-text("Post")', 'button:has-text("نشر")'], 'post button')
    await page.waitForTimeout(randomDelay(3000, 5000))
    return { success: true, message: 'تم التقييم' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: EMAIL ====================
ipcm('send-email', async (e, { provider, username, password, to, subject, body, headless = false }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless: false, platform: 'gmail' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    if (provider === 'gmail') {
      await page.goto('https://mail.google.com', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      if (await page.$('input[type="email"]')) {
        await smartType(page, ['input[type="email"]'], username, 'email')
        await page.waitForTimeout(randomDelay(1000, 2000))
        await smartClick(page, ['#identifierNext'], 'next button')
        await page.waitForTimeout(randomDelay(3000, 5000))
        if (await page.$('input[type="password"]')) {
          await smartType(page, ['input[type="password"]'], password, 'password')
          await page.waitForTimeout(randomDelay(1000, 2000))
          await smartClick(page, ['#passwordNext'], 'next button')
          await page.waitForTimeout(randomDelay(5000, 7000))
        }
      }
      await smartClick(page, ['div[gh="cm"]'], 'compose button')
      await page.waitForTimeout(randomDelay(2000, 4000))
      await smartType(page, ['textarea[name="to"]'], to, 'recipient')
      await page.waitForTimeout(randomDelay(500, 1500))
      await smartType(page, ['input[name="subjectbox"]'], subject, 'subject')
      await page.waitForTimeout(randomDelay(500, 1500))
      await smartType(page, ['div[aria-label="Message Body"]', 'div[aria-label="نص الرسالة"]'], body, 'message body')
      await page.waitForTimeout(randomDelay(1000, 2000))
      await smartClick(page, ['div[aria-label="Send"]', 'div[aria-label="إرسال"]'], 'send button')
      await page.waitForTimeout(randomDelay(3000, 5000))
      await globals.bm.close(sessionId)
      return { success: true, message: 'تم إرسال الإيميل' }
    }
    await globals.bm.close(sessionId)
    return { success: false, error: 'مزود غير مدعوم' }
  } catch (err) {
    if (sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

// ==================== IPC: AUTO POINT ====================
// NOTE: Stub implementation — navigates to site only, full automation pending
ipcm('auto-point-run', async (e, { platform, site, interactionType, count, delay, headless = false }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'auto-point' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    let url = site
    if (site === 'like4like') url = 'https://www.like4like.org'
    else if (site === 'kingdomlikes') url = 'https://kingdomlikes.com'
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await globals.bm.close(sessionId)
    return { success: true, message: `تم بدء التفاعل على ${platform} من ${site}` }
  } catch (err) {
    if (sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

// ==================== IPC: VIDEO DOWNLOAD ====================
ipcm('video-download', async (e, { url, saveDir }) => {
  let sessionId = null
  try {
    const axios = require('axios')
    const res = await globals.bm.launch({ headless: true, platform: 'video-download' })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://y2mate.is', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(2000, 4000))
    await smartType(page, ['input[name="query"]', '#query', 'input[type="text"]'], url, 'video URL')
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartClick(page, ['button[type="submit"]', 'button:has-text("Start")', 'button:has-text("ابدأ")'], 'submit button')
    await page.waitForTimeout(randomDelay(8000, 12000))
    const downloadLink = await page.$eval('a[download]', el => el.href).catch(() => null)
    if (downloadLink) {
      const response = await axios.get(downloadLink, { responseType: 'stream', timeout: 120000 })
      const ext = path.extname(new URL(downloadLink).pathname) || '.mp4'
      const filePath = path.join(saveDir || app.getPath('downloads'), `video-${Date.now()}${ext}`)
      const writer = fs.createWriteStream(filePath)
      response.data.pipe(writer)
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject) })
      await globals.bm.close(sessionId)
      return { success: true, path: filePath }
    }
    await globals.bm.close(sessionId)
    return { success: false, error: 'لم يتم العثور على رابط التحميل' }
  } catch (err) {
    if (sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

// ==================== IPC: HASHTAGS ====================
ipcm('generate-hashtags', async (e, { keyword, platform }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless: true })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    let hashtags = []
    if (platform === 'instagram') {
      await page.goto(`https://www.instagram.com/explore/tags/${keyword}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      hashtags = [`#${keyword}`, `#${keyword}2024`, `#${keyword}love`, `#${keyword}life`, `#insta${keyword}`]
    } else if (platform === 'twitter') {
      await page.goto(`https://x.com/search?q=%23${keyword}&src=typed_query`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(randomDelay(2000, 4000))
      hashtags = [`#${keyword}`, `#${keyword}Trend`, `#${keyword}News`, `#${keyword}Update`]
    } else {
      hashtags = [`#${keyword}`, `#${keyword}Video`, `#${keyword}Viral`, `#${keyword}Trending`]
    }
    await globals.bm.close(sessionId)
    return { success: true, data: hashtags }
  } catch (err) {
    if (sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

// ==================== IPC: PROXY ====================
ipcm('save-proxy', async (e, { label, host, port, protocol, username, password }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const stmt = globals.db.prepare('INSERT INTO proxies (label, host, port, protocol, username, password) VALUES (?, ?, ?, ?, ?, ?)')
    const result = stmt.run(label, host, port, protocol, username, encryptSecret(password))
    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('get-proxies', async () => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const rows = globals.db.prepare('SELECT * FROM proxies ORDER BY id DESC').all()
    return { success: true, data: unprotectRows('proxies', rows) }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('delete-proxy', async (e, { id }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  if (!Number.isInteger(id) || id < 1) return { success: false, error: 'Invalid id' }
  try {
    globals.db.prepare('DELETE FROM proxies WHERE id = ?').run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('test-proxy', async (e, { proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless: true, proxy })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://httpbin.org/ip', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(randomDelay(1000, 2000))
    const ip = await page.$eval('body', el => el.innerText).catch(() => null)
    await globals.bm.close(sessionId)
    return { success: true, ip: ip || 'Unknown' }
  } catch (err) {
    if (sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
  }
})

// ==================== IPC: SNAPCHAT ====================
ipcm('snapchat-login', async (e, { username, password, headless = false, proxy }) => {
  let sessionId = null
  try {
    const res = await globals.bm.launch({ headless, platform: 'snapchat', proxy: proxy || undefined })
    if (!res.success) return res
    sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.goto('https://accounts.snapchat.com/accounts/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[name="username"]', 'input[id*="username"]', 'input[type="text"]',
      'input[aria-label*="Username"]', 'input[placeholder*="Username"]', 'input[autocomplete="username"]'
    ], username, 'username')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم', sessionId }
    await page.waitForTimeout(randomDelay(800, 1500))
    const passTyped = await smartType(page, [
      'input[name="password"]', 'input[type="password"]', 'input[aria-label*="Password"]',
      'input[placeholder*="Password"]', 'input[id*="password"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(800, 1500))
    await smartClick(page, [
      'button[type="submit"]', 'button:has-text("Log In")', 'button:has-text("تسجيل الدخول")',
      'a[href*="login"]', 'button[data-testid="login-button"]'
    ], 'login')
    await page.waitForTimeout(randomDelay(6000, 10000))
      saveAccount('snapchat', username, password)
    return { success: true, message: 'تم تسجيل الدخول', sessionId }
  } catch (err) {
    return { success: false, error: err.message, sessionId }
  }
})

// Real Snapchat broadcast — opens each friend's chat and sends a text + optional image.
ipcm('snapchat-broadcast', async (e, { sessionId, usernames = [], message, imagePath, delayMs = 5000, jobId }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!message && !imagePath) return { success: false, error: 'النص أو الصورة مطلوبة' }
  if (imagePath && !fs.existsSync(imagePath)) return { success: false, error: 'الصورة غير موجودة' }
  if (!jobId) jobId = `snap-bc-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const results = []
  try {
    await page.goto('https://web.snapchat.com/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    for (const u of usernames) {
      if (globals.cancelFlags.get(jobId)) break
      const handle = String(u).replace(/^@/, '').trim()
      try {
        // Open friend search.
        await smartClick(page, ['button[aria-label="New Chat"]', 'div[role="button"][aria-label*="New"]', 'svg[aria-label="New Chat"]'], 'new chat')
        await page.waitForTimeout(randomDelay(800, 1500))
        await smartType(page, ['input[placeholder*="Search"]', 'input[type="search"]', 'input[type="text"]'], handle, 'search friend')
        await page.waitForTimeout(randomDelay(1200, 2000))
        const picked = await smartClick(page, [`div[role="option"]:has-text("${handle}")`, 'div[role="option"]:first-of-type', 'div[role="listitem"]:first-of-type'], 'pick friend')
        if (!picked) { results.push({ username: handle, status: 'failed', error: 'لم يتم العثور على الصديق' }); continue }
        await page.waitForTimeout(randomDelay(1500, 2500))
        await smartClick(page, ['button:has-text("Chat")', 'button:has-text("Send Chat")', 'div[role="button"]:has-text("Chat")'], 'open chat')
        await page.waitForTimeout(randomDelay(1500, 2500))
        if (imagePath) {
          const fileInput = await page.$('input[type="file"]')
          if (fileInput) {
            await fileInput.setInputFiles([imagePath])
            await page.waitForTimeout(randomDelay(2000, 3500))
          }
        }
        if (message) {
          await smartType(page, ['div[contenteditable="true"]', 'textarea[placeholder*="message"]', 'textarea'], message, 'msg')
          await page.waitForTimeout(randomDelay(500, 1200))
        }
        const sent = await smartClick(page, ['button[aria-label="Send"]', 'svg[aria-label="Send"]', 'button:has-text("Send")'], 'send')
        if (!sent) await page.keyboard.press('Enter')
        await page.waitForTimeout(randomDelay(1500, 2500))
        results.push({ username: handle, status: 'sent' })
      } catch (err) {
        results.push({ username: handle, status: 'failed', error: err.message })
      }
      sendProgress(sender, jobId, { type: 'progress', count: results.length, total: usernames.length, last: results[results.length - 1] })
      await page.waitForTimeout(delayMs + Math.random() * 2000)
    }
    return { success: true, data: results, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: results, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})

// Extract Snapchat friends from the friends sidebar.
ipcm('snapchat-extract-friends', async (e, { sessionId, limit = 200, jobId, delayMs = 1500 }) => {
  const page = globals.bm.getPage(sessionId)
  if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
  if (!jobId) jobId = `snap-friends-${++jobIdCounter}`
  globals.cancelFlags.set(jobId, false)
  const sender = getSender(e)
  const friends = []
  try {
    await page.goto('https://web.snapchat.com/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(2500, 4000))
    // Open friends list (the side panel).
    await smartClick(page, ['button[aria-label="Friends"]', 'div[role="button"]:has-text("Friends")', 'svg[aria-label="Friends"]'], 'friends')
    await page.waitForTimeout(randomDelay(1500, 2500))
    const seen = new Set()
    let stagnant = 0
    while (friends.length < limit && stagnant < 5) {
      if (globals.cancelFlags.get(jobId)) break
      const before = friends.length
      const batch = await page.evaluate(() => {
        const r = []
        document.querySelectorAll('div[role="option"], div[role="listitem"], a[href^="/add/"], div[data-testid*="friend"]').forEach(row => {
          const nameEl = row.querySelector('span, div[class*="name"], h3')
          if (!nameEl) return
          const name = nameEl.innerText.trim().split('\n')[0]
          if (!name || name.length > 60) return
          const subEl = row.querySelectorAll('span')[1]
          r.push({ name, username: subEl ? subEl.innerText.trim() : '' })
        })
        return r
      })
      for (const f of batch) {
        const key = f.name + '|' + f.username
        if (seen.has(key)) continue
        seen.add(key)
        friends.push(f)
        if (friends.length >= limit) break
      }
      sendProgress(sender, jobId, { type: 'progress', count: friends.length, total: limit, data: batch })
      if (friends.length === before) stagnant++
      else stagnant = 0
      // Scroll the friends pane.
      await page.evaluate(() => {
        const pane = document.querySelector('div[role="listbox"], div[role="list"]') || document.querySelector('[class*="friends"]')
        if (pane) pane.scrollTop = pane.scrollHeight
      })
      await page.waitForTimeout(delayMs + Math.random() * 800)
    }
    saveLeads('snapchat', 'friends', friends)
    return { success: true, data: friends, count: friends.length, jobId, cancelled: globals.cancelFlags.get(jobId) }
  } catch (err) {
    return { success: false, error: err.message, partialData: friends, jobId }
  } finally {
    globals.cancelFlags.delete(jobId)
  }
})


}
