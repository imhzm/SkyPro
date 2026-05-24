// =====================================================================
// Campaign Runner — polls the campaigns table every 30 seconds and
// fires `campaign:trigger` to all renderer windows for any task whose
// scheduled_at has arrived AND whose status is 'pending'.
//
// Status flow:
//   pending → running → completed (one-time)
//   pending → running → pending (recurring, scheduled_at advanced)
//   pending → running → failed (after retries exhausted)
//
// The actual platform execution happens in the renderer via the existing
// platform IPC handlers — this runner is the *clock* + *dispatcher*.
// =====================================================================

const { BrowserWindow } = require('electron')

let pollHandle = null
let isPolling = false

/** Send to ALL renderer windows. */
function broadcastAll(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try { win.webContents.send(channel, payload) } catch { /* ignore destroyed */ }
    }
  }
}

/** Parse the data column safely. */
function parseData(raw) {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

/** Compute next run for a recurring schedule. Returns ISO string or null. */
function computeNextRun(scheduleData) {
  const sd = scheduleData || {}
  if (!sd.scheduleType || sd.scheduleType === 'once') return null
  if (!sd.time) return null
  const [hh, mm] = String(sd.time).split(':').map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  const now = new Date()

  if (sd.scheduleType === 'daily') {
    const next = new Date(now)
    next.setHours(hh, mm, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (sd.scheduleType === 'weekly' && Array.isArray(sd.daysOfWeek) && sd.daysOfWeek.length > 0) {
    const today = now.getDay()
    for (let offset = 1; offset < 8; offset++) {
      const day = (today + offset) % 7
      if (sd.daysOfWeek.includes(day)) {
        const target = new Date(now)
        target.setDate(now.getDate() + offset)
        target.setHours(hh, mm, 0, 0)
        return target.toISOString()
      }
    }
  }

  if (sd.scheduleType === 'monthly' && Number.isInteger(sd.dayOfMonth)) {
    const next = new Date(now)
    next.setDate(sd.dayOfMonth)
    next.setHours(hh, mm, 0, 0)
    if (next.getTime() <= now.getTime()) next.setMonth(next.getMonth() + 1)
    return next.toISOString()
  }

  return null
}

/** Poll for due campaigns and fire events. */
async function pollOnce(globals) {
  if (isPolling) return  // prevent overlap
  if (!globals.db) return
  isPolling = true
  try {
    const now = new Date().toISOString()
    const due = globals.db
      .prepare('SELECT * FROM campaigns WHERE status = ? AND scheduled_at IS NOT NULL AND scheduled_at <= ?')
      .all('pending', now)

    if (due.length === 0) return

    console.log(`[campaign-runner] ${due.length} campaign(s) due to fire`)

    for (const camp of due) {
      const scheduleData = parseData(camp.data)
      // Mark as running so we don't fire twice if execution takes >30s.
      globals.db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('running', camp.id)

      broadcastAll('campaign:trigger', {
        id: camp.id,
        name: camp.name,
        platform: camp.platform,
        type: camp.type,
        scheduleData,
      })

      // For recurring campaigns, advance scheduled_at AND reset to pending so
      // they fire again at the next slot. For one-time, leave them in 'running'
      // and the renderer is expected to mark them 'completed' or 'failed'.
      if (scheduleData.scheduleType && scheduleData.scheduleType !== 'once') {
        const nextRun = computeNextRun(scheduleData)
        if (nextRun) {
          globals.db
            .prepare('UPDATE campaigns SET status = ?, scheduled_at = ? WHERE id = ?')
            .run('pending', nextRun, camp.id)
          console.log(`[campaign-runner] ${camp.name} recurring → next: ${nextRun}`)
        }
      } else {
        // One-time campaigns: schedule a timeout to mark as 'completed' if
        // the renderer never reports back (safety net so they don't sit
        // forever as 'running').
        setTimeout(() => {
          try {
            const cur = globals.db.prepare('SELECT status FROM campaigns WHERE id = ?').get(camp.id)
            if (cur && cur.status === 'running') {
              globals.db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('completed', camp.id)
              console.log(`[campaign-runner] ${camp.name} auto-marked completed (no renderer response within 5min)`)
            }
          } catch (e) {
            console.error('[campaign-runner] auto-complete failed:', e.message)
          }
        }, 5 * 60 * 1000)
      }
    }
  } catch (err) {
    console.error('[campaign-runner] poll failed:', err.message)
  } finally {
    isPolling = false
  }
}

/** Start the runner. Polls every 30s. */
function start(globals) {
  if (pollHandle) return  // already running
  console.log('[campaign-runner] started — polling every 30s')
  // Fire once immediately, then on interval.
  pollOnce(globals).catch(() => {})
  pollHandle = setInterval(() => { pollOnce(globals).catch(() => {}) }, 30 * 1000)
}

function stop() {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
    console.log('[campaign-runner] stopped')
  }
}

module.exports = { start, stop }
