/**
 * mapper.js — 死区过滤 + 输入→按键映射 + 按住状态追踪
 *
 * - 对摇杆轴应用死区和激活阈值
 * - 查 storage 中当前站点+profile 的映射配置
 * - 引用计数追踪：多个手柄输入映射到同一个键时，只有全部释放才发送 keyup
 */

// ── Key Tracker (引用计数) ───────────────────────────────

class KeyTracker {
  constructor() {
    /** @type {Map<string, Set<string>>} key -> Set of inputIds */
    this._held = new Map();
  }

  /**
   * 按下一个输入。返回该键是否首次被按下。
   * @param {string} inputId — 如 "button:3", "axis:0+"
   * @param {string} key — 键盘 key 值
   * @returns {boolean} true 表示这是该 key 的首次按下，应发送 keydown
   */
  press(inputId, key) {
    if (!this._held.has(key)) {
      this._held.set(key, new Set());
    }
    const set = this._held.get(key);
    const wasEmpty = set.size === 0;
    set.add(inputId);
    return wasEmpty;
  }

  /**
   * 释放一个输入。返回该键是否应该释放。
   * @param {string} inputId
   * @param {string} key
   * @returns {boolean} true 表示该 key 的所有输入都已释放，应发送 keyup
   */
  release(inputId, key) {
    const set = this._held.get(key);
    if (!set) return false;
    set.delete(inputId);
    if (set.size === 0) {
      this._held.delete(key);
      return true;
    }
    return false;
  }

  /**
   * 释放所有按键（手柄断开、切标签页时调用）
   * @returns {string[]} 所有需要释放的 key
   */
  releaseAll() {
    const keys = [...this._held.keys()];
    this._held.clear();
    return keys;
  }

  /** key 是否有任何输入在按住 */
  isHeld(key) {
    const set = this._held.get(key);
    return set ? set.size > 0 : false;
  }
}

import { lookupKey } from '../config/defaults.js';

// ── Mapper ──────────────────────────────────────────────

export class Mapper {
  /**
   * @param {import('./storage.js').Storage} storage
   */
  constructor(storage) {
    this._storage = storage;
    this._tracker = new KeyTracker();
  }

  /**
   * 处理一帧的手柄状态，返回需要派发的键盘动作。
   * @param {{ buttons: Map<number, boolean>, axes: Map<number, number> }} state
   * @param {string} site
   * @returns {Array<{ type: 'keydown'|'keyup', key: string, code: string, keyCode: number }>}
   */
  process(state, site) {
    const config = this._storage.getConfig();
    const profile = this._storage.getActiveProfile(site);
    const mappings = this._storage.getMappings(site, profile);

    const actions = [];

    // 处理按钮
    for (const [idx, pressed] of state.buttons) {
      const mapping = this._findButtonMapping(mappings, idx);
      if (!mapping || !mapping.key) continue;

      const inputId = `button:${idx}`;
      if (pressed) {
        if (this._tracker.press(inputId, mapping.key)) {
          actions.push(this._makeAction('keydown', mapping.key));
        }
      } else {
        if (this._tracker.release(inputId, mapping.key)) {
          actions.push(this._makeAction('keyup', mapping.key));
        }
      }
    }

    // 处理轴
    for (const [idx, rawValue] of state.axes) {
      const deadzone = config.deadzone;
      const threshold = config.axisThreshold;
      const value = applyDeadzone(rawValue, deadzone);

      // 正方向
      {
        const mapping = this._findAxisMapping(mappings, idx, 'positive');
        const inputId = `axis:${idx}+`;
        if (mapping && mapping.key) {
          if (value > threshold) {
            if (this._tracker.press(inputId, mapping.key)) {
              actions.push(this._makeAction('keydown', mapping.key));
            }
          } else {
            if (this._tracker.release(inputId, mapping.key)) {
              actions.push(this._makeAction('keyup', mapping.key));
            }
          }
        }
      }

      // 负方向
      {
        const mapping = this._findAxisMapping(mappings, idx, 'negative');
        const inputId = `axis:${idx}-`;
        if (mapping && mapping.key) {
          if (value < -threshold) {
            if (this._tracker.press(inputId, mapping.key)) {
              actions.push(this._makeAction('keydown', mapping.key));
            }
          } else {
            if (this._tracker.release(inputId, mapping.key)) {
              actions.push(this._makeAction('keyup', mapping.key));
            }
          }
        }
      }
    }

    return actions;
  }

  /**
   * 释放所有当前按住按键（手柄断连、标签页隐藏时调用）
   * @returns {Array<{ type: 'keyup', key: string, code: string, keyCode: number }>}
   */
  releaseAll() {
    return this._tracker.releaseAll().map(key => this._makeAction('keyup', key));
  }

  // ── helpers ──────────────────────────────────────────

  _findButtonMapping(mappings, index) {
    return mappings.find(m => m.type === 'button' && m.index === index);
  }

  _findAxisMapping(mappings, index, direction) {
    return mappings.find(
      m => m.type === 'axis' && m.index === index && m.direction === direction
    );
  }

  _makeAction(type, key) {
    const info = lookupKey(key);
    return { type, key, code: info.code, keyCode: info.keyCode };
  }
}

/**
 * 对摇杆原始值应用死区
 * @param {number} raw — 原始值 [-1, 1]
 * @param {number} deadzone — 死区半径 [0, 1]
 * @returns {number} 处理后的值 [-1, 1]
 */
function applyDeadzone(raw, deadzone) {
  const abs = Math.abs(raw);
  if (abs < deadzone) return 0;
  // 重新映射 [deadzone, 1] → [0, 1]
  return Math.sign(raw) * ((abs - deadzone) / (1 - deadzone));
}
