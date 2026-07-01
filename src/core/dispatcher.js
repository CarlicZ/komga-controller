/**
 * dispatcher.js — KeyboardEvent 构造与 dispatch
 *
 * - 根据 KeyboardAction 构造完整的 KeyboardEvent
 * - 处理 keyCode/which 的浏览器兼容问题
 * - 可选：长按 key repeat
 * - 同时 dispatch 到 document 和 window（兼容不同的事件监听位置）
 */

export class Dispatcher {
  /**
   * @param {object} [opts]
   * @param {EventTarget} [opts.target] — 主 dispatch 目标，默认 document
   * @param {boolean} [opts.fallbackToWindow=true] — 是否同时 dispatch 到 window
   */
  constructor(opts = {}) {
    this._target = opts.target || document;
    this._fallback = opts.fallbackToWindow !== false;
    this._repeatTimers = new Map();
  }

  /**
   * 派发一个键盘事件
   * @param {{ type: 'keydown'|'keyup', key: string, code: string, keyCode: number }} action
   */
  dispatch(action) {
    const { type, key, code, keyCode } = action;

    const eventInit = {
      key,
      code,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      repeat: false,
    };

    let event;
    try {
      event = new KeyboardEvent(type, eventInit);
    } catch (e) {
      // 回退：某些旧浏览器不支持 KeyboardEvent 构造函数
      event = document.createEvent('KeyboardEvent');
      if (event.initKeyboardEvent) {
        event.initKeyboardEvent(
          type, true, true, window,
          key, 0, false, false, false, false
        );
      } else if (event.initKeyEvent) {
        event.initKeyEvent(
          type, true, true, window,
          false, false, false, false,
          keyCode, 0
        );
      }
    }

    // 修正 keyCode / which — 某些浏览器在构造函数中忽略
    try {
      Object.defineProperty(event, 'keyCode', {
        get() { return keyCode; },
        configurable: true,
      });
    } catch (_) { /* ignore */ }
    try {
      Object.defineProperty(event, 'which', {
        get() { return keyCode; },
        configurable: true,
      });
    } catch (_) { /* ignore */ }
    try {
      Object.defineProperty(event, 'key', {
        get() { return key; },
        configurable: true,
      });
    } catch (_) { /* ignore */ }
    try {
      Object.defineProperty(event, 'code', {
        get() { return code; },
        configurable: true,
      });
    } catch (_) { /* ignore */ }

    // Dispatch 到主目标
    this._target.dispatchEvent(event);

    // Fallback: dispatch 到 window
    if (this._fallback && this._target !== window) {
      window.dispatchEvent(
        new KeyboardEvent(type, { ...eventInit })
      );
    }
  }

  /**
   * 派发带有 repeat 标记的 keydown（用于长按重复）
   * @param {{ key: string, code: string, keyCode: number }} action
   */
  dispatchRepeat(action) {
    const { key, code, keyCode } = action;
    const eventInit = {
      key, code, keyCode, which: keyCode,
      bubbles: true, cancelable: true, composed: true,
      view: window, repeat: true,
    };
    const event = new KeyboardEvent('keydown', eventInit);
    this._target.dispatchEvent(event);
  }
}
