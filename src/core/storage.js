/**
 * Storage — GM_setValue/GM_getValue 封装 + 配置 schema
 *
 * 整个配置存储在 GM 的一个 key 'gc_config' 下。
 * 如果 GM_* API 不可用（开发环境），回退到 localStorage。
 */

const STORAGE_KEY = 'gc_config';
const SCHEMA_VERSION = 1;

// 默认启用站点 — 脚本在这些站点自动激活
const DEFAULT_ENABLED_SITES = [
  '127.0.0.1:25600',
  'localhost:25600',
  'localhost',
  'youtube.com',
  'manga.bilibili.com',
];

// ── Fallback detection ──────────────────────────────────

function gmAvailable() {
  return typeof GM_setValue === 'function' && typeof GM_getValue === 'function';
}

function readRaw() {
  if (gmAvailable()) {
    return GM_getValue(STORAGE_KEY, null);
  }
  return localStorage.getItem(STORAGE_KEY);
}

function writeRaw(value) {
  if (gmAvailable()) {
    GM_setValue(STORAGE_KEY, value);
  } else {
    localStorage.setItem(STORAGE_KEY, value);
  }
}

// ── Default config factory ──────────────────────────────

function createDefaultConfig() {
  return {
    version: SCHEMA_VERSION,
    enabledSites: [...DEFAULT_ENABLED_SITES],
    panel: { x: -1, y: -1, minimized: false },  // -1 = auto-center
    activeProfile: {},
    mappings: {},
    deadzone: 0.15,
    axisThreshold: 0.5,
    repeatEnabled: true,
    repeatDelay: 400,
    repeatRate: 30,
  };
}

// ── Storage class ───────────────────────────────────────

export class Storage {
  constructor() {
    this._config = null;
  }

  /** Lazy-load config from GM storage, applying migrations if needed. */
  _load() {
    if (this._config) return;
    const raw = readRaw();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this._config = migrate(parsed);
      } catch (e) {
        console.warn('[gc] Failed to parse stored config, using defaults.', e);
        this._config = createDefaultConfig();
      }
    } else {
      this._config = createDefaultConfig();
    }
  }

  /** Persist current config. */
  _save() {
    writeRaw(JSON.stringify(this._config));
  }

  // ── Full config ───────────────────────────────────────

  getConfig() {
    this._load();
    // Return a deep clone so callers can't accidentally mutate
    return JSON.parse(JSON.stringify(this._config));
  }

  // ── Site + Profile helpers ────────────────────────────

  getSite(site) {
    this._load();
    if (!this._config.mappings[site]) {
      this._config.mappings[site] = {};
    }
    return this._config.mappings[site];
  }

  getMappings(site, profile) {
    const s = this.getSite(site);
    if (!s[profile]) {
      s[profile] = [];
    }
    return s[profile];
  }

  setMappings(site, profile, entries) {
    this._load();
    if (!this._config.mappings[site]) {
      this._config.mappings[site] = {};
    }
    this._config.mappings[site][profile] = entries;
    this._save();
  }

  getActiveProfile(site) {
    this._load();
    return this._config.activeProfile[site] || '默认';
  }

  setActiveProfile(site, profile) {
    this._load();
    this._config.activeProfile[site] = profile;
    this._save();
  }

  getProfiles(site) {
    const s = this.getSite(site);
    return Object.keys(s);
  }

  addProfile(site, profile) {
    this._load();
    if (!this._config.mappings[site]) {
      this._config.mappings[site] = {};
    }
    if (!this._config.mappings[site][profile]) {
      this._config.mappings[site][profile] = [];
    }
    this._save();
  }

  deleteProfile(site, profile) {
    this._load();
    const s = this._config.mappings[site];
    if (s) {
      delete s[profile];
      // 如果当前激活的是被删除的 profile，切回默认
      if (this._config.activeProfile[site] === profile) {
        this._config.activeProfile[site] = '默认';
        if (!s['默认']) {
          s['默认'] = [];
        }
      }
    }
    this._save();
  }

  // ── Panel position ────────────────────────────────────

  getPanelPosition() {
    this._load();
    return { ...this._config.panel };
  }

  setPanelPosition(pos) {
    this._load();
    this._config.panel = { ...this._config.panel, ...pos };
    this._save();
  }

  // ── Settings ──────────────────────────────────────────

  getDeadzone() {
    this._load();
    return this._config.deadzone;
  }

  setDeadzone(val) {
    this._load();
    this._config.deadzone = Math.max(0, Math.min(0.5, val));
    this._save();
  }

  getAxisThreshold() {
    this._load();
    return this._config.axisThreshold;
  }

  setAxisThreshold(val) {
    this._load();
    this._config.axisThreshold = Math.max(0.1, Math.min(1.0, val));
    this._save();
  }

  getRepeatConfig() {
    this._load();
    return {
      enabled: this._config.repeatEnabled,
      delay: this._config.repeatDelay,
      rate: this._config.repeatRate,
    };
  }

  setRepeatConfig({ enabled, delay, rate }) {
    this._load();
    if (enabled !== undefined) this._config.repeatEnabled = enabled;
    if (delay !== undefined) this._config.repeatDelay = delay;
    if (rate !== undefined) this._config.repeatRate = rate;
    this._save();
  }

  // ── Enabled Sites ──────────────────────────────────────

  /**
   * 获取所有已启用的站点模式列表
   * @returns {string[]}
   */
  getEnabledSites() {
    this._load();
    return [...this._config.enabledSites];
  }

  /**
   * 判断给定站点是否匹配任一启用模式。
   * 支持精确 hostname 和通配符模式（如 *.bilibili.com）。
   * @param {string} hostname — 如 "www.bilibili.com" 或 "komga.local:25600"
   * @returns {boolean}
   */
  isSiteEnabled(hostname) {
    this._load();
    // 兼容旧版本配置（无 enabledSites 字段）
    if (!Array.isArray(this._config.enabledSites)) {
      this._config.enabledSites = [...DEFAULT_ENABLED_SITES];
      this._save();
    }
    return this._config.enabledSites.some(pattern => matchSitePattern(hostname, pattern));
  }

  /**
   * 添加一个站点模式到启用列表
   * @param {string} pattern — 如 "example.com" 或 "*.example.com"
   */
  addEnabledSite(pattern) {
    this._load();
    const cleaned = pattern.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleaned) return;
    if (!this._config.enabledSites.includes(cleaned)) {
      this._config.enabledSites.push(cleaned);
      this._save();
    }
  }

  /**
   * 从启用列表移除一个站点模式
   * @param {string} pattern
   */
  removeEnabledSite(pattern) {
    this._load();
    this._config.enabledSites = this._config.enabledSites.filter(s => s !== pattern);
    this._save();
  }

  /**
   * 获取当前站点的默认启用列表（硬编码）
   * @returns {string[]}
   */
  getDefaultEnabledSites() {
    return [...DEFAULT_ENABLED_SITES];
  }

  // ── Export / Import ───────────────────────────────────

  exportConfig() {
    this._load();
    return JSON.stringify(this._config, null, 2);
  }

  importConfig(jsonStr) {
    try {
      const imported = JSON.parse(jsonStr);
      this._config = migrate(imported);
      this._save();
      return true;
    } catch (e) {
      console.error('[gc] Import failed:', e);
      return false;
    }
  }
}

// ── Schema migration ────────────────────────────────────

function migrate(config) {
  if (!config || typeof config !== 'object') {
    return createDefaultConfig();
  }

  // Version not set → migrate from v0 to v1
  if (!config.version || config.version < 1) {
    config.version = 1;
    config.enabledSites = config.enabledSites || [...DEFAULT_ENABLED_SITES];
    config.panel = config.panel || { x: -1, y: -1, minimized: false };
    config.activeProfile = config.activeProfile || {};
    config.mappings = config.mappings || {};
    config.deadzone = config.deadzone ?? 0.15;
    config.axisThreshold = config.axisThreshold ?? 0.5;
    config.repeatEnabled = config.repeatEnabled ?? true;
    config.repeatDelay = config.repeatDelay ?? 400;
    config.repeatRate = config.repeatRate ?? 30;
  }

  return config;
}

// ── Site Pattern Matching ──────────────────────────────

/**
 * 判断 hostname 是否匹配某个模式。
 * 精确匹配: "youtube.com" 匹配 "youtube.com"
 * 子域名匹配: "www.youtube.com" 也匹配 "youtube.com"
 * 通配符: "*.bilibili.com" 匹配 "manga.bilibili.com" 和 "www.bilibili.com"
 * 端口: "127.0.0.1:25600" 精确匹配，不忽略端口
 *
 * @param {string} hostname — 实际 hostname (含端口)
 * @param {string} pattern — 配置中的匹配模式
 * @returns {boolean}
 */
function matchSitePattern(hostname, pattern) {
  // 精确匹配
  if (hostname === pattern) return true;

  // 提取纯 hostname（去掉端口）用于泛域名匹配
  const hostNoPort = hostname.replace(/:\d+$/, '');

  // 通配符: *.example.com
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2); // "bilibili.com"
    // hostname 以 ".domain" 结尾
    if (hostNoPort.endsWith('.' + domain)) return true;
    // hostname 精确等于 domain（如 bilibili.com 匹配 *.bilibili.com? 不能，domain 必须后缀匹配）
    // 但 "youtube.com" 作为 pattern 应该匹配 "www.youtube.com"
    return false;
  }

  // 普通域名的子域名匹配: pattern="youtube.com" 匹配 hostname="www.youtube.com"
  if (!pattern.includes('*') && !pattern.includes(':')) {
    if (hostNoPort === pattern) return true;
    if (hostNoPort.endsWith('.' + pattern)) return true;
  }

  return false;
}
