const Database = require('better-sqlite3');
console.log('[OK] better-sqlite3 loaded, type:', typeof Database);
try {
  const db = new Database(':memory:');
  console.log('[OK] In-memory DB created');
  db.close();
  console.log('[OK] DB closed');
} catch(e) {
  console.error('[FAIL] DB test failed:', e.message);
}
process.exit(0);
