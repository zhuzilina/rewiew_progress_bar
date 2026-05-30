const express = require('express')
const path = require('path')
const fs = require('fs')
const db = require('./db.cjs')
const auth = require('./auth.cjs')

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// ── Serve built frontend (production) ──────────────────────
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  console.log(`✓ Serving static files from ${distPath}`)
}

// ── Auth ──────────────────────────────────────────────────
auth.initAuth()

app.get('/api/auth/challenge', (_req, res) => {
  res.json(auth.getChallenge())
})

app.post('/api/auth/login', (req, res) => {
  const { challengeId, proof } = req.body
  if (!challengeId || !proof) {
    return res.status(400).json({ error: '缺少 challengeId 或 proof' })
  }
  if (!auth.verifyProof(challengeId, proof)) {
    return res.status(401).json({ error: '密码错误' })
  }
  const token = auth.createSession()
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({ success: true })
})

app.get('/api/auth/check', (req, res) => {
  const rawCookie = req.headers.cookie || ''
  const cookies = Object.fromEntries(
    rawCookie.split(';').filter(Boolean).map((c) => {
      const i = c.indexOf('=')
      return [c.substring(0, i).trim(), c.substring(i + 1).trim()]
    }),
  )
  if (cookies.auth_token && auth.validateSession(cookies.auth_token)) {
    return res.json({ authenticated: true })
  }
  res.status(401).json({ authenticated: false })
})

// 保护所有 /api/* 路由（跳过 /api/auth/*）
app.use('/api', auth.authMiddleware)

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

// ── SPA fallback ───────────────────────────────────────────
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── Error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`✓ API server running at http://localhost:${PORT}`)
})
