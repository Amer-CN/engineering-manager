const fs = require('fs');
const j = JSON.parse(fs.readFileSync('D:/Company Database/engineering.json', 'utf8'));
const admin = j.users.find(u => u.username === 'admin');
if (admin) {
  admin.mustChangePassword = false;
  fs.writeFileSync('D:/Company Database/engineering.json', JSON.stringify(j, null, 2), 'utf8');
  console.log('mustChangePassword set to false');
} else {
  console.log('Admin not found');
}
