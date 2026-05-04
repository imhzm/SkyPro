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

  async launch(options = {}) {
    const { headless = false, proxy, sessionId = `session-${Date.now()}`, antiBan = true, platform, profileId } = options
    try {
      // If profileId is provided, allow multiple sessions per platform (one per account)
      // Without profileId, reuse existing browser for this platform (legacy behavior)
      if (platform && !profileId) {
        for (const [id, session] of this.browsers) {
          if (session.platform === platform) {
            console.log(`Reusing existing browser for ${platform}, sessionId=${id}`)
            return { success: true, sessionId: id, message: 'المتصفح مفتوح بالفعل' }
          }
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
          'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
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
        // Remove automation flags from window
        delete window.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_
        delete window.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_Array
        delete window.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_Object
        delete window.__proto__.cdc_adoQpoasnfa76pfcZLmcfl_Promise
        // Override permissions
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
    return this.browsers.get(sessionId)?.page
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
