const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const AUTH_FILE = path.join(__dirname, 'auth.json')
const CHALLENGE_TTL = 5 * 60 * 1000 // 5 分钟
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

/** @type {{ password_hash: string }} */
let config = null

// 一次性挑战码: challengeId → { nonce, createdAt }
const challenges = new Map()
// 会话令牌: sessionToken → { createdAt }
const sessions = new Map()

// 定期清理过期挑战码和会话
setInterval(() => {
  const now = Date.now()
  for (const [id, c] of challenges) if (now - c.createdAt > CHALLENGE_TTL) challenges.delete(id)
  for (const [t, s] of sessions) if (now - s.createdAt > SESSION_TTL) sessions.delete(t)
}, 60_000)

function initAuth() {
  if (!fs.existsSync(AUTH_FILE)) {
    const defaultPassword = '123456'
    const passwordHash = crypto.createHash('sha256').update(defaultPassword).digest('hex')
    config = { password_hash: passwordHash }
    fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2))
    console.log('========================================')
    console.log('⚠  已创建访问密码配置文件')
    console.log(`   文件: ${AUTH_FILE}`)
    console.log('   默认密码: 123456')
    console.log('   请及时修改密码并重启服务')
    console.log('========================================')
  } else {
    config = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
    if (!config.password_hash) {
      console.error('auth.json 缺少 password_hash 字段，请重新配置')
      process.exit(1)
    }
  }
}

/** 生成一次性挑战码 */
function getChallenge() {
  const id = crypto.randomBytes(16).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')
  challenges.set(id, { nonce, createdAt: Date.now() })
  return { challengeId: id, nonce }
}

/**
 * 验证客户端 proof
 * proof = SHA-256(stored_password_hash + nonce)
 */
function verifyProof(challengeId, proof) {
  const challenge = challenges.get(challengeId)
  if (!challenge) return false
  challenges.delete(challengeId) // 一次性使用

  const expected = crypto
    .createHash('sha256')
    .update(config.password_hash + challenge.nonce)
    .digest('hex')

  if (expected.length !== proof.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(proof, 'hex'))
  } catch {
    return false
  }
}

/** 创建 7 天有效的会话令牌 */
function createSession() {
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, { createdAt: Date.now() })
  return token
}

/** 验证会话令牌是否有效 */
function validateSession(token) {
  const session = sessions.get(token)
  if (!session) return false
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token)
    return false
  }
  return true
}

/** 简易 cookie 解析 */
function parseCookies(req) {
  const cookieStr = req.headers.cookie
  if (!cookieStr) return {}
  const cookies = {}
  cookieStr.split(';').forEach((c) => {
    const i = c.indexOf('=')
    if (i === -1) return
    const key = c.substring(0, i).trim()
    const val = c.substring(i + 1).trim()
    cookies[key] = val
  })
  return cookies
}

/** API 认证中间件（跳过 /api/auth/*） */
function authMiddleware(req, res, next) {
  // 跳过认证相关路径
  if (req.path.startsWith('/auth')) return next()

  const token = parseCookies(req).auth_token
  if (!token || !validateSession(token)) {
    return res.status(401).json({ error: '未授权，请登录' })
  }
  next()
}

module.exports = { initAuth, getChallenge, verifyProof, createSession, validateSession, authMiddleware }
