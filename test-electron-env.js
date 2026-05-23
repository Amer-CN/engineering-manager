// Quick test: does require('electron').app exist in Electron main process?
const electron = require('electron');
console.log('[electron] keys:', Object.keys(electron).slice(0, 10));
console.log('[electron.app] defined:', typeof electron.app);
console.log('[electron.app.getPath] defined:', typeof electron.app?.getPath);

try {
  const Database = require('better-sqlite3');
  console.log('[better-sqlite3] loaded, type:', typeof Database);
  const db = new Database(':memory:');
  console.log('[better-sqlite3] in-memory DB created OK');
  db.close();
} catch(e) {
  console.error('[better-sqlite3] FAILED:', e.message);
}

process.exit(0);
