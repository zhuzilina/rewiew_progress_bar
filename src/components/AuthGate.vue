<template>
  <div class="auth-overlay">
    <div class="auth-card">
      <div class="auth-lock">🔒</div>
      <h1 class="auth-title gradient-text">🎯 考研目标分</h1>
      <p class="auth-desc">请输入访问密码</p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <input
          ref="pwInput"
          v-model="password"
          type="password"
          class="auth-input"
          placeholder="密码"
          autocomplete="current-password"
          :disabled="loading"
        />
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button type="submit" class="auth-btn" :disabled="loading || !password">
          {{ loading ? '🔓 验证中…' : '🔓 进入' }}
        </button>
      </form>

      <p class="auth-footer">Cookie 将保存 7 天，下次免输入</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { login } from '../api.js'

const emit = defineEmits(['login-success'])

const password = ref('')
const error = ref('')
const loading = ref(false)
const pwInput = ref(null)

onMounted(() => {
  pwInput.value?.focus()
})

async function handleSubmit() {
  if (!password.value) return
  loading.value = true
  error.value = ''

  try {
    await login(password.value)
    emit('login-success')
  } catch (e) {
    if (e.message && e.message.includes('密码错误')) {
      error.value = '密码错误，请重试 🙈'
    } else {
      error.value = '验证失败，请检查网络连接 ' + e.message
    }
    password.value = ''
    pwInput.value?.focus()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-overlay {
  position: fixed; inset: 0;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFF0E8 100%);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
  padding: 24px;
}

.auth-card {
  background: #FFF;
  border-radius: 28px;
  padding: 48px 40px 40px;
  width: 380px;
  max-width: 100%;
  text-align: center;
  box-shadow: 0 8px 40px rgba(160,120,100,0.15);
}

.auth-lock {
  font-size: 56px;
  margin-bottom: 8px;
}

.gradient-text {
  font-size: 32px;
  font-weight: 900;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #FF7B9C, #D47BC6, #A07FD9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.auth-desc {
  font-size: 16px;
  color: #B08878;
  font-weight: 600;
  margin-bottom: 32px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-input {
  width: 100%;
  padding: 14px 18px;
  font-size: 18px;
  font-family: inherit;
  background: #FFF8F0;
  border: 2px solid #F0E8DE;
  border-radius: 16px;
  color: #5D4037;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  text-align: center;
  letter-spacing: 4px;
}

.auth-input:focus {
  border-color: #FF7B9C;
  box-shadow: 0 0 0 4px rgba(255,123,156,0.12);
}

.auth-input::placeholder {
  letter-spacing: normal;
  color: #C4A99A;
}

.auth-error {
  font-size: 14px;
  color: #FF7B9C;
  font-weight: 600;
  margin: 0;
}

.auth-btn {
  width: 100%;
  padding: 14px;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  background: #FF7B9C;
  border: none;
  border-radius: 999px;
  color: #FFF;
  cursor: pointer;
  transition: all .2s;
  box-shadow: 0 4px 16px rgba(255,123,156,0.3);
  margin-top: 4px;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255,123,156,0.4);
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-footer {
  font-size: 12px;
  color: #C4A99A;
  margin-top: 24px;
  font-weight: 600;
}
</style>
