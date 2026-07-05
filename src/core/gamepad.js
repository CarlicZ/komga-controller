/**
 * gamepad.js — rAF 轮询 Gamepad API，状态 diff
 *
 * - 每帧从 navigator.getGamepads() 读取手柄状态（live objects，必须拷贝）
 * - 与上一帧比较，只输出变更的按钮和轴
 * - 处理连接/断开事件，防抖
 */

const AXIS_DELTA_THRESHOLD = 0.05; // 轴值变化超过此值才算变化

export class GamepadReader {
  constructor() {
    /** @type {Gamepad|null} */
    this._gamepad = null;
    this._index = 0; // 使用第几个手柄
    this._connected = false;

    // 上一帧状态快照
    this._prevButtons = [];
    this._prevAxes = [];

    this._onConnect = null;
    this._onDisconnect = null;

    this._setupEvents();
  }

  /** @returns {boolean} */
  get connected() {
    return this._connected;
  }

  /** @returns {Gamepad|null} */
  get gamepad() {
    return this._gamepad;
  }

  // ── 事件监听 ───────────────────────────────────────

  _setupEvents() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('[gc] gamepadconnected event:', e.gamepad.id, 'index:', e.gamepad.index);
      this._gamepad = e.gamepad;
      this._index = e.gamepad.index;
      this._connected = true;
      this._prevButtons = new Array(e.gamepad.buttons.length).fill(false);
      this._prevAxes = new Array(e.gamepad.axes.length).fill(0);
      if (this._onConnect) this._onConnect(e.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index !== this._index) return;
      console.log('[gc] gamepaddisconnected event, index:', e.gamepad.index);
      this._connected = false;
      this._gamepad = null;
      this._prevButtons = [];
      this._prevAxes = [];
      if (this._onDisconnect) this._onDisconnect();
    });
  }

  onconnect(fn) { this._onConnect = fn; }
  ondisconnect(fn) { this._onDisconnect = fn; }

  // ── 轮询 ────────────────────────────────────────────

  /**
   * 每帧调用。返回变更的按钮和轴，无变化返回 null。
   * @returns {{ buttons: Map<number, boolean>, axes: Map<number, number> } | null}
   */
  poll() {
    // 尝试从 navigator.getGamepads() 获取
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this._index];

    if (!gp) {
      if (this._connected) {
        // 手柄在事件触发前就断开了
        this._connected = false;
        this._gamepad = null;
        this._prevButtons = [];
        this._prevAxes = [];
        if (this._onDisconnect) this._onDisconnect();
      }
      return null;
    }

    // 首次检测到（可能在 gamepadconnected 事件前）
    if (!this._connected) {
      this._connected = true;
      this._gamepad = gp;
      // 初始化为全部未按下/归零 —— 保证已按下的按键在下一帧被检测为"变化"
      // 如果用当前状态初始化，已按下的按键就会被"吞掉"（只发 keyup 不发 keydown）
      this._prevButtons = new Array(gp.buttons.length).fill(false);
      this._prevAxes = new Array(gp.axes.length).fill(0);
      if (this._onConnect) this._onConnect(gp);
      console.log(`[gc] Gamepad detected in poll: ${gp.id} (${gp.buttons.length} buttons, ${gp.axes.length} axes)`);
      return null; // 下一帧开始处理按钮变化
    }

    this._gamepad = gp;

    const changedButtons = new Map();
    const changedAxes = new Map();

    // 比较按钮
    const btnLen = gp.buttons.length;
    for (let i = 0; i < btnLen; i++) {
      const pressed = gp.buttons[i].pressed;
      if (this._prevButtons[i] !== pressed) {
        changedButtons.set(i, pressed);
      }
    }

    // 比较轴
    const axisLen = gp.axes.length;
    for (let i = 0; i < axisLen; i++) {
      const val = gp.axes[i];
      const prev = this._prevAxes[i] ?? 0;
      if (Math.abs(val - prev) > AXIS_DELTA_THRESHOLD) {
        changedAxes.set(i, val);
      }
    }

    // 更新快照
    this._prevButtons = [...gp.buttons.map(b => b.pressed)];
    this._prevAxes = [...gp.axes];

    // 没有变化
    if (changedButtons.size === 0 && changedAxes.size === 0) {
      return null;
    }

    return { buttons: changedButtons, axes: changedAxes };
  }
}
