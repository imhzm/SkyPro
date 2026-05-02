// ==================== DATABASE SCHEMA ====================
function initDatabase(db) {
  if (!db) return
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
}

module.exports = { initDatabase }
