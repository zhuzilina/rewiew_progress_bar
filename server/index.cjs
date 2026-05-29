const express = require('express')
const db = require('./db.cjs')

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// ── Items ───────────────────────────────────────────────

app.get('/api/items', (_req, res) => {
  res.json(db.getAllItems())
})

app.post('/api/items', (req, res) => {
  const { name, days, target_value } = req.body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: '名称不能为空' })
  }
  const daysVal = Number(days)
  if (!Number.isFinite(daysVal) || daysVal < 1) {
    return res.status(400).json({ error: '天数必须 ≥ 1' })
  }
  const tv = Number(target_value)
  if (!Number.isFinite(tv) || tv <= 0) {
    return res.status(400).json({ error: '目标值必须 > 0' })
  }

  const color = db.getNextColor()
  const item = db.createItem({
    name: name.trim(),
    days: daysVal,
    target_value: tv,
    color,
  })
  res.status(201).json(item)
})

app.put('/api/items/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: '无效 ID' })
  }

  const existing = db.getItemById(id)
  if (!existing) {
    return res.status(404).json({ error: 'Item 不存在' })
  }

  const { name, days, target_value } = req.body
  const fields = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '名称不能为空' })
    }
    fields.name = name.trim()
  }
  if (days !== undefined) {
    const d = Number(days)
    if (!Number.isFinite(d) || d < 1) {
      return res.status(400).json({ error: '天数必须 ≥ 1' })
    }
    fields.days = d
  }
  if (target_value !== undefined) {
    const tv = Number(target_value)
    if (!Number.isFinite(tv) || tv <= 0) {
      return res.status(400).json({ error: '目标值必须 > 0' })
    }
    fields.target_value = tv
  }

  res.json(db.updateItem(id, fields))
})

app.delete('/api/items/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: '无效 ID' })
  }

  if (!db.getItemById(id)) {
    return res.status(404).json({ error: 'Item 不存在' })
  }

  db.deleteItem(id)
  res.json({ success: true })
})

// ── Today Completion ────────────────────────────────────

app.get('/api/items/:id/today', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: '无效 ID' })
  }

  const item = db.getItemById(id)
  if (!item) {
    return res.status(404).json({ error: 'Item 不存在' })
  }

  res.json({ itemId: id, date: db.getTodayStr(), completion: item.todayCompletion })
})

app.put('/api/items/:id/today', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: '无效 ID' })
  }

  const existing = db.getItemById(id)
  if (!existing) {
    return res.status(404).json({ error: 'Item 不存在' })
  }

  const { completion } = req.body
  const c = Number(completion)
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return res.status(400).json({ error: '完成度必须在 0 ~ 1 之间' })
  }

  res.json(db.setTodayCompletion(id, Math.round(c * 10000) / 10000))
})

// ── Slogans ──────────────────────────────────────────────

app.get('/api/slogans', (_req, res) => {
  res.json(db.getAllSlogans())
})

app.post('/api/slogans', (req, res) => {
  const { content } = req.body
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: '内容不能为空' })
  }
  res.status(201).json(db.createSlogan(content.trim()))
})

app.delete('/api/slogans/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: '无效 ID' })
  }
  db.deleteSlogan(id)
  res.json({ success: true })
})

// ── Error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`✓ API server running at http://localhost:${PORT}`)
})
