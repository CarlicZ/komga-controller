# 🎮 Gamepad Controller — 游戏手柄键盘映射

一个 Tampermonkey 油猴脚本，让你用游戏手柄控制任意网页。支持**自定义按键映射**、**多站点独立配置**，配置通过悬浮窗管理，刷新后自动保留。

特别适合在 **Komga** 等漫画阅读器上躺着用手柄翻页，也兼容 YouTube 等视频网站。

## 功能

- 🕹️ 完整的游戏手柄支持（按钮 + 摇杆 + 十字键）
- 🎯 自定义按键映射：手柄任意按键 → 键盘任意按键
- 🌐 多站点独立配置：不同网站自动加载不同映射
- 📋 Profile 配置管理：同一网站可有多套配置（如「阅读模式」「浏览模式」）
- 🪟 悬浮配置面板：拖拽、最小化、一键改键
- 💾 配置持久化：刷新/重启浏览器不丢失
- 🔄 长按重复：按住手柄按键自动连发
- 🎚️ 摇杆死区可调：避免漂移误触
- 🏷️ 中英文双语手柄标签
- ⌨️ Start + Select 长按 2 秒快速开关面板

## 快速开始

### 1. 安装

**方式 A：直接安装（推荐）**

1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 打开 `dist/komga-controller.user.js`
3. Tampermonkey 会自动弹出安装提示，点击「安装」

**方式 B：从源码构建**

```bash
git clone <repo-url> komga-controller
cd komga-controller
npm install
npm run build
# 产物在 dist/komga-controller.user.js
```

### 2. 使用

1. 连接手柄（Xbox / PlayStation / Switch Pro / 第三方均可）
2. 访问目标网页（如 Komga、YouTube）
3. 右下角会出现 🎮 浮动按钮，点击打开配置面板
4. 首次访问自动加载默认映射，开箱即用

### 3. 修改按键映射

1. 打开配置面板
2. 找到要修改的行，点击 **[修改]**
3. 按键盘上你想映射的按键
4. 完成！按 `Esc` 取消

## 默认映射

### Komga 漫画阅读器

| 手柄按键 | 映射键盘 | 功能 |
|----------|----------|------|
| A | → (ArrowRight) | 下一页 |
| B | ← (ArrowLeft) | 上一页 |
| X | ↓ (ArrowDown) | 向下滚动 |
| Y | ↑ (ArrowUp) | 向上滚动 |
| RT | 空格 | 翻页 |
| Back / Select | Esc | 退出/返回 |
| Start | F | 全屏 |
| 十字键 ↑↓←→ | 方向键 | 滚动 |
| 左摇杆 | 方向键 | 滚动 |

### YouTube

| 手柄按键 | 映射键盘 | 功能 |
|----------|----------|------|
| A | K | 播放/暂停 |
| B | F | 全屏 |
| X | M | 静音 |
| LB | J | 后退 10 秒 |
| RB | L | 前进 10 秒 |
| 十字键 ← → | 方向键 | 快退/快进 |
| 十字键 ↑ ↓ | 方向键 | 音量+/音量- |

## 面板操作

| 操作 | 方式 |
|------|------|
| 打开/关闭面板 | Start + Select 长按 2 秒，或 Tampermonkey 菜单 |
| 移动面板 | 拖拽标题栏 |
| 最小化面板 | 点击标题栏的 **─** |
| 修改按键映射 | 点击表格中的 **[修改]**，再按目标键盘按键 |
| 取消映射 | 点击 **[✕]** 按钮 |
| 新建配置 | 点击 **+ 新增**，输入名称 |
| 切换配置 | 在下拉菜单中选择 |
| 删除配置 | 点击 **🗑**（至少保留一个） |
| 还原默认 | 点击 **还原默认** |
| 导入/导出 | 点击 **导出**（复制到剪贴板）/ **导入**（粘贴） |
| 高级设置 | 点击 **高级设置**（死区、阈值、长按重复） |

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
│   ├── index.js              # 入口：主循环 + 快捷键
│   ├── core/
│   │   ├── gamepad.js        # Gamepad API 轮询
│   │   ├── mapper.js         # 按键映射引擎
│   │   ├── dispatcher.js     # 键盘事件派发
│   │   └── storage.js        # 配置持久化
│   ├── ui/
│   │   ├── panel.js          # 悬浮配置面板
│   │   ├── panel.css.js      # 面板样式
│   │   ├── i18n.js           # 中英文标签
│   │   └── keybindRecorder.js # 按键捕获
│   └── config/
│       └── defaults.js       # 默认映射 + 按键表
├── scripts/build.mjs         # esbuild 构建脚本
├── dist/                     # 构建产物
├── CLAUDE.md                 # 开发设计文档
└── README.md                 # 本文档
```

## License

MIT
