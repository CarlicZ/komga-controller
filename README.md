# 🎮 Gamepad Controller — 游戏手柄键盘映射

一个 Tampermonkey 油猴脚本，让你用游戏手柄控制任意网页。支持**自定义按键映射**、**多站点独立配置**、**预设一键切换**，配置通过悬浮窗管理，刷新后自动保留。

特别适合在 **Komga**、**Bilibili 漫画** 等阅读器上躺着用手柄翻页，也兼容 YouTube 等视频网站。

## 功能

- 🕹️ 完整的游戏手柄支持（Xbox / PlayStation / Switch Pro / 八位堂 XInput 等）
- 🎯 自定义按键映射：手柄任意按键 → 键盘任意按键
- 📦 预设系统：Komga 纵向阅读、Bilibili 漫画、YouTube 三套预设，一键切换
- 🌐 多站点独立配置：不同网站自动加载不同映射，互不干扰
- 📋 Profile 配置管理：同一网站可有多套配置（如「阅读模式」「浏览模式」）
- 🔌 站点启用管理：只在指定站点激活，非启用站点零干扰
- 🪟 悬浮配置面板（双 Tab）：
  - **映射配置** — 按键绑定、Profile 切换、导入导出
  - **站点管理** — 查看/添加/移除启用站点
- 🔔 Toast 通知：进入站点显示激活状态，手柄连接/断开实时提示
- 🎈 可拖拽悬浮球：拖到任意位置，刷新后位置不变
- 🔄 长按重复：按住手柄按键自动连发
- 🎚️ 摇杆死区可调：避免漂移误触
- ⌨️ Start + Select 长按 2 秒快速开关面板
- 🏷️ 中英文双语手柄标签

## 快速开始

### 1. 安装

**方式 A：直接安装（推荐）**

1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 打开 `dist/komga-controller.user.js`
3. Tampermonkey 会自动弹出安装提示，点击「安装」

**方式 B：从源码构建**

```bash
git clone https://github.com/carlicz/komga-controller.git
cd komga-controller
npm install
npm run build
# 产物在 dist/komga-controller.user.js
```

### 2. 使用

1. 连接手柄（Xbox / PlayStation / Switch Pro / 第三方均可）
2. 访问目标网页（Komga、YouTube、Bilibili 漫画）
3. 右下角出现 toast 通知 + 🎮 悬浮球，点击悬浮球打开配置面板
4. 首次访问自动加载推荐预设，开箱即用

### 3. 非启用站点如何开启？

默认只在这几个站点启用脚本：

- `127.0.0.1:25600` / `localhost:25600` / `localhost`
- `youtube.com`
- `manga.bilibili.com`

其他网站打开时不会有任何界面。如需启用，两种方式：

1. **Tampermonkey 菜单** → 点击「🎮 打开/关闭 手柄控制器」
2. 已启用站点的面板内 → **站点管理** Tab → 手动添加域名

### 4. 修改按键映射

1. 打开配置面板，切换到「映射配置」Tab
2. 找到要修改的行，点击 **[修改]**
3. 按键盘上你想映射的按键
4. 完成！按 `Esc` 取消

## 预设配置

### Komga 纵向阅读（默认）

| 手柄按键 | 映射键盘 | 用途 |
|----------|----------|------|
| 十字键 ↑ | ← | 上一页 |
| 十字键 ↓ | → | 下一页 |
| 十字键 ← / → | ← / → | 翻页 |
| Start | Home | 跳到首页 |
| Select | End | 跳到末尾 |
| LB | F | 全屏 |
| RB | D | 快捷操作 |
| Home / Guide | Esc | 退出 |

### Bilibili 漫画

| 手柄按键 | 映射键盘 | 用途 |
|----------|----------|------|
| 十字键 ↑↓←→ | 方向键 | 翻页/滚动 |
| LB | F11 | 全屏 |
| RB | C | 快捷操作 |

### YouTube

| 手柄按键 | 映射键盘 | 用途 |
|----------|----------|------|
| A | K | 播放/暂停 |
| B | F | 全屏 |
| X | M | 静音 |
| LB | J | 后退 10 秒 |
| RB | L | 前进 10 秒 |
| 十字键 ↑↓ | 方向键 | 音量 +/- |
| 十字键 ←→ | 方向键 | 快退/快进 |

> 💡 在面板底部点击「加载预设」可随时切换预设。

## 面板操作

| 操作 | 方式 |
|------|------|
| 打开/关闭面板 | Start + Select 长按 2 秒，或 Tampermonkey 菜单，或点击悬浮球 |
| 拖动悬浮球 | 按住拖拽，松手即保存位置 |
| 移动面板 | 拖拽标题栏 |
| 最小化面板 | 点击标题栏的 **─** |
| 修改按键映射 | 点击表格中的 **[修改]**，再按目标键盘按键 |
| 取消映射 | 点击 **[✕]** 按钮 |
| 切换预设 | 点击「加载预设」选择 |
| 新建 Profile | 点击 **+ 新增**，输入名称 |
| 切换 Profile | 在下拉菜单中选择 |
| 删除 Profile | 点击 **🗑**（至少保留一个） |
| 管理启用站点 | 切换到「站点管理」Tab |
| 还原默认 | 点击「还原默认」 |
| 导入/导出 | 点击「导出」（复制到剪贴板）/「导入」（粘贴） |
| 高级设置 | 点击「高级设置」（死区、阈值、长按重复） |

## 高级设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 死区 (Deadzone) | 0.15 | 摇杆中心盲区范围，避免漂移 |
| 轴激活阈值 | 0.5 | 摇杆推过此位置才触发按键 |
| 长按重复 | 启用 | 按住手柄按键是否连发 |
| 重复延迟 | 400ms | 按住多久后开始连发 |
| 重复速率 | 30Hz | 连发频率 |

## 支持的浏览器

- Chrome / Edge（Tampermonkey 或 Violentmonkey）
- Firefox（Tampermonkey 或 Greasemonkey）
- Safari（Tampermonkey）

## 项目结构

```
komga-controller/
├── src/
│   ├── index.js                  # 入口：主循环 + 站点管理 + 快捷键
│   ├── core/
│   │   ├── gamepad.js            # Gamepad API 轮询 + 状态 diff
│   │   ├── mapper.js             # 死区过滤 + 按键映射 + 按住追踪
│   │   ├── dispatcher.js         # 安全 KeyboardEvent 派发
│   │   └── storage.js            # GM_setValue 封装 + 全量 schema
│   ├── ui/
│   │   ├── panel.js              # 悬浮面板（双 Tab、拖拽、映射编辑）
│   │   ├── panel.css.js          # Catppuccin 暗色主题样式
│   │   ├── i18n.js               # 中英文手柄标签
│   │   └── keybindRecorder.js    # 按键捕获
│   └── config/
│       ├── defaults.js            # 按键查找表 + getSiteDefaults()
│       ├── README.md              # 配置说明
│       └── presets/
│           ├── index.js           # 预设注册表
│           ├── komga-reading.js   # Komga 纵向阅读预设
│           ├── bilibili-manga.js  # Bilibili 漫画预设
│           └── youtube.js         # YouTube 预设
├── scripts/build.mjs             # esbuild 构建脚本
├── dist/                         # 构建产物（gitignore）
├── CLAUDE.md                     # 开发设计文档
└── README.md                     # 本文档
```

## License

MIT
