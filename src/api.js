/**
 * @typedef {Object} Item
 * @property {number}  id
 * @property {string}  name
 * @property {number}  value              — 累计值 ∑(completion × target_value / days)
 * @property {number}  days               — 总天数
 * @property {number}  target_value       — 目标值（精确到小数点后 4 位）
 * @property {string}  color
 * @property {number}  todayCompletion     — 今日完成度 0~1
 */

const BASE = '/api'

/** 全局 401 回调，由 App.vue 注入 */
let _onUnauthorized = null
export function setOnUnauthorized(fn) {
  _onUnauthorized = fn
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    if (_onUnauthorized) _onUnauthorized()
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/** @returns {Promise<Item[]>} */
export function fetchItems() {
  return request('/items')
}

/**
 * @param {string} name
 * @param {number} days
 * @param {number} target_value
 * @returns {Promise<Item>}
 */
export function createItem(name, days, target_value) {
  return request('/items', {
    method: 'POST',
    body: JSON.stringify({ name, days, target_value }),
  })
}

/**
 * @param {number} id
 * @param {Partial<Item>} data
 * @returns {Promise<Item>}
 */
export function updateItem(id, data) {
  return request(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteItem(id) {
  await request(`/items/${id}`, { method: 'DELETE' })
}

/**
 * 设置某个 item 今天的完成度
 * @param {number} id
 * @param {number} completion — 0~1
 * @returns {Promise<Item>}
 */
export function setTodayCompletion(id, completion) {
  return request(`/items/${id}/today`, {
    method: 'PUT',
    body: JSON.stringify({ completion }),
  })
}

// ── Slogans ───────────────────────────────────────────────

/** @returns {Promise<{id:number, content:string}[]>} */
export function fetchSlogans() {
  return request('/slogans')
}

/**
 * @param {string} content
 * @returns {Promise<{id:number, content:string}>}
 */
export function createSlogan(content) {
  return request('/slogans', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteSlogan(id) {
  await request(`/slogans/${id}`, { method: 'DELETE' })
}

// ── Auth ──────────────────────────────────────────────────

/** 浏览器端 SHA-256 */
async function sha256(str) {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(str))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 检查当前是否已认证 */
export async function checkAuth() {
  const res = await fetch(`${BASE}/auth/check`, { credentials: 'include' })
  if (!res.ok) throw new Error('未认证')
  return res.json()
}

/** 获取服务器挑战码 */
export async function getChallenge() {
  const res = await fetch(`${BASE}/auth/challenge`)
  return res.json()
}

/**
 * 用密码登录
 * 1. 获取服务器 challenge
 * 2. 客户端 SHA-256 加密密码
 * 3. 组合 nonce 做二次 SHA-256 证明
 * 4. 服务器验证通过后设置 cookie
 */
export async function login(password) {
  // 获取挑战码
  const { challengeId, nonce } = await getChallenge()

  // 计算 proof: SHA-256(SHA-256(password) + nonce)
  const passwordHash = await sha256(password)
  const proof = await sha256(passwordHash + nonce)

  // 提交证明
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, proof }),
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || '密码错误')
  }

  return res.json()
}
