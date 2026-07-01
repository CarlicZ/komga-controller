/**
 * keybindRecorder.js — "按键盘任意键" 捕获模式
 *
 * 当用户在映射表中点击[修改]时，进入录音模式：
 * 1. 显示 "请按键盘任意键…"
 * 2. 监听 keydown，捕获按下的键
 * 3. Escape 取消，修饰键忽略（除非作为辅助键？目前只捕获主键）
 * 4. 捕获后回调，自动解除监听
 */

const IGNORED_KEYS = new Set([
  'Shift', 'ShiftLeft', 'ShiftRight',
  'Control', 'ControlLeft', 'ControlRight',
  'Alt', 'AltLeft', 'AltRight',
  'Meta', 'MetaLeft', 'MetaRight',
  'OS', 'OSLeft', 'OSRight',
  'ContextMenu',
  'Dead', 'Unidentified',
]);

/**
 * 启动按键捕获
 * @param {object} opts
 * @param {(key: string|null) => void} opts.onCapture — 捕获到按键时回调，key 为 null 表示取消
 * @param {HTMLElement} [opts.target] — 监听目标，默认 document
 */
export function startKeyCapture({ onCapture, target }) {
  target = target || document;

  function handler(e) {
    // 阻止默认行为和冒泡（防止按键实际生效）
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Escape — 取消
    if (e.key === 'Escape') {
      cleanup();
      onCapture(null);
      return;
    }

    // 忽略纯修饰键
    if (IGNORED_KEYS.has(e.key)) {
      return;
    }

    // 捕获
    cleanup();
    onCapture(e.key);
  }

  function cleanup() {
    target.removeEventListener('keydown', handler, true);
  }

  target.addEventListener('keydown', handler, true);
  return cleanup;
}

/**
 * 启动游戏手柄按键捕获（用于将来直接用手柄配置映射）
 * @param {object} opts
 * @param {(buttonIndex: number|null) => void} opts.onCapture
 */
export function startGamepadCapture({ onCapture }) {
  let rafId;

  function poll() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed) {
          // 等待释放后再回调，避免每帧重复触发
          waitForRelease(i);
          return;
        }
      }
    }
    rafId = requestAnimationFrame(poll);
  }

  function waitForRelease(index) {
    function checkRelease() {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        if (!gp.buttons[index].pressed) {
          onCapture(index);
          return;
        }
      }
      requestAnimationFrame(checkRelease);
    }
    requestAnimationFrame(checkRelease);
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
  }

  rafId = requestAnimationFrame(poll);
  return cleanup;
}
