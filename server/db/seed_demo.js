const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'waiz.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) return console.error('Open DB error', err);
});

const stmts = [
  `INSERT OR IGNORE INTO users (id, user_type, name, email, phone, address, password_hash) VALUES ('user_house_1', 'household', 'Ana Santos', 'ana@example.com', '+63 9123456789', 'Session Road, Baguio', '');`,
  `INSERT OR IGNORE INTO users (id, user_type, name, email, phone, address, password_hash) VALUES ('user_junk_1', 'junkshop', 'GreenCycle Junkshop', 'greencycle@example.com', '+63 9171112233', 'Burnham Park Area, Baguio', '');`,

  `INSERT OR IGNORE INTO items (id, title, description, price, seller_id, category) VALUES ('item1', 'Plastic Bottles (50pcs)', 'Clean PET bottles, mixed colors', '₱150', 'user_junk_1', 'Plastic');`,
  `INSERT OR IGNORE INTO items (id, title, description, price, seller_id, category) VALUES ('item2', 'Newspapers Bundle', 'Old newspapers, good condition', '₱80', 'user_junk_1', 'Paper');`,
  `INSERT OR IGNORE INTO items (id, title, description, price, seller_id, category) VALUES ('item3', 'Aluminum Cans (30pcs)', 'Crushed cans', '₱120', 'user_junk_1', 'Metal');`,

  `INSERT OR IGNORE INTO requests (id, user_id, type, items, status, date, address) VALUES ('req1', 'user_house_1', 'Collection', 'Mixed recyclables (bottles, paper)', 'Pending', '2024-01-15', 'Session Road, Baguio');`,

  `INSERT OR IGNORE INTO messages (id, from_id, to_id, text) VALUES ('msg1', 'user_house_1', 'user_junk_1', 'Hello, I have 50 PET bottles. Are you buying?');`,
  `INSERT OR IGNORE INTO messages (id, from_id, to_id, text) VALUES ('msg2', 'user_junk_1', 'user_house_1', 'Hi Ana! Yes, we buy PET bottles at ₱3 per piece. When can you drop them off or request pickup?');`
];

db.serialize(() => {
  stmts.forEach(s => {
    db.run(s, (err) => {
      if (err) console.error('Seed error', err);
    });
  });
});

db.close(() => console.log('Seeding complete'));
