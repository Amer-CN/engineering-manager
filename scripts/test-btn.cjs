const fs = require('fs');
const c = fs.readFileSync('src/components/AuditLogViewer.tsx', 'utf8');
console.log('has btn:', /\bbtn\b/.test(c));
const m = [...c.matchAll(/<button\b([^>]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g)];
console.log('button matches:', m.length);
if (m.length > 0) console.log('sample:', m[0][0].substring(0, 100));

// Also search with grep-like pattern
const grepMatches = c.match(/className="[^"]*btn[^"]*"/g);
console.log('grep matches:', grepMatches ? grepMatches.length : 0);
if (grepMatches) console.log('sample:', grepMatches[0]);