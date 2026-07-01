/**
 * Storage — GM_setValue/GM_getValue 封装 + 配置 schema
 *
 * 整个配置存储在 GM 的一个 key 'gc_config' 下。
 * 如果 GM_* API 不可用（开发环境），回退到 localStorage。
 */

const STORAGE_KEY = 'gc_config';
const SCHEMA_VERSION = 1;

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
