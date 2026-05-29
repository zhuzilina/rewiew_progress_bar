const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'progress.db')

const COLOR_PALETTE = [
  '#FF7B9C', '#6AB0D6', '#5DBB8A', '#E8B84B', '#A07FD9',
  '#FF8C5A', '#FFB5C2', '#7ECBA1', '#F5C542', '#B388D9',
]

const DEFAULT_SLOGANS = [
  '每天进步一点点，稳稳上岸 ✨',
  '坚持就是胜利 🌟',
  '今天的努力是明天的底气 💪',
  '考研路上不孤单 🌈',
  '越努力，越幸运 🍀',
  '每一个清晨都是新的起跑线 ☀️',
]

const DEFAULT_ITEMS = [
  { name: '考研英语', days: 365, target_value: 10000, color: COLOR_PALETTE[0] },
  { name: '考研政治', days: 365, target_value: 8000,  color: COLOR_PALETTE[1] },
  { name: '专业课一', days: 365, target_value: 12000, color: COLOR_PALETTE[2] },
  { name: '专业课二', days: 365, target_value: 10000, color: COLOR_PALETTE[3] },
  { name: '复试准备', days: 180, target_value: 5000,  color: COLOR_PALETTE[4] },
]

/** @type {import('better-sqlite3').Database | null} */
let _db = null

function getDb() {
  if (_db) return _db

  fs.mkdirSync(DATA_DIR, { recursive: true })
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  initDb()
  return _db
}

function initDb() {
  const hasItems = _db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='items'",
  ).get()

  if (hasItems) {
    const cols = _db.prepare("PRAGMA table_info('items')").all()
    if (!cols.some((c) => c.name === 'target_value')) {
      _db.exec('DROP TABLE IF EXISTS daily_records')
      _db.exec('DROP TABLE IF EXISTS items')
      createTables()
      seedData()
      return
    }
    // Ensure slogans table exists (schema migration)
    if (!_db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='slogans'").get()) {
      _db.exec(
        'CREATE TABLE slogans (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL)',
      )
      seedSlogans()
    }
    return
  }

  createTables()
  seedData()
}

function createTables() {
  _db.exec(`
    CREATE TABLE items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      days         INTEGER NOT NULL DEFAULT 100,
      target_value REAL    NOT NULL DEFAULT 100,
      color        TEXT    NOT NULL
    );
    CREATE TABLE daily_records (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      date       TEXT    NOT NULL,
      completion REAL    NOT NULL DEFAULT 0,
      UNIQUE(item_id, date)
    );
    CREATE TABLE slogans (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT    NOT NULL
    );
  `)
}

function seedSlogans() {
  const stmt = _db.prepare('INSERT INTO slogans (content) VALUES (?)')
  const insert = _db.transaction((items) => {
    for (const s of items) stmt.run(s)
  })
  insert(DEFAULT_SLOGANS)
}

function seedData() {
  // items
  const stmt = _db.prepare(
    'INSERT INTO items (name, days, target_value, color) VALUES (@name, @days, @target_value, @color)',
  )
  const insertItems = _db.transaction((items) => {
    for (const item of items) stmt.run(item)
  })
  insertItems(DEFAULT_ITEMS)

  // daily_records demo data
  const seeded = _db.prepare('SELECT id FROM items ORDER BY id ASC').all()
  const today = new Date()
  const rStmt = _db.prepare(
    'INSERT INTO daily_records (item_id, date, completion) VALUES (?, ?, ?)',
  )

  const demoData = [
    [0.6, 0.8, 1.0, 0.7, 0.9],
    [0.4, 0.6, 0.5, 0.8, 0.7],
    [0.3, 0.5, 0.7, 0.6, 1.0],
    [0.2, 0.4, 0.6, 0.5, 0.3],
    [0.5, 0.7, 0.4, 0.6, 0.8],
  ]

  const insertRecords = _db.transaction(() => {
    for (let idx = 0; idx < seeded.length; idx++) {
      const item = seeded[idx]
      const days = demoData[idx] || []
      for (let i = 0; i < days.length; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - (days.length - 1 - i))
        rStmt.run(item.id, d.toISOString().split('T')[0], days[i])
      }
    }
  })
  insertRecords()

  // slogans
  seedSlogans()
}

// ── 工具 ────────────────────────────────────────────────

function computeValue(id) {
  // ∑(completion × target_value / days)
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(r.completion * (i.target_value / i.days)), 0) AS val
       FROM daily_records r
       JOIN items i ON i.id = r.item_id
       WHERE r.item_id = ?`,
    )
    .get(id)
  return row.val
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function enrich(item) {
  const value = computeValue(item.id)
  const today = getTodayStr()
  const record = getDb()
    .prepare('SELECT completion FROM daily_records WHERE item_id = ? AND date = ?')
    .get(item.id, today)
  return {
    ...item,
    value: Math.round(value * 10000) / 10000,
    todayCompletion: record ? record.completion : 0,
  }
}

// ── CRUD ────────────────────────────────────────────────

function getAllItems() {
  return getDb()
    .prepare('SELECT * FROM items ORDER BY id ASC')
    .all()
    .map(enrich)
}

function getItemById(id) {
  const item = getDb().prepare('SELECT * FROM items WHERE id = ?').get(id)
  return item ? enrich(item) : null
}

function createItem({ name, days, target_value, color }) {
  const db = getDb()
  const info = db
    .prepare('INSERT INTO items (name, days, target_value, color) VALUES (?, ?, ?, ?)')
    .run(name, days, target_value, color)
  return getItemById(info.lastInsertRowid)
}

function updateItem(id, fields) {
  const db = getDb()
  const sets = []
  const vals = []

  for (const key of ['name', 'days', 'target_value', 'color']) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(fields[key])
    }
  }

  if (sets.length > 0) {
    vals.push(id)
    db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  }

  return getItemById(id)
}

function deleteItem(id) {
  getDb().prepare('DELETE FROM items WHERE id = ?').run(id)
}

function getNextColor() {
  const { cnt } = getDb().prepare('SELECT COUNT(*) AS cnt FROM items').get()
  return COLOR_PALETTE[cnt % COLOR_PALETTE.length]
}

// ── Slogans ────────────────────────────────────────────────

function getAllSlogans() {
  return getDb().prepare('SELECT * FROM slogans ORDER BY id ASC').all()
}

function createSlogan(content) {
  const db = getDb()
  const info = db.prepare('INSERT INTO slogans (content) VALUES (?)').run(content)
  return db.prepare('SELECT * FROM slogans WHERE id = ?').get(info.lastInsertRowid)
}

function deleteSlogan(id) {
  getDb().prepare('DELETE FROM slogans WHERE id = ?').run(id)
}

// ── Daily Records ───────────────────────────────────────

function setTodayCompletion(itemId, completion) {
  const today = getTodayStr()
  getDb()
    .prepare(
      `INSERT INTO daily_records (item_id, date, completion) VALUES (?, ?, ?)
       ON CONFLICT(item_id, date) DO UPDATE SET completion = excluded.completion`,
    )
    .run(itemId, today, completion)

  return getItemById(itemId)
}

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getNextColor,
  setTodayCompletion,
  getTodayStr,
  getAllSlogans,
  createSlogan,
  deleteSlogan,
}
