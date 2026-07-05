/**
 * index.js — 入口模块
 *
 * - 站点启用检查：默认仅 127.0.0.1:25600 / youtube.com / manga.bilibili.com
 * - 非启用站点：零 DOM 注入，仅注册 GM 菜单入口
 * - 启用站点：完整初始化（面板 + 轮询 + 事件处理）
 */

import { GamepadReader } from './core/gamepad.js';
import { Mapper } from './core/mapper.js';
import { Dispatcher } from './core/dispatcher.js';
import { Storage } from './core/storage.js';
import { Panel, showToast } from './ui/panel.js';
import { getSiteDefaults } from './config/defaults.js';

// ── 全局实例 ──────────────────────────────────────────

const storage = new Storage();
const SITE = location.hostname || 'localhost';

let panel = null;
let reader = null;
let mapper = null;
let dispatcher = null;
let repeatTimers = null;
let fullInitialized = false;

// ── 手柄快捷键 (Start + Select 长按 2秒) ──────────────

const TOGGLE_BUTTONS = [8, 9];
const TOGGLE_HOLD_TIME = 2000;
let toggleHoldTimer = null;
let toggleWasBothPressed = false;

// ── GM 菜单注册 ───────────────────────────────────────

/**
 * 始终注册 GM 菜单。非启用站点只有"启用"入口；
 * 启用站点有"开关面板"和"禁用"入口。
 */
function registerGMMenu() {
  if (typeof GM_registerMenuCommand !== 'function') return;

  // 启用 / 开关键
  GM_registerMenuCommand('🎮 打开/关闭 手柄控制器', () => {
    if (!storage.isSiteEnabled(SITE)) {
      enableOnSite();
    } else if (panel) {
      panel.toggle();
    }
  });

  // 禁用
  GM_registerMenuCommand('🚫 在此站点禁用 手柄控制器', () => {
    if (storage.isSiteEnabled(SITE)) {
      disableOnSite();
    }
  });
}

// ── 站点启用 / 禁用 ───────────────────────────────────

function enableOnSite() {
  storage.addEnabledSite(SITE);
  if (!fullInitialized) {
    startFull();
  } else {
    // 已初始化但之前被禁用了，重新显示面板
    if (panel) panel.show();
  }
  console.log(`[gc] Enabled on: ${SITE}`);
}

function disableOnSite() {
  storage.removeEnabledSite(SITE);
  // 释放所有按住按键
  if (mapper) {
    const releases = mapper.releaseAll();
    if (dispatcher) {
      for (const action of releases) dispatcher.dispatch(action);
    }
  }
  if (repeatTimers) stopAllRepeats();
  // 销毁 UI
  if (panel) {
    panel.destroy();
    panel = null;
  }
  console.log(`[gc] Disabled on: ${SITE}`);
}

// ── 站点初始化 ────────────────────────────────────────

function initSiteIfNeeded() {
  const config = storage.getConfig();
  if (!config.mappings[SITE]) {
    storage.setMappings(SITE, '默认', getSiteDefaults(SITE));
    storage.setActiveProfile(SITE, '默认');
  }
}

// ── 完整启动 ──────────────────────────────────────────

function startFull() {
  if (fullInitialized) return;
  fullInitialized = true;

  reader = new GamepadReader();
  mapper = new Mapper(storage);
  dispatcher = new Dispatcher();
  repeatTimers = new Map();

  initSiteIfNeeded();

  // 手柄连接事件
  reader.onconnect((gp) => {
    console.log(`[gc] Gamepad connected: ${gp.id}`);
    if (panel) panel.updateConnectionStatus(true);
    showToast('🟢 手柄已连接', 2000);
  });

  reader.ondisconnect(() => {
    console.log('[gc] Gamepad disconnected');
    const releases = mapper.releaseAll();
    for (const action of releases) dispatcher.dispatch(action);
    stopAllRepeats();
    if (panel) panel.updateConnectionStatus(false);
    showToast('🔴 手柄已断开', 2000);
  });

  // 标签页隐藏 → 释放按键
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mapper) {
      const releases = mapper.releaseAll();
      for (const action of releases) dispatcher.dispatch(action);
      stopAllRepeats();
    }
  });

  // 启动 UI
  try {
    panel = new Panel({ storage, mapper, dispatcher, reader, site: SITE });
    panel.render();
    console.log('[gc] Panel rendered successfully');

    // 启动通知：不弹面板，只 toast
    const connected = reader.connected;
    showToast(
      `🎮 手柄控制器已激活 | ${connected ? '🟢 手柄已连接' : '⚪ 等待手柄连接…'}`,
      3000
    );
  } catch (e) {
    console.error('[gc] Failed to render panel:', e);
  }

  // 监听面板内"移除当前站点"事件
  window.addEventListener('gc-site-disabled', () => {
    disableOnSite();
  });

  // 启动轮询
  requestAnimationFrame(loop);

  console.log('[gc] Gamepad Controller initialized');
  console.log(`[gc] Site: ${SITE}, Profile: ${storage.getActiveProfile(SITE)}`);
}

// ── 主循环 ────────────────────────────────────────────

function loop() {
  checkToggleShortcut();

  if (reader && mapper && dispatcher) {
    const state = reader.poll();
    if (state) {
      const actions = mapper.process(state, SITE);
      for (const action of actions) {
        dispatcher.dispatch(action);
        handleRepeat(action);
      }
    }
  }
  requestAnimationFrame(loop);
}

// ── 手柄快捷键检测 ────────────────────────────────────

function checkToggleShortcut() {
  const gp = reader ? reader.gamepad : null;
  if (!gp) {
    if (toggleHoldTimer) { clearTimeout(toggleHoldTimer); toggleHoldTimer = null; }
    toggleWasBothPressed = false;
    return;
  }

  const bothPressed = TOGGLE_BUTTONS.every(i => gp.buttons[i]?.pressed);

  if (bothPressed && !toggleWasBothPressed) {
    toggleWasBothPressed = true;
    toggleHoldTimer = setTimeout(() => {
      if (panel) panel.toggle();
      toggleHoldTimer = null;
    }, TOGGLE_HOLD_TIME);
  } else if (!bothPressed && toggleWasBothPressed) {
    toggleWasBothPressed = false;
    if (toggleHoldTimer) { clearTimeout(toggleHoldTimer); toggleHoldTimer = null; }
  }
}

// ── Key Repeat ────────────────────────────────────────

function handleRepeat(action) {
  if (!repeatTimers) return;
  const { key, code, keyCode } = action;
  const repeatConfig = storage.getRepeatConfig();
  if (!repeatConfig.enabled) return;

  if (action.type === 'keydown') {
    if (repeatTimers.has(key)) return;
    const delayStart = setTimeout(() => {
      const intervalId = setInterval(() => {
        if (dispatcher) dispatcher.dispatchRepeat({ key, code, keyCode });
      }, 1000 / repeatConfig.rate);
      repeatTimers.set(key, intervalId);
    }, repeatConfig.delay);
    if (!repeatTimers.has('__delays')) repeatTimers.set('__delays', new Map());
    repeatTimers.get('__delays').set(key, delayStart);
  } else if (action.type === 'keyup') {
    const delays = repeatTimers.get('__delays');
    if (delays) { clearTimeout(delays.get(key)); delays.delete(key); }
    const intervalId = repeatTimers.get(key);
    if (intervalId) { clearInterval(intervalId); repeatTimers.delete(key); }
  }
}

function stopAllRepeats() {
  if (!repeatTimers) return;
  for (const [, intervalId] of repeatTimers) {
    if (typeof intervalId === 'number') clearInterval(intervalId);
  }
  const delays = repeatTimers.get('__delays');
  if (delays) { for (const [, tid] of delays) clearTimeout(tid); delays.clear(); }
  repeatTimers.clear();
}

// ── 入口 ──────────────────────────────────────────────

function main() {
  try {
    // 始终注册 GM 菜单（这是非启用站点的唯一入口）
    registerGMMenu();

    // 仅启用站点初始化完整功能
    if (storage.isSiteEnabled(SITE)) {
      console.log(`[gc] Site "${SITE}" is enabled, starting...`);
      startFull();
    } else {
      console.log(
        `[gc] Site "${SITE}" is NOT enabled. ` +
        `Use Tampermonkey menu → "🎮 打开/关闭 手柄控制器" to enable. ` +
        `Default enabled sites: ${storage.getDefaultEnabledSites().join(', ')}`
      );
    }
  } catch (e) {
    console.error('[gc] Initialization failed:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
