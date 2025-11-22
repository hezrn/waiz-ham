const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { ensureDb } = require('./db/db');
const path = require('path');

const app = express();
const db = ensureDb();

const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

// uploads folder
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOADS_DIR); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'waiz_dev_secret';

function generateToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing authorization' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional authentication: try to parse token but don't fail if absent/invalid
function authenticateOptional(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) { req.userId = null; return next(); }
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') { req.userId = null; return next(); }
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    console.log('[authOptional] token ok, userId=', req.userId);
  } catch (err) {
    req.userId = null;
  }
  next();
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// Helper to run SQL as Promise
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Auth: Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { user_type, name, email, phone, address, password } = req.body;
    if (!user_type || !name || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await getSql('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await runSql(
      'INSERT INTO users (id, user_type, name, email, phone, address, password_hash) VALUES (?,?,?,?,?,?,?)',
      [id, user_type, name, email, phone || '', address || '', password_hash]
    );

    const user = await getSql('SELECT id, user_type, name, email, phone, address, created_at FROM users WHERE id = ?', [id]);
    const token = generateToken(user);
    res.json({ ok: true, user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth: Login
app.post('/api/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await getSql('SELECT * FROM users WHERE email = ? OR phone = ?', [emailOrPhone, emailOrPhone]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const sanitized = { id: user.id, user_type: user.user_type, name: user.name, email: user.email, phone: user.phone, address: user.address };
    const token = generateToken(sanitized);
    res.json({ ok: true, user: sanitized, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users - get profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getSql('SELECT id, user_type, name, email, phone, address, created_at FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// current user
app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await getSql('SELECT id, user_type, name, email, phone, address, created_at FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Items
app.get('/api/items', async (req, res) => {
  try {
    const items = await allSql('SELECT items.*, users.name AS seller_name FROM items LEFT JOIN users ON items.seller_id = users.id');
    res.json({ ok: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create item with optional image upload (creates thumbnail)
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, seller_id, category } = req.body;
    let image_path = null;
    let thumb_path = null;
    if (req.file) {
      image_path = '/uploads/' + req.file.filename;
      // create a thumbnail
      const fullPath = path.join(UPLOADS_DIR, req.file.filename);
      const thumbName = 'thumb_' + req.file.filename;
      const thumbFull = path.join(UPLOADS_DIR, thumbName);
      try {
        await sharp(fullPath).resize(800, 600, { fit: 'inside' }).toFile(thumbFull + '.tmp');
        // also create a smaller thumb
        await sharp(fullPath).resize(400, 300, { fit: 'cover' }).toFile(thumbFull);
        // move previously created resized file if tmp used
        if (fs.existsSync(thumbFull + '.tmp')) {
          fs.unlinkSync(thumbFull + '.tmp');
        }
        thumb_path = '/uploads/' + thumbName;
      } catch (imgErr) {
        console.error('Image processing failed', imgErr);
      }
    }
    const id = uuidv4();
    await runSql('INSERT INTO items (id, title, description, price, seller_id, category, image_path, thumb_path) VALUES (?,?,?,?,?,?,?,?)', [id, title, description || '', price || '', seller_id || null, category || '', image_path, thumb_path]);
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Requests
app.get('/api/requests', async (req, res) => {
  try {
    const userId = req.query.userId;
    let requests;
    if (userId) requests = await allSql('SELECT * FROM requests WHERE user_id = ?', [userId]);
    else requests = await allSql('SELECT * FROM requests');
    res.json({ ok: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { user_id, type, items, address, date } = req.body;
    const id = uuidv4();
    await runSql('INSERT INTO requests (id, user_id, type, items, address, date) VALUES (?,?,?,?,?,?)', [id, user_id, type || 'Collection', items || '', address || '', date || '']);
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Messages
app.get('/api/messages', async (req, res) => {
  try {
    const userId = req.query.userId;
    console.log('[GET /api/messages] query.userId=', userId);
    let messages;
    if (userId) {
      messages = await allSql('SELECT messages.*, fu.name as from_name, tu.name as to_name FROM messages LEFT JOIN users fu ON messages.from_id = fu.id LEFT JOIN users tu ON messages.to_id = tu.id WHERE from_id = ? OR to_id = ? ORDER BY created_at ASC', [userId, userId]);
    } else {
      messages = await allSql('SELECT messages.*, fu.name as from_name, tu.name as to_name FROM messages LEFT JOIN users fu ON messages.from_id = fu.id LEFT JOIN users tu ON messages.to_id = tu.id ORDER BY created_at ASC');
    }
    res.json({ ok: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/messages', authenticateOptional, async (req, res) => {
  try {
    const { from_id, to_id, text } = req.body;
    const actualFrom = req.userId || from_id || null;
    console.log('[POST /api/messages] resolved from=', actualFrom, ' body=', { from_id, to_id, text });
    const id = uuidv4();
    await runSql('INSERT INTO messages (id, from_id, to_id, text) VALUES (?,?,?,?)', [id, actualFrom, to_id || null, text || '']);
    // return the created message including created_at
    const msg = await getSql('SELECT messages.*, fu.name as from_name, tu.name as to_name FROM messages LEFT JOIN users fu ON messages.from_id = fu.id LEFT JOIN users tu ON messages.to_id = tu.id WHERE messages.id = ?', [id]);
    res.json({ ok: true, message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user profile
app.put('/api/me', authenticate, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await runSql('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?', [name || '', phone || '', address || '', req.userId]);
    const user = await getSql('SELECT id, user_type, name, email, phone, address, created_at FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rates
app.get('/api/rates', async (req, res) => {
  try {
    const rates = await allSql('SELECT * FROM rates');
    res.json(rates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unified community feed: mix items and requests sorted by created_at
app.get('/api/feed', async (req, res) => {
  try {
    const sql = `
      SELECT items.id as id, 'item' as type, items.title as title, items.description as body, items.price as meta, items.image_path as image_path, items.thumb_path as thumb_path, items.created_at as created_at, items.seller_id as actor_id, u.name as actor_name
      FROM items LEFT JOIN users u ON items.seller_id = u.id
      UNION ALL
      SELECT requests.id as id, 'request' as type, requests.type as title, requests.items as body, requests.address as meta, requests.created_at as created_at, requests.user_id as actor_id, u2.name as actor_name
      FROM requests LEFT JOIN users u2 ON requests.user_id = u2.id
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const feed = await allSql(sql);
    res.json({ ok: true, feed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simple rule-based chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    const text = (message || '').toLowerCase();
    const responses = {
      how: 'Navigate using the sidebar — Home, Items, Requests, Messages, Rates, Profile.',
      rate: 'Check the Rate List section — rates vary by material and junkshop.',
      message: 'Use the Messages tab to contact junkshops or households.',
      request: 'Create a collection request from the Requests tab and provide pickup address.'
    };

    let reply = 'I can help with navigation, rates, messages, and requests. What would you like to know?';
    for (const k of Object.keys(responses)) {
      if (text.includes(k)) {
        reply = responses[k];
        break;
      }
    }

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
