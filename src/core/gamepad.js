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

    // 防抖
    this._connectTimer = null;
    this._disconnectTimer = null;

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
      if (this._disconnectTimer) {
        clearTimeout(this._disconnectTimer);
        this._disconnectTimer = null;
      }
      // 500ms 防抖
      this._connectTimer = setTimeout(() => {
        this._connectTimer = null;
        this._gamepad = e.gamepad;
        this._index = e.gamepad.index;
        this._connected = true;
        this._prevButtons = [];
        this._prevAxes = [];
        if (this._onConnect) this._onConnect(e.gamepad);
      }, 500);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this._connectTimer) {
        clearTimeout(this._connectTimer);
        this._connectTimer = null;
      }
      if (e.gamepad.index !== this._index) return;
      this._disconnectTimer = setTimeout(() => {
        this._disconnectTimer = null;
        this._connected = false;
        this._gamepad = null;
        this._prevButtons = [];
        this._prevAxes = [];
        if (this._onDisconnect) this._onDisconnect();
      }, 500);
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
      this._prevButtons = [...gp.buttons.map(b => b.pressed)];
      this._prevAxes = [...gp.axes];
      if (this._onConnect) this._onConnect(gp);
      return null; // 不触发事件，等下一帧
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
