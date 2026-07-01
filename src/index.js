/**
 * index.js — 入口模块
 *
 * 串联 GamepadReader → Mapper → Dispatcher 数据管道
 * 处理 visibility / connect / disconnect 事件
 * 启动悬浮窗 UI
 */

import { GamepadReader } from './core/gamepad.js';
import { Mapper } from './core/mapper.js';
import { Dispatcher } from './core/dispatcher.js';
import { Storage } from './core/storage.js';
import { Panel } from './ui/panel.js';
import { getSiteDefaults } from './config/defaults.js';

// ── 初始化 ──────────────────────────────────────────────

const storage = new Storage();
const reader = new GamepadReader();
const mapper = new Mapper(storage);
const dispatcher = new Dispatcher();

let panel = null;
let repeatTimers = new Map(); // key -> intervalId

const SITE = location.hostname || 'localhost';

// ── 手柄快捷键 (Start + Select 长按 2秒 开关面板) ───────

const TOGGLE_BUTTONS = [8, 9]; // Select (8) + Start (9)
const TOGGLE_HOLD_TIME = 2000; // ms
let toggleHoldTimer = null;
let toggleWasBothPressed = false;

// ── 站点初始化 ──────────────────────────────────────────

function initSiteIfNeeded() {
  const config = storage.getConfig();
  if (!config.mappings[SITE]) {
    storage.setMappings(SITE, '默认', getSiteDefaults(SITE));
    storage.setActiveProfile(SITE, '默认');
  }
}

// ── 主循环 ──────────────────────────────────────────────

function loop() {
  // 检查手柄快捷键 (Start + Select 长按)
  checkToggleShortcut();

  const state = reader.poll();
  if (state) {
    const actions = mapper.process(state, SITE);
    for (const action of actions) {
      dispatcher.dispatch(action);

      // 处理长按重复
      handleRepeat(action);
    }
  }
  requestAnimationFrame(loop);
}

// ── 手柄快捷键检测 ──────────────────────────────────────

function checkToggleShortcut() {
  const gp = reader.gamepad;
  if (!gp) {
    if (toggleHoldTimer) {
      clearTimeout(toggleHoldTimer);
      toggleHoldTimer = null;
    }
    toggleWasBothPressed = false;
    return;
  }

  const bothPressed = TOGGLE_BUTTONS.every(i => gp.buttons[i]?.pressed);

  if (bothPressed && !toggleWasBothPressed) {
    // 开始计时
    toggleWasBothPressed = true;
    toggleHoldTimer = setTimeout(() => {
      if (panel) panel.toggle();
      toggleHoldTimer = null;
    }, TOGGLE_HOLD_TIME);
  } else if (!bothPressed && toggleWasBothPressed) {
    // 提前松开，取消
    toggleWasBothPressed = false;
    if (toggleHoldTimer) {
      clearTimeout(toggleHoldTimer);
      toggleHoldTimer = null;
    }
  }
}

// ── Key Repeat ──────────────────────────────────────────

function handleRepeat(action) {
  const { key, code, keyCode } = action;
  const repeatConfig = storage.getRepeatConfig();
  if (!repeatConfig.enabled) return;

  if (action.type === 'keydown') {
    if (repeatTimers.has(key)) return; // 已在重复
    const delayStart = setTimeout(() => {
      const intervalId = setInterval(() => {
        dispatcher.dispatchRepeat({ key, code, keyCode });
      }, 1000 / repeatConfig.rate);
      repeatTimers.set(key, intervalId);
    }, repeatConfig.delay);
    // 存储 delay timer，在 keyup 时清理
    if (!repeatTimers.has('__delays')) repeatTimers.set('__delays', new Map());
    repeatTimers.get('__delays').set(key, delayStart);
  } else if (action.type === 'keyup') {
    // 清理 delay
    const delays = repeatTimers.get('__delays');
    if (delays) {
      clearTimeout(delays.get(key));
      delays.delete(key);
    }
    // 清理 interval
    const intervalId = repeatTimers.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      repeatTimers.delete(key);
    }
  }
}

function stopAllRepeats() {
  for (const [, intervalId] of repeatTimers) {
    if (typeof intervalId === 'number') clearInterval(intervalId);
  }
  const delays = repeatTimers.get('__delays');
  if (delays) {
    for (const [, tid] of delays) clearTimeout(tid);
    delays.clear();
  }
  repeatTimers.clear();
}

// ── 连接 / 断开 ─────────────────────────────────────────

reader.onconnect((gp) => {
  console.log(`[gc] Gamepad connected: ${gp.id}`);
  if (panel) panel.updateConnectionStatus(true);
});

reader.ondisconnect(() => {
  console.log('[gc] Gamepad disconnected');
  // 释放所有按住按键
  const releases = mapper.releaseAll();
  for (const action of releases) {
    dispatcher.dispatch(action);
  }
  stopAllRepeats();
  if (panel) panel.updateConnectionStatus(false);
});

// ── 标签页可见性 ────────────────────────────────────────

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const releases = mapper.releaseAll();
    for (const action of releases) {
      dispatcher.dispatch(action);
    }
    stopAllRepeats();
  }
});

// ── 启动 ────────────────────────────────────────────────

function main() {
  initSiteIfNeeded();

  // 启动 UI
  panel = new Panel({ storage, mapper, dispatcher, reader, site: SITE });
  panel.render();

  // 注册 Tampermonkey 菜单
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('打开/关闭 手柄控制器', () => {
      panel.toggle();
    });
  }

  // 启动轮询
  requestAnimationFrame(loop);

  console.log('[gc] Gamepad Controller initialized');
  console.log(`[gc] Site: ${SITE}, Profile: ${storage.getActiveProfile(SITE)}`);
}

// ── 运行 ────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
