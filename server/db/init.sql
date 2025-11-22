-- SQLite DB initialization for Waiz
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price TEXT,
  seller_id TEXT,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT,
  items TEXT,
  status TEXT DEFAULT 'Pending',
  date TEXT,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_id TEXT,
  to_id TEXT,
  text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_id) REFERENCES users(id),
  FOREIGN KEY (to_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material TEXT NOT NULL,
  price TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed some rates and items
INSERT INTO rates (material, price) VALUES ('Plastic Bottles (PET)', '₱3 per piece');
INSERT INTO rates (material, price) VALUES ('Newspapers', '₱8 per kilo');
INSERT INTO rates (material, price) VALUES ('Aluminum Cans', '₱4 per piece');
INSERT INTO rates (material, price) VALUES ('Glass Bottles', '₱2 per piece');
INSERT INTO rates (material, price) VALUES ('Cardboard', '₱6 per kilo');
INSERT INTO rates (material, price) VALUES ('Copper Wire', '₱350 per kilo');

-- Seed demo users
INSERT INTO users (id, user_type, name, email, phone, address, password_hash) VALUES ('user_house_1', 'household', 'Ana Santos', 'ana@example.com', '+63 9123456789', 'Session Road, Baguio', '');
INSERT INTO users (id, user_type, name, email, phone, address, password_hash) VALUES ('user_junk_1', 'junkshop', 'GreenCycle Junkshop', 'greencycle@example.com', '+63 9171112233', 'Burnham Park Area, Baguio', '');

-- Seed demo items
INSERT INTO items (id, title, description, price, seller_id, category) VALUES ('item1', 'Plastic Bottles (50pcs)', 'Clean PET bottles, mixed colors', '₱150', 'user_junk_1', 'Plastic');
INSERT INTO items (id, title, description, price, seller_id, category) VALUES ('item2', 'Newspapers Bundle', 'Old newspapers, good condition', '₱80', 'user_junk_1', 'Paper');
INSERT INTO items (id, title, description, price, seller_id, category) VALUES ('item3', 'Aluminum Cans (30pcs)', 'Crushed cans', '₱120', 'user_junk_1', 'Metal');

-- Seed demo requests
INSERT INTO requests (id, user_id, type, items, status, date, address) VALUES ('req1', 'user_house_1', 'Collection', 'Mixed recyclables (bottles, paper)', 'Pending', '2024-01-15', 'Session Road, Baguio');

-- Seed demo messages
INSERT INTO messages (id, from_id, to_id, text) VALUES ('msg1', 'user_house_1', 'user_junk_1', 'Hello, I have 50 PET bottles. Are you buying?');
INSERT INTO messages (id, from_id, to_id, text) VALUES ('msg2', 'user_junk_1', 'user_house_1', 'Hi Ana! Yes, we buy PET bottles at ₱3 per piece. When can you drop them off or request pickup?');

