// Aggressive garbage detector — must match the one in main.cjs.
// A row is "real" only if its content has at least one Unicode letter
// or digit (\p{L} or \p{N}). Everything else — whitespace, punctuation,
// control chars, invisible Unicode — is garbage and gets cleaned up.
function isGarbageUsername(s) {
  if (s === null || s === undefined) return true
  const str = String(s).trim()
  if (!str) return true
  if (/^(undefined|null|nan|none|n\/a|-+|—+|_+|\.+)$/i.test(str)) return true
  if (!/[\p{L}\p{N}]/u.test(str)) return true
  return false
}

// ==================== DATABASE SCHEMA ====================
function initDatabase(db) {
  if (!db) return

  // ==================== PRAGMA SETTINGS ====================
  // WAL mode: better concurrent read/write performance
  db.pragma('journal_mode = WAL')
  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON')
  // Faster sync for better write performance (still safe with WAL)
  db.pragma('synchronous = NORMAL')
  // Increase cache size for better read performance (2MB)
  db.pragma('cache_size = -2000')

  db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    url TEXT,
    extra_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    username TEXT,
    password TEXT,
    proxy TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    cookies TEXT,
    proxy_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    platform TEXT,
    type TEXT,
    status TEXT DEFAULT 'pending',
    results TEXT,
    scheduled_at TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS smtp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    password TEXT,
    host TEXT,
    port INTEGER,
    ssl TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS proxies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT,
    host TEXT,
    port TEXT,
    protocol TEXT,
    username TEXT,
    password TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `)
  try { db.exec(`ALTER TABLE campaigns ADD COLUMN scheduled_at TEXT`) } catch (e) { /* column may already exist */ }
  try { db.exec(`ALTER TABLE campaigns ADD COLUMN data TEXT`) } catch (e) { /* column may already exist */ }
  try { db.exec(`ALTER TABLE accounts ADD COLUMN notes TEXT`) } catch (e) { /* column may already exist */ }
  try { db.exec(`ALTER TABLE accounts ADD COLUMN cookies TEXT`) } catch (e) { /* column may already exist */ }
  try { db.exec(`ALTER TABLE accounts ADD COLUMN proxy_id INTEGER`) } catch (e) { /* column may already exist */ }

  db.exec(`CREATE TABLE IF NOT EXISTS security_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled INTEGER DEFAULT 1,
    randomDelays INTEGER DEFAULT 1,
    minDelay INTEGER DEFAULT 2000,
    maxDelay INTEGER DEFAULT 8000,
    maxActionsPerHour INTEGER DEFAULT 50,
    rotateUserAgent INTEGER DEFAULT 1,
    randomizeViewport INTEGER DEFAULT 1,
    useStealthMode INTEGER DEFAULT 1,
    maxRetries INTEGER DEFAULT 3
  )`)

  // Device registration table - stores device info on first activation
  db.exec(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT UNIQUE NOT NULL,
    hostname TEXT,
    platform TEXT,
    arch TEXT,
    cpu TEXT,
    cpu_cores INTEGER,
    ram TEXT,
    first_activation_key TEXT,
    first_activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // ==================== INDEXES (idempotent) ====================
  // Performance-critical indexes for filtered queries
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_leads_platform ON leads (platform)',
    'CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source)',
    'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts (platform)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts (status)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_platform_username ON accounts (platform, username)',
    'CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns (platform)',
    'CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status)',
    'CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns (status, scheduled_at)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_proxies_host_port ON proxies (host, port, protocol)',
    'CREATE INDEX IF NOT EXISTS idx_leads_platform_created ON leads (platform, created_at)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_smtp_email ON smtp_settings (email, host, port)',
  ]
  for (const sql of indexes) {
    try { db.exec(sql) } catch (e) { /* index may conflict with existing data */ }
  }

  // ==================== AUTO-CLEANUP ====================
  // Wipe every garbage account row on every boot. JS-layer scan so we catch
  // every Unicode-whitespace pattern (zero-width, NBSP, BOM, RTL marks).
  // Idempotent — once empty rows are gone, this is a no-op.
  try {
    const rows = db.prepare('SELECT id, platform, username FROM accounts').all()
    const garbageIds = rows
      .filter((r) => isGarbageUsername(r.platform) || isGarbageUsername(r.username))
      .map((r) => r.id)
    if (garbageIds.length > 0) {
      const placeholders = garbageIds.map(() => '?').join(',')
      const result = db.prepare(`DELETE FROM accounts WHERE id IN (${placeholders})`).run(...garbageIds)
      console.log(`[db-init] auto-cleanup removed ${result.changes} garbage account row(s)`)
    }
  } catch (err) {
    console.error('[db-init] auto-cleanup failed:', err.message)
  }

  // Install a trigger that REJECTS any future INSERT/UPDATE that would create
  // an empty-username account row. Belt + braces with the JS-layer guard.
  //
  // The TRIM-based check below catches plain whitespace but NOT every
  // invisible Unicode char (zero-width-space 0x200B, RLM 0x200F, BOM 0xFEFF,
  // etc.). For those we rely on the JS-layer isGarbageUsername() guard at
  // the db-insert IPC boundary AND the read-time cleanup in db-query.
  //
  // We DROP-and-recreate (not "IF NOT EXISTS") so older installs that have
  // the weaker original triggers get upgraded automatically on next launch.
  try {
    db.exec(`
      DROP TRIGGER IF EXISTS trg_accounts_reject_empty_insert;
      DROP TRIGGER IF EXISTS trg_accounts_reject_empty_update;

      CREATE TRIGGER trg_accounts_reject_empty_insert
      BEFORE INSERT ON accounts
      FOR EACH ROW
      WHEN NEW.username IS NULL
        OR TRIM(NEW.username, ' ' || char(9) || char(10) || char(11) || char(12) || char(13) || char(160)) = ''
        OR LOWER(TRIM(NEW.username)) = 'undefined'
        OR LOWER(TRIM(NEW.username)) = 'null'
        OR LOWER(TRIM(NEW.username)) = 'nan'
        OR NEW.platform IS NULL
        OR TRIM(NEW.platform, ' ' || char(9) || char(10) || char(11) || char(12) || char(13) || char(160)) = ''
      BEGIN
        SELECT RAISE(ABORT, 'empty username/platform refused by trigger');
      END;

      CREATE TRIGGER trg_accounts_reject_empty_update
      BEFORE UPDATE OF username, platform ON accounts
      FOR EACH ROW
      WHEN NEW.username IS NULL
        OR TRIM(NEW.username, ' ' || char(9) || char(10) || char(11) || char(12) || char(13) || char(160)) = ''
        OR LOWER(TRIM(NEW.username)) = 'undefined'
        OR LOWER(TRIM(NEW.username)) = 'null'
        OR LOWER(TRIM(NEW.username)) = 'nan'
        OR NEW.platform IS NULL
        OR TRIM(NEW.platform, ' ' || char(9) || char(10) || char(11) || char(12) || char(13) || char(160)) = ''
      BEGIN
        SELECT RAISE(ABORT, 'empty username/platform refused by trigger');
      END;
    `)
  } catch (err) {
    console.error('[db-init] trigger install failed:', err.message)
  }
}

module.exports = { initDatabase }
