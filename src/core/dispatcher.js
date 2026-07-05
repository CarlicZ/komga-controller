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
   * @param {EventTarget} [opts.target] — dispatch 目标，默认 document
   */
  constructor(opts = {}) {
    this._target = opts.target || document;
  }

  /**
   * 派发一个键盘事件
   * @param {{ type: 'keydown'|'keyup', key: string, code: string, keyCode: number }} action
   */
  dispatch(action) {
    const { type, key, code, keyCode } = action;
    const event = this._createKeyboardEvent(type, { key, code, keyCode, repeat: false });
    // Dispatch 到主目标
    this._target.dispatchEvent(event);
  }

  /**
   * 派发带有 repeat 标记的 keydown（用于长按重复）
   * @param {{ key: string, code: string, keyCode: number }} action
   */
  dispatchRepeat(action) {
    const { key, code, keyCode } = action;
    const event = this._createKeyboardEvent('keydown', { key, code, keyCode, repeat: true });
    this._target.dispatchEvent(event);
  }

  /**
   * 创建 KeyboardEvent，在 Tampermonkey 沙箱环境下安全执行。
   * 不使用 view: window（沙箱中 window 可能不是原生 Window 对象）。
   */
  _createKeyboardEvent(type, { key, code, keyCode, repeat }) {
    const init = {
      key,
      code,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
      repeat,
    };

    let event;
    try {
      event = new KeyboardEvent(type, init);
    } catch (_e) {
      // 沙箱环境下 new KeyboardEvent 可能失败，回退 createEvent
      try {
        event = document.createEvent('KeyboardEvent');
        // initKeyboardEvent 的参数在不同浏览器不一致，跳过 view 相关调用
      } catch (_e2) {
        // 最终回退：用 Event 代替（丢失 keyCode 但至少能触发监听器）
        event = new Event(type, { bubbles: true, cancelable: true, composed: true });
      }
    }

    // 如果 createEvent 成功了但 event 没有 key 属性，直接返回（只能做到这一步）
    if (!event || typeof event.key !== 'undefined') {
      // 修正 keyCode / which —— 某些浏览器在构造函数中忽略
      if (event) {
        try { Object.defineProperty(event, 'keyCode', { get() { return keyCode; }, configurable: true }); } catch (_) {}
        try { Object.defineProperty(event, 'which', { get() { return keyCode; }, configurable: true }); } catch (_) {}
        try { Object.defineProperty(event, 'key', { get() { return key; }, configurable: true }); } catch (_) {}
        try { Object.defineProperty(event, 'code', { get() { return code; }, configurable: true }); } catch (_) {}
      }
    }

    return event;
  }
}
