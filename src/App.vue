<template>
  <div class="app-container">
    <AuthGate v-if="showAuthGate" @login-success="handleLoginSuccess" />

    <template v-else>
      <button class="settings-btn" @click="settingsOpen = true" title="设置">⚙️</button>

      <div class="container">
        <h1 class="gradient-title">🎯 考研目标分</h1>
        <p class="subtitle">{{ currentSlogan }}</p>

        <!-- ── 大进度条 ── -->
        <div v-if="loaded" class="total-section">
          <div class="total-header">
            <span class="total-label">📚 总复习进度</span>
            <span class="total-value">
              {{ total.toFixed(2) }} / {{ totalTarget.toFixed(2) }}（{{ totalPercent }}%）
            </span>
          </div>

          <div class="progress-track total-track">
            <div class="progress-fill total-fill" :style="{ width: totalPercent + '%' }">
              <span v-if="totalPercent > 6" class="fill-text">{{ totalPercent }}%</span>
            </div>
          </div>

          <!-- 叠加微缩条 -->
          <div class="stacked-track">
            <div
              v-for="item in itemsWithPct"
              :key="item.id"
              class="stacked-segment"
              :style="{ width: (item.value / totalTarget) * 100 + '%', backgroundColor: item.color }"
              :title="`${item.name}: ${item.value.toFixed(2)}/${item.target_value.toFixed(2)} (${item.pct}%)`"
            ></div>
            <div
              v-if="totalTarget - total > 0.005"
              class="stacked-empty"
              :style="{ width: ((totalTarget - total) / totalTarget) * 100 + '%' }"
              title="剩余"
            ></div>
          </div>
        </div>

        <div v-else class="loading"><p>加载中… 💪</p></div>

        <!-- ── 子进度条 ── -->
        <div class="sub-items" v-if="loaded">
          <div v-for="item in itemsWithPct" :key="item.id" class="item-card">
            <div class="item-info">
              <span class="color-dot" :style="{ backgroundColor: item.color }"></span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-stat">
                累计 {{ item.value.toFixed(2) }} / {{ item.target_value.toFixed(2) }}（{{ item.pct }}%）
                · {{ item.days }} 天
              </span>
            </div>

            <div class="progress-track sub-track">
              <div
                class="progress-fill sub-fill"
                :style="{ width: item.pct + '%', backgroundColor: item.color }"
              >
                <span v-if="item.pct > 8" class="fill-text sub-fill-text">{{ item.pct }}%</span>
              </div>
            </div>

            <div class="today-row">
              <span class="today-label">📝 今日完成</span>
              <span class="today-value">{{ Math.round(item.todayCompletion * 100) }}%</span>
              <button class="cute-btn" @click="adjust(item.id, -10)">−10%</button>
              <button class="cute-btn" @click="adjust(item.id, -1)">−1%</button>
              <input
                type="range" min="0" max="100"
                :value="Math.round(item.todayCompletion * 100)"
                @input="setLocalToday(item.id, Number($event.target.value))"
                @change="commitTodaySlider(item.id, Number($event.target.value))"
                class="slider"
              />
              <button class="cute-btn" @click="adjust(item.id, 1)">+1%</button>
              <button class="cute-btn" @click="adjust(item.id, 10)">+10%</button>
            </div>
          </div>
        </div>

        <div class="actions" v-if="loaded">
          <button class="cute-btn reset-btn" @click="reset">🔄 重置今日进度</button>
        </div>
      </div>

      <SettingsDrawer
        :items="items"
        :slogans="slogans"
        :open="settingsOpen"
        @close="settingsOpen = false"
        @update-item="handleUpdateItem"
        @delete-item="handleDeleteItem"
        @add-item="handleAddItem"
        @add-slogan="handleAddSlogan"
        @delete-slogan="handleDeleteSlogan"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { fetchItems, createItem, updateItem, deleteItem, setTodayCompletion, fetchSlogans, createSlogan, deleteSlogan, checkAuth, setOnUnauthorized } from './api.js'
import SettingsDrawer from './components/SettingsDrawer.vue'
import AuthGate from './components/AuthGate.vue'

const items = ref([])
const slogans = ref([])
const currentSlogan = ref('')
const loaded = ref(false)
const settingsOpen = ref(false)
const showAuthGate = ref(true)

onMounted(async () => {
  // 注册 401 全局回调：会话过期时回到登录页
  setOnUnauthorized(() => {
    showAuthGate.value = true
    loaded.value = false
  })

  // 先检查认证状态
  try {
    await checkAuth()
    showAuthGate.value = false
  } catch {
    loaded.value = true
    return
  }

  // 已认证，加载数据
  try {
    const [fetchedItems, fetchedSlogans] = await Promise.all([
      fetchItems(),
      fetchSlogans(),
    ])
    items.value = fetchedItems
    slogans.value = fetchedSlogans
    pickRandomSlogan()
  } catch (e) {
    console.error('加载失败:', e)
    currentSlogan.value = '每天进步一点点，稳稳上岸 ✨'
  } finally {
    loaded.value = true
  }
})

function handleLoginSuccess() {
  showAuthGate.value = false
  loaded.value = false
  Promise.all([fetchItems(), fetchSlogans()])
    .then(([fetchedItems, fetchedSlogans]) => {
      items.value = fetchedItems
      slogans.value = fetchedSlogans
      pickRandomSlogan()
    })
    .catch((e) => console.error('加载失败:', e))
    .finally(() => { loaded.value = true })
}

function pickRandomSlogan() {
  if (slogans.value.length === 0) {
    currentSlogan.value = '每天进步一点点，稳稳上岸 ✨'
  } else {
    const idx = Math.floor(Math.random() * slogans.value.length)
    currentSlogan.value = slogans.value[idx].content
  }
}

// ── 计算 ──

const total = computed(() =>
  items.value.reduce((s, i) => s + i.value, 0),
)
const totalTarget = computed(() =>
  items.value.reduce((s, i) => s + i.target_value, 0),
)
const totalPercent = computed(() =>
  totalTarget.value > 0
    ? Math.min(Math.round((total.value / totalTarget.value) * 100), 100)
    : 0,
)

const itemsWithPct = computed(() =>
  items.value.map((i) => ({
    ...i,
    pct: i.target_value > 0
      ? Math.min(Math.round((i.value / i.target_value) * 100), 100)
      : 0,
  })),
)

// ── 今日完成度 ──

function adjust(id, deltaPct) {
  const item = items.value.find((i) => i.id === id)
  if (!item) return
  const newVal = Math.max(0, Math.min(1, item.todayCompletion + deltaPct / 100))
  commitToday(id, newVal)
}

// 拖动滑块时只更新本地显示，不触发 API
function setLocalToday(id, sliderVal) {
  const completion = Math.max(0, Math.min(1, sliderVal / 100))
  const item = items.value.find((i) => i.id === id)
  if (!item) return
  item.todayCompletion = completion
}

// 松开鼠标时才提交 API
function commitTodaySlider(id, sliderVal) {
  commitToday(id, Math.max(0, Math.min(1, sliderVal / 100)))
}

function commitToday(id, completion) {
  const item = items.value.find((i) => i.id === id)
  if (!item) return
  item.todayCompletion = completion
  setTodayCompletion(id, completion)
    .then((updated) => {
      const idx = items.value.findIndex((i) => i.id === id)
      if (idx !== -1) Object.assign(items.value[idx], updated)
    })
    .catch((e) => console.error('保存失败:', e))
}

function reset() {
  for (const item of items.value) {
    item.todayCompletion = 0
    setTodayCompletion(item.id, 0)
      .then((updated) => {
        const idx = items.value.findIndex((i) => i.id === item.id)
        if (idx !== -1) Object.assign(items.value[idx], updated)
      })
      .catch((e) => console.error('保存失败:', e))
  }
}

// ── 抽屉操作 ──

async function handleUpdateItem(id, data) {
  try {
    const updated = await updateItem(id, data)
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) Object.assign(items.value[idx], updated)
  } catch (e) {
    console.error('更新失败:', e)
    alert('更新失败: ' + e.message)
  }
}

async function handleDeleteItem(id) {
  try {
    await deleteItem(id)
    items.value = items.value.filter((i) => i.id !== id)
  } catch (e) {
    console.error('删除失败:', e)
    alert('删除失败: ' + e.message)
  }
}

async function handleAddItem(name, days, target_value) {
  try {
    const item = await createItem(name, days, target_value)
    items.value.push(item)
  } catch (e) {
    console.error('添加失败:', e)
    alert('添加失败: ' + e.message)
  }
}

async function handleAddSlogan(content) {
  try {
    const s = await createSlogan(content)
    slogans.value.push(s)
    pickRandomSlogan()
  } catch (e) {
    console.error('添加标语失败:', e)
    alert('添加标语失败: ' + e.message)
  }
}

async function handleDeleteSlogan(id) {
  try {
    await deleteSlogan(id)
    slogans.value = slogans.value.filter((s) => s.id !== id)
    pickRandomSlogan()
  } catch (e) {
    console.error('删除标语失败:', e)
    alert('删除标语失败: ' + e.message)
  }
}
</script>

<style>
@font-face {
  font-family: 'LeMiXiaoNaiPao';
  src: url('/fonts/lemixiaonaipao.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'LeMiXiaoNaiPao', 'Nunito', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFF0E8 100%);
  color: #5D4037;
  min-height: 100vh;
}
.app-container { position:relative; min-height:100vh; }
.container { max-width:800px; margin:0 auto; padding:48px 24px 80px; }

.gradient-title {
  font-size: 51px;
  font-weight: 900;
  text-align: center;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #FF7B9C, #D47BC6, #A07FD9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}
.subtitle {
  text-align: center;
  color: #B08878;
  font-size: 23px;
  font-weight: 600;
  margin-bottom: 44px;
}

.settings-btn {
  position:fixed; top:18px; right:18px; z-index:50;
  background:#FFF; border:none; border-radius:999px;
  width:44px; height:44px; font-size: 33px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 2px 12px rgba(160,120,100,0.12);
  transition: transform .2s, box-shadow .2s;
}
.settings-btn:hover {
  transform: scale(1.1) rotate(30deg);
  box-shadow: 0 4px 20px rgba(160,120,100,0.18);
}
.loading { text-align:center; color:#B08878; padding:80px 0; font-size: 24px; font-weight:600; }

.total-section { margin-bottom:48px; }
.total-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.total-label { font-size: 30px; font-weight:800; color:#5D4037; }
.total-value { font-size: 23px; font-weight:800; color:#FF7B9C; }

.progress-track { width:100%; background:#F0E8DE; border-radius:999px; overflow:hidden; }
.total-track { height:48px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); }
.progress-fill {
  height:100%; border-radius:999px;
  transition: width .5s cubic-bezier(0.34,1.56,0.64,1);
  display:flex; align-items:center; justify-content:flex-end; padding-right:16px;
}
.total-fill {
  background:#FF7B9C!important;
  min-width:0;
}
.fill-text { font-size: 23px; font-weight:900; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.2); }

.stacked-track {
  height:10px; width:100%; background:#F0E8DE; border-radius:999px;
  overflow:hidden; display:flex; margin-top:10px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}
.stacked-segment { height:100%; transition:width .45s ease; }
.stacked-empty { height:100%; background:transparent; }

.sub-items { display:flex; flex-direction:column; gap:18px; }
.item-card {
  background:#FFF; border-radius:20px; padding:20px 24px;
  box-shadow: 0 2px 16px rgba(160,120,100,0.08);
  transition: box-shadow .2s, transform .2s;
}
.item-card:hover {
  box-shadow: 0 6px 28px rgba(160,120,100,0.12);
  transform: translateY(-2px);
}
.item-info { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
.color-dot {
  width:14px; height:14px; border-radius:50%; flex-shrink:0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
.item-name { font-weight:700; font-size: 24px; color:#5D4037; }
.item-stat { margin-left:auto; font-size: 20px; color:#B08878; white-space:nowrap; font-weight:600; }

.sub-track { height:20px; margin-bottom:14px; }
.sub-fill { min-width:0; }
.sub-fill-text { font-size: 17px; font-weight:800; padding-right:10px; }

.today-row {
  display:flex; align-items:center; gap:8px;
  background:#FFF5F0; border-radius:999px; padding:6px 14px;
}
.today-label { font-size: 18px; color:#B08878; white-space:nowrap; font-weight:700; }
.today-value {
  font-size: 24px; font-weight:900; color:#FF7B9C;
  min-width:38px; text-align:center;
}
.cute-btn {
  background:#FFF; border:1.5px solid #F0E8DE; color:#B08878; padding:4px 14px;
  border-radius:999px; cursor:pointer; font-size: 18px; font-weight:700;
  transition: all .15s; white-space:nowrap;
  font-family: inherit;
}
.cute-btn:hover {
  background:#FF7B9C; border-color:#FF7B9C; color:#FFF;
}
.slider {
  flex:1; min-width:60px; height:6px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
}
.slider::-webkit-slider-runnable-track {
  height: 6px;
  background: #F5DED8;
  border-radius: 999px;
}
.slider::-moz-range-track {
  height: 6px;
  background: #F5DED8;
  border-radius: 999px;
  border: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #FF7B9C;
  border-radius: 50%;
  margin-top: -7px;
  box-shadow: 0 2px 6px rgba(255,123,156,0.35);
  cursor: pointer;
  transition: transform .15s;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #FF7B9C;
  border-radius: 50%;
  border: none;
  box-shadow: 0 2px 6px rgba(255,123,156,0.35);
  cursor: pointer;
}
.actions { text-align:center; margin-top:36px; }
.reset-btn {
  padding:10px 28px; font-size: 21px;
  background:#FFF; border:2px solid #F0E8DE;
  border-radius:999px; color:#B08878; font-weight:700;
  transition: all .2s;
  font-family: inherit;
  cursor: pointer;
}
.reset-btn:hover {
  background:#FF7B9C; border-color:#FF7B9C; color:#FFF;
}
</style>
