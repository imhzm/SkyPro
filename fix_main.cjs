const fs = require('fs');
let c = fs.readFileSync('electron/main.cjs', 'utf8');
const search = '} catch (e) { console.error(`smartActionClick ${label} failed:`, e.message) }\r\n  try {\n    return await bm.launch(options)';
const replace = `} catch (e) { console.error(\`smartActionClick \${label} failed:\`, e.message) }
  }
  return false
}

// ==================== IPC: BROWSER ====================
ipcm('launch-browser', async (e, options) => {
  try {
    return await bm.launch(options)`;
c = c.replace(search, replace);
fs.writeFileSync('electron/main.cjs', c);
console.log('Fixed syntax error in main.cjs');
