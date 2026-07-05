/**
 * defaults.js — 按键查找表、手柄标签、默认站点映射
 *
 * 预设配置见 src/config/presets/
 */

import { getRecommendedPresetId, getPreset } from './presets/index.js';

// ── 键盘按键 → keyCode/code 查找表 ────────────────────────
// key 值是 KeyboardEvent.key 的标准值
export const KEY_MAP = {};

// 构建 KEY_MAP
(function buildKeyMap() {
  const defs = [
    // 方向键
    ['ArrowLeft', 37, 'ArrowLeft'],
    ['ArrowUp', 38, 'ArrowUp'],
    ['ArrowRight', 39, 'ArrowRight'],
    ['ArrowDown', 40, 'ArrowDown'],

    // 功能键
    [' ', 32, 'Space'],
    ['Enter', 13, 'Enter'],
    ['Escape', 27, 'Escape'],
    ['Tab', 9, 'Tab'],
    ['Backspace', 8, 'Backspace'],
    ['Delete', 46, 'Delete'],
    ['Insert', 45, 'Insert'],
    ['Home', 36, 'Home'],
    ['End', 35, 'End'],
    ['PageUp', 33, 'PageUp'],
    ['PageDown', 34, 'PageDown'],
    ['CapsLock', 20, 'CapsLock'],
    ['NumLock', 144, 'NumLock'],
    ['ScrollLock', 145, 'ScrollLock'],
    ['Pause', 19, 'Pause'],
    ['ContextMenu', 93, 'ContextMenu'],

    // 修饰键 (通常不单独映射，但提供)
    ['Shift', 16, 'ShiftLeft'],
    ['Control', 17, 'ControlLeft'],
    ['Alt', 18, 'AltLeft'],
    ['Meta', 91, 'MetaLeft'],

    // Numpad
    ['NumPad0', 96, 'Numpad0'],
    ['NumPad1', 97, 'Numpad1'],
    ['NumPad2', 98, 'Numpad2'],
    ['NumPad3', 99, 'Numpad3'],
    ['NumPad4', 100, 'Numpad4'],
    ['NumPad5', 101, 'Numpad5'],
    ['NumPad6', 102, 'Numpad6'],
    ['NumPad7', 103, 'Numpad7'],
    ['NumPad8', 104, 'Numpad8'],
    ['NumPad9', 105, 'Numpad9'],
    ['NumPadAdd', 107, 'NumpadAdd'],
    ['NumPadSubtract', 109, 'NumpadSubtract'],
    ['NumPadMultiply', 106, 'NumpadMultiply'],
    ['NumPadDivide', 111, 'NumpadDivide'],
    ['NumPadDecimal', 110, 'NumpadDecimal'],
    ['NumPadEnter', 13, 'NumpadEnter'],

    // 符号
    [',', 188, 'Comma'],
    ['.', 190, 'Period'],
    ['/', 191, 'Slash'],
    [';', 186, 'Semicolon'],
    ["'", 222, 'Quote'],
    ['[', 219, 'BracketLeft'],
    [']', 221, 'BracketRight'],
    ['\\', 220, 'Backslash'],
    ['-', 189, 'Minus'],
    ['=', 187, 'Equal'],
    ['`', 192, 'Backquote'],
  ];

  // 字母 A-Z
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(65 + i);
    const lower = char.toLowerCase();
    defs.push([lower, 65 + i, `Key${char}`]);
    defs.push([char, 65 + i, `Key${char}`]);
  }

  // 数字 0-9
  for (let i = 0; i < 10; i++) {
    defs.push([String(i), 48 + i, `Digit${i}`]);
  }

  // F1-F12
  for (let i = 1; i <= 12; i++) {
    defs.push([`F${i}`, 111 + i, `F${i}`]);
  }

  for (const [key, keyCode, code] of defs) {
    KEY_MAP[key] = { keyCode, code };
  }
})();

/**
 * 根据 key 值查找对应的 keyCode 和 code
 * @param {string} key
 * @returns {{ keyCode: number, code: string }}
 */
export function lookupKey(key) {
  if (KEY_MAP[key]) return KEY_MAP[key];
  // 对于单字符按键，尝试作为 charCode
  if (key.length === 1) {
    const code = key.toUpperCase().charCodeAt(0);
    return { keyCode: code, code: `Key${key.toUpperCase()}` };
  }
  return { keyCode: 0, code: '' };
}

// ── 游戏手柄按钮中文标签 ────────────────────────────────

/** @type {string[]} */
export const BUTTON_LABELS_ZH = [
  'A (确认)',        // 0
  'B (返回)',        // 1
  'X',               // 2
  'Y',               // 3
  'LB (左肩键)',     // 4
  'RB (右肩键)',     // 5
  'LT (左扳机)',     // 6
  'RT (右扳机)',     // 7
  '选择 / Back',     // 8
  '开始 / Start',    // 9
  '左摇杆按下 (L3)', // 10
  '右摇杆按下 (R3)', // 11
  '十字键 ↑',        // 12
  '十字键 ↓',        // 13
  '十字键 ←',        // 14
  '十字键 →',        // 15
  'Guide / Home',    // 16
];

/** @type {string[]} */
export const BUTTON_LABELS_EN = [
  'A', 'B', 'X', 'Y',
  'LB', 'RB', 'LT', 'RT',
  'Select / Back', 'Start',
  'Left Stick (L3)', 'Right Stick (R3)',
  'D-Pad Up', 'D-Pad Down', 'D-Pad Left', 'D-Pad Right',
  'Guide / Home',
];

/** @type {Array<{ index: number, direction: 'negative'|'positive', labelZh: string, labelEn: string }>} */
export const AXIS_LABELS = [
  { index: 0, direction: 'negative', labelZh: '左摇杆 ←',  labelEn: 'Left Stick ←' },
  { index: 0, direction: 'positive', labelZh: '左摇杆 →',  labelEn: 'Left Stick →' },
  { index: 1, direction: 'negative', labelZh: '左摇杆 ↑',  labelEn: 'Left Stick ↑' },
  { index: 1, direction: 'positive', labelZh: '左摇杆 ↓',  labelEn: 'Left Stick ↓' },
  { index: 2, direction: 'negative', labelZh: '右摇杆 ←',  labelEn: 'Right Stick ←' },
  { index: 2, direction: 'positive', labelZh: '右摇杆 →',  labelEn: 'Right Stick →' },
  { index: 3, direction: 'negative', labelZh: '右摇杆 ↑',  labelEn: 'Right Stick ↑' },
  { index: 3, direction: 'positive', labelZh: '右摇杆 ↓',  labelEn: 'Right Stick ↓' },
];

// ── 按键显示名称 ─────────────────────────────────────────

const KEY_DISPLAY_MAP = {
  ' ': '空格 (Space)',
  'ArrowLeft': '← (ArrowLeft)',
  'ArrowUp': '↑ (ArrowUp)',
  'ArrowRight': '→ (ArrowRight)',
  'ArrowDown': '↓ (ArrowDown)',
  'Enter': '回车 (Enter)',
  'Escape': 'Esc',
  'Tab': 'Tab',
  'Backspace': '退格',
  'Delete': 'Delete',
  'PageUp': 'PageUp',
  'PageDown': 'PageDown',
  'Home': 'Home',
  'End': 'End',
};

/**
 * 返回按键的可读显示名称
 * @param {string} key
 * @returns {string}
 */
export function getKeyDisplayName(key) {
  if (!key) return '(未设置)';
  if (KEY_DISPLAY_MAP[key]) return KEY_DISPLAY_MAP[key];
  if (key.startsWith('Arrow')) return key.replace('Arrow', '') + ' 方向键';
  if (key.startsWith('NumPad')) return key.replace('NumPad', '小键盘 ');
  if (key.startsWith('F') && /^F\d+$/.test(key)) return key;
  if (key.length === 1) return key;
  return key;
}

// ── 默认站点映射 ─────────────────────────────────────────
// 预设定义见 src/config/presets/

/**
 * Komga 漫画阅读器默认映射（通用版）
 * @returns {Array<{ type: string, index: number, direction?: string, key: string }>}
 */
export function getKomgaDefaults() {
  return getKomgaReadingDefaults();
}

/**
 * Komga 纵向阅读模式预设
 * @returns {Array<{ type: string, index: number, direction?: string, key: string }>}
 */
export function getKomgaReadingDefaults() {
  const preset = getPreset('komga-reading');
  return preset ? JSON.parse(JSON.stringify(preset.mapping)) : [];
}

/**
 * YouTube 预设
 * @returns {Array<{ type: string, index: number, direction?: string, key: string }>}
 */
export function getYoutubeDefaults() {
  const preset = getPreset('youtube');
  return preset ? JSON.parse(JSON.stringify(preset.mapping)) : [];
}

/**
 * 根据站点返回推荐预设映射
 * @param {string} hostname
 * @returns {Array<{ type: string, index: number, direction?: string, key: string }>}
 */
export function getSiteDefaults(hostname) {
  const id = getRecommendedPresetId(hostname);
  const preset = getPreset(id);
  return preset ? JSON.parse(JSON.stringify(preset.mapping)) : [];
}
