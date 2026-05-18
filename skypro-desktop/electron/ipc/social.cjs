
const fs = require('fs')
const path = require('path')
const globals = require('../globals.cjs')
const { app, BrowserWindow, dialog } = require('electron')

module.exports = function(ipcm, helpers) {
  const { safeGoto, humanMouseMove, smartType, smartClick, smartActionClick, randomDelay, saveAccount, encryptSecret, decryptSecret, unprotectRow, getSender, sendProgress, saveLeads } = helpers;
  let jobIdCounter = 0

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
  const allFriends = []
  try {
    await page.goto('https://www.facebook.com/me/friends', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(randomDelay(3000, 5000))
    const maxScrolls = Math.max(Math.ceil(limit / 10), 10)
    for (let i = 0; i < maxScrolls; i++) {
      if (globals.cancelFlags.get(jobId)) break
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(delayMs + Math.random() * 1000)
      const batch = await page.evaluate((existingNames) => {
        const r = []
        const seen = new Set(existingNames)
        const mainContent = document.querySelector('[role="main"]') || document.body
        mainContent.querySelectorAll('a[href*="/"]').forEach((a) => {
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
      }, allFriends.map(f => f.name))
      for (const u of batch) {
        if (allFriends.length >= limit) break
        allFriends.push(u)
      }
      sendProgress(sender, jobId, { type: 'progress', count: allFriends.length, total: limit, data: batch })
      if (allFriends.length >= limit) break
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
    try {
      await page.waitForSelector('[data-testid="chat-list"]', { timeout: 30000 })
      return { success: true, message: 'WhatsApp متصل', sessionId }
    } catch {
      return { success: true, message: 'افتح كاميرا الهاتف وامسح QR code', sessionId, needsQR: true }
    }
  } catch (err) {
    return { success: false, error: err.message }
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
    await page.waitForSelector('[data-testid="chat-list"]', { timeout: 30000 })
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
    await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(2000, 4000))
    const userTyped = await smartType(page, [
      'input[autocomplete="username"]', 'input[name="text"]', 'input[aria-label*="Username"]',
      'input[aria-label*="Phone"]', 'input[type="text"]', 'input[autocomplete="username"]'
    ], username, 'username')
    if (!userTyped) return { success: false, error: 'لم يتم العثور على حقل اسم المستخدم', sessionId }
    await page.waitForTimeout(randomDelay(1000, 2000))
    await smartClick(page, [
      'button:has-text("Next")', 'button:has-text("التالي")', 'button[type="submit"]'
    ], 'next')
    await page.waitForTimeout(randomDelay(2000, 4000))
    const passTyped = await smartType(page, [
      'input[type="password"]', 'input[name="password"]', 'input[aria-label*="Password"]',
      'input[aria-label*="كلمة"]'
    ], password, 'password')
    if (!passTyped) return { success: false, error: 'لم يتم العثور على حقل كلمة المرور', sessionId }
    await page.waitForTimeout(randomDelay(500, 1500))
    await smartClick(page, [
      'button:has-text("Log in")', 'button:has-text("تسجيل الدخول")', 'button[type="submit"]',
      'button[data-testid="LoginForm_Login_Button"]'
    ], 'login')
    await page.waitForTimeout(randomDelay(5000, 8000))
    const currentUrl = page.url()
    if (!currentUrl.includes('login') && !currentUrl.includes('challenge')) {
      saveAccount('twitter', username, password)
      return { success: true, message: 'تم تسجيل الدخول', sessionId }
    }
    return { success: false, error: 'فشل تسجيل الدخول', sessionId }
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

// ==================== IPC: GOOGLE / MAPS / OLX ====================
ipcm('google-maps-extract', async (e, { searchQuery, location, limit = 50, headless = false, sessionId: existingSessionId }) => {
  let sessionId = existingSessionId || null
  let ownSession = !existingSessionId
  try {
    if (!sessionId) {
      const res = await globals.bm.launch({ headless: true, platform: 'google-maps' })
      if (!res.success) return res
      sessionId = res.sessionId
    }
    const page = globals.bm.getPage(sessionId)
    if (!page) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
    const query = encodeURIComponent(`${searchQuery} in ${location}`)
    await page.goto(`https://www.google.com/maps/search/${query}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(randomDelay(4000, 6000))
    const businesses = []
    for (let i = 0; i < Math.min(limit / 5, 10); i++) {
      const cards = await page.$$('[data-result-index]')
      for (const card of cards) {
        try {
          const name = await card.$eval('div.fontHeadlineSmall', el => el.innerText).catch(() => '')
          const rating = await card.$eval('span[role="img"]', el => el.getAttribute('aria-label')).catch(() => '')
          const address = await card.$eval('.fontBodyMedium', el => el.innerText).catch(() => '')
          const type = await card.$eval('.fontBodyMedium:first-child', el => el.innerText).catch(() => '')
          if (name) businesses.push({ name, rating, address, type })
        } catch (e) { console.error('Extract business card:', e.message) }
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(randomDelay(1500, 3000))
    }
    saveLeads('google-maps', 'maps-extract', businesses)
    if (ownSession) await globals.bm.close(sessionId)
    return { success: true, data: businesses.slice(0, limit), count: businesses.length }
  } catch (err) {
    if (ownSession && sessionId) await safeClose(sessionId)
    return { success: false, error: err.message }
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

ipcm('snapchat-broadcast', async (e, { sessionId, usernames, message }) => {
  try {
    const page = sessionId ? globals.bm.getPage(sessionId) : null
    if (page) {
      await page.goto('https://web.snapchat.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(randomDelay(2000, 4000))
      return { success: true, message: 'Snapchat Web مفتوح - أكمل المراسلة يدوياً', sessionId }
    }
    let newSessionId = null
    try {
      const res = await globals.bm.launch({ headless: false, platform: 'snapchat' })
      if (!res.success) return res
      newSessionId = res.sessionId
      const newPage = globals.bm.getPage(newSessionId)
      await newPage.goto('https://web.snapchat.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await newPage.waitForTimeout(randomDelay(4000, 6000))
      return { success: true, message: 'Snapchat Web مفتوح - أكمل المراسلة يدوياً', sessionId: newSessionId }
    } catch (err) {
      if (newSessionId) await safeClose(newSessionId)
      return { success: false, error: err.message }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})


}
