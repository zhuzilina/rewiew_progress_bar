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

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
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
