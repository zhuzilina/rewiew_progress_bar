# 🎯 考研目标分追踪

每天进步一点点，稳稳上岸 ✨

每日进度累积 → 目标值，支持 SQLite 持久化存储。

---

## 核心概念

每个科目有 **备考天数** 和 **目标分数** 两个维度：

| 字段 | 说明 |
| ---- | ---- |
| `days` | 备考总天数 |
| `target_value` | 目标分数（精确到小数点后 4 位） |
| `completion` | 今日完成度 0~1（滑块控制） |

### 累加公式

```text
每日速率   = target_value / days
当日贡献   = completion × 速率
累计值      = ∑ 所有当日贡献
科目进度    = 累计值 / target_value × 100%
整体进度    = ∑ 累计值 / ∑ target_value × 100%
```

例如：目标分 10000、备考 365 天 → 每日满额贡献约 **27.40**。
今日完成 60% → 贡献 `0.6 × 27.40 ≈ 16.44` 到累计值。

---

## 🎨 可爱风格

- **配色**：马卡龙冰淇淋色系（粉、蓝、绿、紫、黄），奶油白基底
- **字体**：Nunito（英文字号）+ 圆角中文字体
- **圆角**：大圆角卡片（20px）+ 胶囊按钮（999px）
- **阴影**：柔和阴影，Q 弹微立体感

---

## 效果预览

```text
⚙️

🎯 考研目标分

📚 总复习进度                    123.45 / 35000.00（0.35%）
██████████████████████████████████████████████████████

🌸───────────────────────────────────────────────────🌸

📝 今日完成  60%  [−10%] [−1%] ═══⊙═══ [+1%] [+10%]
```

---

## 功能

- **大进度条** — 所有科目的累计得分之和 / 目标分数之和
- **叠加微缩条** — 各科目颜色分段，宽度 = 累计值 / 总分目标
- **子进度条** — 每个科目独立显示累计值、目标分数、百分比
- **今日完成度拖拽** — 滑块 0~100%，按钮微调 ±1% / ±10%
- **🌸 科目管理抽屉** — 编辑名称、备考天数、目标分数（`step="0.0001"`）
- **💬 自定义标语** — 支持多条标语，每页随机展示，可在设置中增删
- **SQLite 持久化** — `items` + `daily_records` + `slogans` 三表存储

---

## 技术栈

| 层 | 技术 |
| --- | ------- |
| 前端 | Vue 3 (Composition API) |
| 构建 | Vite |
| 后端 | Express |
| 数据库 | better-sqlite3 |

## 运行

```bash
npm install
npm run dev    # Vite :8080 + Express :3001
```

## 项目结构

```text
server/
├── db.cjs      # SQLite 建表、种子、CRUD
└── index.cjs   # Express API

src/
├── api.js                # fetch 封装
├── App.vue               # 主页面
└── components/
    └── SettingsDrawer.vue # 科目管理抽屉
```

## API

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| `GET` | `/api/items` | 所有科目（含 `value`、`todayCompletion`） |
| `POST` | `/api/items` | 新建 `{name, days, target_value}` |
| `PUT` | `/api/items/:id` | 更新 `{name?, days?, target_value?}` |
| `DELETE` | `/api/items/:id` | 删除 |
| `PUT` | `/api/items/:id/today` | 设置今日完成度 `{completion: 0~1}` |
| `GET` | `/api/slogans` | 所有标语 |
| `POST` | `/api/slogans` | 新建 `{content}` |
| `DELETE` | `/api/slogans/:id` | 删除 |

## 数据库

```sql
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
```
