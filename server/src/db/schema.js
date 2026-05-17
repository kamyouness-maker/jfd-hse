const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'safecheck.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','responsable_hse','animateur_hse')),
    company TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    location TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'en_cours' CHECK(status IN ('en_cours','termine')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    tour_id TEXT NOT NULL,
    checklist_type TEXT NOT NULL CHECK(checklist_type IN ('standards_hse','equipements')),
    section TEXT NOT NULL,
    item_key TEXT NOT NULL,
    item_label TEXT NOT NULL,
    statut TEXT CHECK(statut IN ('conforme','non_conforme','na',NULL)),
    observation TEXT,
    action_plan TEXT,
    action_deadline TEXT,
    action_responsible TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(tour_id) REFERENCES tours(id)
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    checklist_item_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/jpeg',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(checklist_item_id) REFERENCES checklist_items(id)
  );
`);

// Seed admin user if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `).run('admin', hash, 'Administrateur', 'admin');
  console.log('Admin user seeded');
}

module.exports = db;
