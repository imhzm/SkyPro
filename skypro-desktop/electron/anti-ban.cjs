// ==================== ANTI-BAN HELPERS ====================
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
]

let dbInstance = null;

function setDb(database) {
  dbInstance = database;
}

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] }
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSecuritySettings() {
  try {
    if (!dbInstance) return null;
    const rows = dbInstance.prepare('SELECT * FROM security_settings ORDER BY id DESC LIMIT 1').all();
    if (rows.length > 0) return rows[0];
  } catch (e) { console.error('getSecuritySettings error:', e.message); }
  return null;
}

module.exports = { USER_AGENTS, randomUA, randomDelay, getSecuritySettings, setDb };
