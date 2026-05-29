<template>
  <Transition name="fade">
    <div
      v-if="open"
      class="drawer-backdrop"
      @click="$emit('close')"
    ></div>
  </Transition>

  <Transition name="slide">
    <div v-if="open" class="drawer-panel">
      <div class="drawer-header">
        <h2 class="drawer-title">🌸 科目管理</h2>
        <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
      </div>

      <div class="drawer-body">
        <div
          v-for="item in items"
          :key="item.id"
          class="setting-row"
        >
          <span class="s-color-dot" :style="{ backgroundColor: item.color }"></span>

          <div class="s-fields">
            <input
              class="s-input s-name"
              :value="item.name"
              @change="emitUpdate(item.id, 'name', $event.target.value)"
              placeholder="科目名称"
            />
            <div class="s-meta-row">
              <label class="s-label">📅 备考天数 <input
                class="s-input s-num"
                type="number"
                min="1"
                :value="item.days"
                @change="emitUpdate(item.id, 'days', Number($event.target.value))"
              /></label>
              <label class="s-label">🎯 目标分数 <input
                class="s-input s-num s-target"
                type="number"
                min="0.0001"
                step="0.0001"
                :value="item.target_value"
                @change="emitUpdate(item.id, 'target_value', Number($event.target.value))"
              /></label>
              <span class="s-hint">已得 {{ item.value.toFixed(2) }}</span>
            </div>
          </div>

          <button
            class="s-delete-btn"
            @click="handleDelete(item.id)"
            title="删除"
          >🗑</button>
        </div>

        <button class="s-add-btn" @click="handleAdd">＋ 添加科目</button>

        <div class="drawer-divider"></div>
        <h3 class="section-title">💬 标语管理</h3>
        <p class="s-hint s-hint-slogan">主页标语将随机轮播展示</p>

        <div
          v-for="slogan in slogans"
          :key="slogan.id"
          class="slogan-row"
        >
          <span class="slogan-text">{{ slogan.content }}</span>
          <button
            class="s-delete-btn s-delete-slogan"
            @click="handleDeleteSlogan(slogan.id)"
            title="删除标语"
          >✕</button>
        </div>

        <button class="s-add-slogan-btn" @click="handleAddSlogan">＋ 添加标语</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, required: true },
  slogans: { type: Array, required: true },
  open: { type: Boolean, required: true },
})

const emit = defineEmits(['close', 'update-item', 'delete-item', 'add-item', 'add-slogan', 'delete-slogan'])

function emitUpdate(id, field, raw) {
  let val = raw
  if (field === 'days') {
    if (isNaN(val) || val < 1) val = 1
  }
  if (field === 'target_value') {
    if (isNaN(val) || val <= 0) val = 0.0001
  }
  if (val === '' || val === undefined) return
  emit('update-item', id, { [field]: val })
}

function handleDelete(id) {
  if (confirm('确定要删除这个科目吗？🥺')) {
    emit('delete-item', id)
  }
}

function handleAdd() {
  const name = prompt('输入科目名称：', '新科目')
  if (!name || name.trim().length === 0) return

  const days = parseInt(prompt('备考天数：', '365'), 10)
  if (!Number.isFinite(days) || days < 1) { alert('天数必须 ≥ 1'); return }

  const tv = parseFloat(prompt('目标分数：', '1000'))
  if (!Number.isFinite(tv) || tv <= 0) { alert('目标分数必须 > 0'); return }

  emit('add-item', name.trim(), days, tv)
}

function handleDeleteSlogan(id) {
  if (confirm('确定要删除这条标语吗？🥺')) {
    emit('delete-slogan', id)
  }
}

function handleAddSlogan() {
  const content = prompt('输入新标语内容：', '')
  if (!content || content.trim().length === 0) return
  emit('add-slogan', content.trim())
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(160,120,100,0.2);
  backdrop-filter: blur(3px);
  z-index: 100;
}
.drawer-panel {
  position: fixed; top: 0; right: 0;
  width: 420px; max-width: 100vw; height: 100vh;
  background: #FFF;
  border-left: 1px solid #F0E8DE;
  z-index: 101;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 32px rgba(160,120,100,0.12);
}
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 28px; border-bottom: 1px solid #F0E8DE; flex-shrink: 0;
}
.drawer-title { font-size: 20px; font-weight: 800; margin: 0; color: #5D4037; }
.close-btn {
  background: #FFF5F0; border: none; color: #B08878;
  width: 36px; height: 36px; border-radius: 999px; cursor: pointer;
  font-size: 18px; display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.close-btn:hover { background: #FF7B9C; color: #FFF; }
.drawer-body {
  flex: 1; overflow-y: auto; padding: 16px 28px 32px;
}
.drawer-body::-webkit-scrollbar { width: 4px; }
.drawer-body::-webkit-scrollbar-thumb { background: #F0E8DE; border-radius: 999px; }

.setting-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px 0; border-bottom: 1px solid #FFF0E8;
}
.setting-row:last-of-type { border-bottom: none; }
.s-color-dot {
  width: 16px; height: 16px; border-radius: 50%;
  flex-shrink: 0; margin-top: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.s-fields { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.s-input {
  background: #FFF8F0; border: 1.5px solid #F0E8DE; border-radius: 12px;
  color: #5D4037; padding: 8px 12px; font-size: 14px;
  outline: none; transition: border-color .2s, box-shadow .2s;
  font-family: inherit;
}
.s-input:focus {
  border-color: #FF7B9C;
  box-shadow: 0 0 0 3px rgba(255,123,156,0.12);
}
.s-name { width: 100%; font-weight: 600; }
.s-meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.s-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #B08878; font-weight: 600;
}
.s-num { width: 76px; text-align: center; }
.s-target { width: 100px; }
.s-hint { font-size: 11px; color: #C4A99A; white-space: nowrap; font-weight: 600; }
.s-delete-btn {
  background: transparent; border: none; color: #FFB5C2;
  cursor: pointer; font-size: 18px; padding: 8px 6px;
  border-radius: 999px; transition: all .2s;
  flex-shrink: 0; margin-top: 8px;
}
.s-delete-btn:hover { background: #FFF0F0; color: #FF7B9C; }
.drawer-divider {
  height: 1px;
  background: #F0E8DE;
  margin: 24px 0 16px;
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #5D4037;
  margin-bottom: 4px;
}
.s-hint-slogan {
  margin-bottom: 12px;
  display: block;
}
.slogan-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #FFF8F0;
  border-radius: 12px;
  margin-bottom: 8px;
}
.slogan-text {
  flex: 1;
  font-size: 14px;
  color: #5D4037;
  line-height: 1.4;
}
.s-delete-slogan {
  margin-top: 0;
  padding: 4px 6px;
  font-size: 14px;
}
.s-add-slogan-btn {
  width: 100%; margin-top: 8px; padding: 12px;
  background: #FFF5F0; border: 1.5px dashed #F0E8DE; border-radius: 999px;
  color: #B08878; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all .2s; font-family: inherit;
}
.s-add-slogan-btn:hover {
  background: #FF7B9C; border-color: #FF7B9C; color: #FFF;
}
.s-add-btn {
  width: 100%; margin-top: 18px; padding: 14px;
  background: linear-gradient(135deg, #FF7B9C, #D47BC6);
  border: none; border-radius: 999px;
  color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all .2s; font-family: inherit;
  box-shadow: 0 4px 16px rgba(255,123,156,0.25);
}
.s-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255,123,156,0.35);
}

.fade-enter-active, .fade-leave-active { transition: opacity .3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .3s cubic-bezier(0.4,0,0.2,1); }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
