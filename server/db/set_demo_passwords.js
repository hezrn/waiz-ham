const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'waiz.db');

async function setPasswords() {
  const db = new sqlite3.Database(DB_PATH);
  const password = 'password';
  const hash = await bcrypt.hash(password, 10);
  db.serialize(() => {
    db.run("UPDATE users SET password_hash = ? WHERE id = 'user_house_1'", [hash], (err) => { if (err) console.error(err); });
    db.run("UPDATE users SET password_hash = ? WHERE id = 'user_junk_1'", [hash], (err) => { if (err) console.error(err); });
  });
  db.close(() => console.log('Demo passwords set to `password` for seeded users'));
}

setPasswords().catch(err => console.error(err));
