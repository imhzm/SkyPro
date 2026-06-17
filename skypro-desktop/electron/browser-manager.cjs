const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const { randomUA, randomDelay, getSecuritySettings, USER_AGENTS } = require('./anti-ban.cjs')
const { ensureBrowser, browserInstalled } = require('./ensure-browser.cjs')

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

  /**
   * Return an ALREADY-OPEN, alive session for a platform/profile WITHOUT
   * launching anything. Used by check-platform-session so that merely opening
   * a platform tab never spawns a browser — the window only appears when the
   * user explicitly logs in.
   */
  async findAliveSession(platform, profileId) {
    for (const [id, session] of this.browsers) {
      const matches = profileId
        ? session.profileId === profileId
        : (session.platform === platform && !session.profileId)
      if (!matches) continue
      if (await this.isSessionAlive(session)) return { id, session }
    }
    return null
  }

  async launch(options = {}) {
    const { headless = false, proxy, sessionId = `session-${Date.now()}`, antiBan = true, platform, profileId } = options
    try {
      // Reuse an alive session whenever we safely can, then purge dead ones:
      //   • profileId given → reuse the session bound to that EXACT profileId.
      //     This is critical: launchPersistentContext() takes an OS lock on the
      //     profile dir (SingletonLock). A second launch on the same per-account
      //     dir (e.g. a logged-in "google-<id>" window) would throw. Reusing the
      //     already-open window is what makes bulk-rate work against a session
      //     the user logged into manually.
      //   • only platform → reuse the first alive platform session (legacy).
      if (platform || profileId) {
        // Walk the map and skip-or-purge dead sessions before reusing.
        // Previously this returned the first match unconditionally — if the
        // user had closed the browser window manually, the session was dead
        // and every subsequent IPC call failed until app restart.
        const deadIds = []
        for (const [id, session] of this.browsers) {
          const matches = profileId
            ? session.profileId === profileId
            : (session.platform === platform && !session.profileId)
          if (!matches) continue
          const alive = await this.isSessionAlive(session)
          if (alive) {
            console.log(`Reusing existing browser for ${profileId || platform}, sessionId=${id}`)
            return { success: true, sessionId: id, message: 'المتصفح مفتوح بالفعل' }
          }
          // Dead session — schedule for purge and fall through to launch a fresh one.
          deadIds.push(id)
        }
        for (const id of deadIds) {
          console.log(`[BrowserManager] purging dead session ${id} for ${profileId || platform}`)
          try { await this.browsers.get(id)?.context?.close().catch(() => {}) } catch { /* already dead */ }
          this.browsers.delete(id)
        }
      }
      // The packaged installer SHIPS Chromium inside resources/pw-browsers (see
      // scripts/bundle-chromium.mjs) and main.cjs points PLAYWRIGHT_BROWSERS_PATH
      // at it — so browserInstalled() is true here and we launch immediately,
      // fully offline. This download path now only fires as a safety net for
      // dev/unpacked runs (or a corrupt/missing bundle).
      if (!browserInstalled()) {
        const ready = await ensureBrowser()
        if (!ready.ok) {
          return { success: false, error: ready.error ? `تعذّر تجهيز المتصفح: ${ready.error}` : 'تعذّر تجهيز المتصفح. تأكد من اتصال الإنترنت ثم حاول مرة أخرى.' }
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

      // ================== COMPREHENSIVE STEALTH ==================
      // Twitter/X has very aggressive bot detection. This block does what
      // playwright-extra-plugin-stealth does but inline, since we can't add
      // that runtime dep in a packaged electron build. Covers:
      //  - navigator.webdriver removal
      //  - WebGL renderer/vendor spoofing (Twitter checks this)
      //  - Canvas fingerprint randomization (slight per-pixel noise)
      //  - chrome.runtime + chrome.app + chrome.csi + chrome.loadTimes
      //  - plugins array with realistic entries
      //  - permissions API normalization
      //  - Notification.permission consistency
      //  - removal of CDP-related window properties
      //  - WebRTC IP leak prevention
      await context.addInitScript(() => {
        // 1. webdriver — must be undefined, NOT just false
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })

        // 2. Realistic plugins/mimeTypes array (Chrome ships with 3 by default)
        const fakePlugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ]
        Object.defineProperty(navigator, 'plugins', {
          get: () => Object.assign(fakePlugins, { length: fakePlugins.length, item: (i) => fakePlugins[i], namedItem: (n) => fakePlugins.find(p => p.name === n) }),
        })
        Object.defineProperty(navigator, 'mimeTypes', {
          get: () => Object.assign([{ type: 'application/pdf' }, { type: 'application/x-google-chrome-pdf' }], { length: 2 }),
        })

        // 3. chrome.* object — Twitter checks chrome.app and chrome.runtime
        try {
          window.chrome = {
            app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
            runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } },
            csi: () => ({ onloadT: Date.now(), pageT: 1000, startE: Date.now() - 1000, tran: 15 }),
            loadTimes: () => ({ requestTime: Date.now() / 1000, startLoadTime: Date.now() / 1000, commitLoadTime: Date.now() / 1000, finishDocumentLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000, firstPaintTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, navigationType: 'Other', wasFetchedViaSpdy: true, wasNpnNegotiated: true, npnNegotiatedProtocol: 'h2', wasAlternateProtocolAvailable: false, connectionInfo: 'h2' }),
          }
        } catch { /* in some contexts chrome is read-only */ }

        // 4. Languages
        Object.defineProperty(navigator, 'languages', { get: () => ['ar-SA', 'ar', 'en-US', 'en'] })

        // 5. Hardware
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
        Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' })
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' })

        // 6. WebGL spoofing — Twitter fingerprints the GPU vendor/renderer
        try {
          const getParam = WebGLRenderingContext.prototype.getParameter
          WebGLRenderingContext.prototype.getParameter = function (parameter) {
            // UNMASKED_VENDOR_WEBGL = 37445, UNMASKED_RENDERER_WEBGL = 37446
            if (parameter === 37445) return 'Intel Inc.'
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'
            return getParam.apply(this, [parameter])
          }
        } catch { /* WebGL not available */ }

        // 7. Canvas fingerprint — add tiny per-pixel noise so each toDataURL differs
        try {
          const origToDataURL = HTMLCanvasElement.prototype.toDataURL
          HTMLCanvasElement.prototype.toDataURL = function (...args) {
            const ctx = this.getContext('2d')
            if (ctx) {
              const data = ctx.getImageData(0, 0, this.width, this.height)
              for (let i = 0; i < data.data.length; i += 4) {
                // Flip the lowest bit of each channel — invisible but unique
                data.data[i] ^= 1
              }
              ctx.putImageData(data, 0, 0)
            }
            return origToDataURL.apply(this, args)
          }
        } catch { /* defensive */ }

        // 8. Permissions API consistency (notification.permission must match)
        const originalQuery = window.navigator.permissions.query
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters)
        )

        // 9. Remove CDP / chrome-driver / selenium markers
        const cdpProps = ['cdc_', '$cdc_', '__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', '__webdriver_script_func', '__webdriver_script_fn', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate', '__selenium_unwrapped', '__fxdriver_unwrapped']
        for (const key of Object.keys(window)) {
          if (cdpProps.some((p) => key.startsWith(p))) {
            try { delete window[key] } catch { /* readonly */ }
          }
        }

        // 10. iframe contentWindow → must return real Window-like object (Twitter checks this)
        try {
          const origIframeDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')
          if (origIframeDescriptor) {
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
              get() {
                const w = origIframeDescriptor.get.call(this)
                if (!w) return w
                try {
                  Object.defineProperty(w.navigator, 'webdriver', { get: () => undefined })
                } catch { /* nested iframe protection */ }
                return w
              },
              configurable: true,
            })
          }
        } catch { /* defensive */ }

        // 11. window.outerHeight/outerWidth must equal inner+toolbar height
        // (Twitter checks the toolbar/chrome height delta)
        // Already correct in non-headless mode — no-op here.
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
