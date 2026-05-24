const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const { randomUA, randomDelay, getSecuritySettings, USER_AGENTS } = require('./anti-ban.cjs')

class BrowserManager {
  constructor() {
    this.browsers = new Map()
  }

  getProfileDir(platform, profileId) {
    const base = profileId || platform || 'default'
    return path.join(app.getPath('userData'), 'browser-profiles', base)
  }

  /**
   * Verify a session is still alive (browser window not closed by user,
   * page not crashed). Without this check, launch() would happily return
   * a stale session ID that points to a dead context — login then fails
   * mysteriously and the user has to restart the whole app.
   */
  async isSessionAlive(session) {
    if (!session || !session.context || !session.page) return false
    try {
      // context.pages() throws if the context was closed.
      const pages = session.context.pages()
      if (!pages || pages.length === 0) return false
      // page.url() throws if the page was closed.
      session.page.url()
      return true
    } catch {
      return false
    }
  }

  async launch(options = {}) {
    const { headless = false, proxy, sessionId = `session-${Date.now()}`, antiBan = true, platform, profileId } = options
    try {
      // If profileId is provided, allow multiple sessions per platform (one per account)
      // Without profileId, reuse existing browser for this platform (legacy behavior)
      if (platform && !profileId) {
        // Walk the map and skip-or-purge dead sessions before reusing.
        // Previously this returned the first match unconditionally — if the
        // user had closed the browser window manually, the session was dead
        // and every subsequent IPC call failed until app restart.
        const deadIds = []
        for (const [id, session] of this.browsers) {
          if (session.platform !== platform) continue
          const alive = await this.isSessionAlive(session)
          if (alive) {
            console.log(`Reusing existing browser for ${platform}, sessionId=${id}`)
            return { success: true, sessionId: id, message: 'المتصفح مفتوح بالفعل' }
          }
          // Dead session — schedule for purge and fall through to launch a fresh one.
          deadIds.push(id)
        }
        for (const id of deadIds) {
          console.log(`[BrowserManager] purging dead session ${id} for ${platform}`)
          try { await this.browsers.get(id)?.context?.close().catch(() => {}) } catch { /* already dead */ }
          this.browsers.delete(id)
        }
      }
      const dir = this.getProfileDir(platform, profileId)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const args = [
        '--disable-blink-features=AutomationControlled',
        // NOTE: IsolateOrigins and site-per-process are NOT disabled — browser security preserved
        '--window-size=1366,768',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI',
        // NOTE: ipc-flooding-protection is NOT disabled — browser stability preserved
        '--disable-renderer-backgrounding',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--lang=ar-SA',
      ]

      const sec = antiBan ? getSecuritySettings() : null
      const ua = (antiBan && sec && sec.rotateUserAgent) ? randomUA() : (!antiBan ? USER_AGENTS[0] : randomUA())
      const vpWidth = sec && sec.randomizeViewport ? [1280, 1366, 1440, 1536, 1600][Math.floor(Math.random() * 5)] : 1366
      const vpHeight = sec && sec.randomizeViewport ? [720, 768, 800, 900][Math.floor(Math.random() * 4)] : 768

      const context = await chromium.launchPersistentContext(dir, {
        headless,
        args,
        proxy: proxy ? { server: proxy } : undefined,
        userAgent: ua,
        viewport: { width: vpWidth, height: vpHeight },
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh',
        // Geolocation is NOT auto-granted for privacy — only set if explicitly needed
        permissions: [],
        colorScheme: 'light',
        extraHTTPHeaders: {
          'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
        },
      })

      // Stealth: remove webdriver property + other anti-detection
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
        window.chrome = { runtime: {} }
        Object.defineProperty(navigator, 'languages', { get: () => ['ar-SA', 'ar', 'en-US', 'en'] })
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 })
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
        Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' })
        const cdcProps = Object.keys(window).filter(k => k.startsWith('cdc_'))
        for (const prop of cdcProps) {
          try { delete window[prop] } catch {}
        }
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        )
      })

      const page = context.pages()[0] || await context.newPage()
      if (antiBan) {
        page.setDefaultTimeout(30000)
        page.setDefaultNavigationTimeout(60000)
      }
      this.browsers.set(sessionId, { context, page, antiBan, platform, profileId })

      // Auto-purge the session map when the user manually closes the
      // browser window (X button). Without this, the dead entry stays in
      // the map until app restart and getPage()/launch() return stale refs.
      context.on('close', () => {
        console.log(`[BrowserManager] context closed for session=${sessionId}, removing from map`)
        this.browsers.delete(sessionId)
      })
      page.on('close', () => {
        // If the user closed only the tab but the context survives, keep
        // the session but null out the page so callers detect it's gone.
        const s = this.browsers.get(sessionId)
        if (s && s.page === page) {
          s.page = null
        }
      })

      return { success: true, sessionId, message: 'تم تشغيل المتصفح بنجاح' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async close(sessionId) {
    const session = this.browsers.get(sessionId)
    if (!session) return { success: false, error: 'يرجى تسجيل الدخول أولاً' }
    try {
      await session.context.close()
      this.browsers.delete(sessionId)
      return { success: true, message: 'تم إغلاق المتصفح' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async closeAll() {
    for (const [id, session] of this.browsers) {
      try { await session.context.close() } catch (e) { console.error('Error closing browser session:', e.message) }
    }
    this.browsers.clear()
    return { success: true, message: 'تم إغلاق كل المتصفحات' }
  }

  getPage(sessionId) {
    const session = this.browsers.get(sessionId)
    if (!session || !session.page) return undefined
    // Quick liveness check — if the page was closed, drop the session and
    // return undefined so callers get a clear "session gone" signal.
    try {
      session.page.url()
      return session.page
    } catch {
      console.log(`[BrowserManager] getPage(${sessionId}) found dead page, purging`)
      this.browsers.delete(sessionId)
      return undefined
    }
  }

  getBrowser(sessionId) {
    return this.browsers.get(sessionId)
  }

  async humanDelay(sessionId, min = 1500, max = 4000) {
    const session = this.browsers.get(sessionId)
    if (session && session.antiBan) {
      await new Promise(r => setTimeout(r, randomDelay(min, max)))
    }
  }

  async humanScroll(page, times = 3) {
    for (let i = 0; i < times; i++) {
      await page.evaluate(() => window.scrollTo(0, Math.random() * document.body.scrollHeight))
      await new Promise(r => setTimeout(r, randomDelay(800, 2000)))
    }
  }
}

module.exports = BrowserManager
