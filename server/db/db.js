const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'waiz.db');
const INIT_SQL = path.join(__dirname, 'init.sql');

function ensureDb() {
  const exists = fs.existsSync(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);

  if (!exists) {
    const init = fs.readFileSync(INIT_SQL, 'utf8');
    db.exec(init, (err) => {
      if (err) {
        console.error('Failed to initialize DB', err);
      } else {
        console.log('Database initialized.');
      }
    });
  }

  // Ensure items.image_path column exists (migrate if needed)
  db.all("PRAGMA table_info(items)", (err, rows) => {
    if (err) return;
    const hasImage = rows && rows.some(r => r.name === 'image_path');
    if (!hasImage) {
      db.run("ALTER TABLE items ADD COLUMN image_path TEXT", (err2) => {
        if (err2) console.error('Failed to add image_path column', err2);
        else console.log('Added items.image_path column');
      });
    }
  });

  // Ensure items.thumb_path column exists
  db.all("PRAGMA table_info(items)", (err2, rows2) => {
    if (err2) return;
    const hasThumb = rows2 && rows2.some(r => r.name === 'thumb_path');
    if (!hasThumb) {
      db.run("ALTER TABLE items ADD COLUMN thumb_path TEXT", (err3) => {
        if (err3) console.error('Failed to add thumb_path column', err3);
        else console.log('Added items.thumb_path column');
      });
    }
  });

  return db;
}

module.exports = {
  ensureDb,
};
