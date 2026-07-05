/**
 * panel.js — 悬浮配置窗
 *
 * - DOM 构建：header、状态栏、profile 栏、映射表、footer
 * - 拖拽移动 + 位置持久化
 * - 最小化 / 恢复 / 关闭
 * - Profile 管理（切换、新增、删除）
 * - 映射编辑（按键捕获、取消映射）
 * - 默认映射还原
 */

import { PANEL_CSS } from './panel.css.js';
import { getLanguage, getButtonLabel, getAxisLabel, getAllInputs } from './i18n.js';
import { getKeyDisplayName, getSiteDefaults } from '../config/defaults.js';
import { PRESETS } from '../config/presets/index.js';
import { startKeyCapture } from './keybindRecorder.js';

export class Panel {
  /**
   * @param {object} ctx
   * @param {import('../core/storage.js').Storage} ctx.storage
   * @param {import('../core/mapper.js').Mapper} ctx.mapper
   * @param {import('../core/dispatcher.js').Dispatcher} ctx.dispatcher
   * @param {import('../core/gamepad.js').GamepadReader} ctx.reader
   * @param {string} ctx.site
   */
  constructor({ storage, mapper, dispatcher, reader, site }) {
    this.storage = storage;
    this.mapper = mapper;
    this.dispatcher = dispatcher;
    this.reader = reader;
    this.site = site;

    // UI state
    this._visible = true;
    this._minimized = false;
    this._activeTab = 'mapping'; // 'mapping' | 'sites'
    this._recordingInputId = null;
    this._recordingCleanup = null;
    this._lang = getLanguage();

    this._el = null;
    this._miniBtn = null;
    this._styleEl = null;
    this._dragOverlay = null;

    // Drag state
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._panelStartX = 0;
    this._panelStartY = 0;
  }

  // ── Render ─────────────────────────────────────────

  render() {
    // Inject CSS
    this._styleEl = document.createElement('style');
    this._styleEl.id = 'gc-styles';
    this._styleEl.textContent = PANEL_CSS;
    document.head.appendChild(this._styleEl);

    // Drag overlay (防止拖拽时触发 iframe 事件)
    this._dragOverlay = document.createElement('div');
    this._dragOverlay.id = 'gc-drag-overlay';
    document.body.appendChild(this._dragOverlay);

    // Build panel
    this._el = this._buildPanel();
    document.body.appendChild(this._el);

    // Build mini button
    this._miniBtn = this._buildMiniBtn();
    document.body.appendChild(this._miniBtn);

    // Restore panel state
    this._restoreState();
  }

  // ── Build DOM ──────────────────────────────────────

  _buildPanel() {
    const el = document.createElement('div');
    el.id = 'gc-panel';
    el.innerHTML = this._panelHTML();
    this._bindEvents(el);
    return el;
  }

  _panelHTML() {
    const connected = this.reader ? this.reader.connected : false;
    const activeTab = this._activeTab;

    return `
      <div class="gc-header">
        <span class="gc-title">🎮 游戏手柄控制器</span>
        <button class="gc-btn gc-btn-min" title="最小化">─</button>
        <button class="gc-btn gc-btn-close" title="关闭">✕</button>
      </div>
      <div class="gc-status">
        <span class="gc-conn-status ${connected ? 'gc-connected' : 'gc-disconnected'}">
          ${connected ? '🟢 已连接' : '🔴 未连接'}
        </span>
        <span>站点: ${this.site}</span>
      </div>
      <div class="gc-tabs">
        <button class="gc-tab ${activeTab === 'mapping' ? 'gc-tab-active' : ''}" data-tab="mapping">🕹️ 映射配置</button>
        <button class="gc-tab ${activeTab === 'sites' ? 'gc-tab-active' : ''}" data-tab="sites">🌐 站点管理</button>
      </div>
      <div class="gc-content ${activeTab === 'mapping' ? 'gc-content-active' : ''}" data-content="mapping">
        ${this._mappingTabHTML()}
      </div>
      <div class="gc-content ${activeTab === 'sites' ? 'gc-content-active' : ''}" data-content="sites">
        ${this._sitesTabHTML()}
      </div>
    `;
  }

  _mappingTabHTML() {
    const activeProfile = this.storage.getActiveProfile(this.site);
    const profiles = this.storage.getProfiles(this.site);

    return `
      <div class="gc-profile-bar">
        <label>配置:</label>
        <select class="gc-profile-select">
          ${profiles.map(p => `<option value="${escAttr(p)}" ${p === activeProfile ? 'selected' : ''}>${escHtml(p)}</option>`).join('')}
        </select>
        <button class="gc-btn-sm gc-btn-add-profile" title="新建配置">+ 新增</button>
        <button class="gc-btn-sm gc-btn-danger gc-btn-del-profile" title="删除当前配置" ${profiles.length <= 1 ? 'disabled' : ''}>🗑</button>
      </div>
      <div class="gc-table-wrap">
        ${this._tableHTML()}
      </div>
      <div class="gc-footer">
        <button class="gc-btn-sm gc-btn-add-mapping">添加映射</button>
        <button class="gc-btn-sm gc-btn-preset">加载预设</button>
        <button class="gc-btn-sm gc-btn-reset">还原默认</button>
        <button class="gc-btn-sm gc-btn-export">导出</button>
        <button class="gc-btn-sm gc-btn-import">导入</button>
        <button class="gc-btn-sm gc-btn-advanced">高级设置</button>
      </div>
    `;
  }

  _sitesTabHTML() {
    const enabledSites = this.storage.getEnabledSites();
    const defaultSites = this.storage.getDefaultEnabledSites();

    const siteItems = enabledSites.map(s => `
      <div class="gc-site-item" data-site="${escAttr(s)}">
        <span class="gc-site-domain">${escHtml(s)}</span>
        ${s === this.site ? '<span class="gc-site-current">当前</span>' : ''}
        <button class="gc-btn-remove-site" data-site="${escAttr(s)}">移除</button>
      </div>
    `).join('');

    return `
      <div class="gc-site-list">
        ${siteItems}
        <div class="gc-site-hint">
          💡 已启用站点会自动加载手柄控制器。<br>
          支持通配符 <code>*.example.com</code> 匹配子域名，<br>
          也支持不带通配符的域名（如 <code>youtube.com</code>），会自动匹配子域名。<br>
          默认站点: ${defaultSites.map(s => `<code>${escHtml(s)}</code>`).join(', ')}
        </div>
      </div>
      <div class="gc-add-site-row">
        <input type="text" class="gc-add-site-input" placeholder="输入域名，如 example.com 或 *.example.com">
        <button class="gc-btn-add-site">添加</button>
      </div>
    `;
  }

  _tableHTML() {
    const activeProfile = this.storage.getActiveProfile(this.site);
    const mappings = this.storage.getMappings(this.site, activeProfile);
    const allInputs = getAllInputs(this._lang);

    // 建立映射查找: inputId -> key
    const mappingMap = new Map();
    for (const m of mappings) {
      const id = m.type === 'axis'
        ? `axis:${m.index}:${m.direction}`
        : `button:${m.index}`;
      mappingMap.set(id, m.key);
    }

    const rows = allInputs.map(input => {
      const key = mappingMap.get(input.id) || '';
      const isRecording = this._recordingInputId === input.id;
      const keyDisplay = isRecording
        ? '<span class="gc-key-recording">请按键盘任意键…</span>'
        : key
          ? `<span class="gc-key-mapped">${escHtml(getKeyDisplayName(key))}</span>`
          : '<span class="gc-key-unset">(未设置)</span>';

      return `
        <tr data-input-id="${escAttr(input.id)}">
          <td class="gc-col-input">${escHtml(input.label)}</td>
          <td class="gc-col-key">${keyDisplay}</td>
          <td class="gc-col-action">
            <button class="gc-remap-btn" data-input-id="${escAttr(input.id)}">修改</button>
            ${key ? `<button class="gc-unmap-btn" data-input-id="${escAttr(input.id)}">✕</button>` : ''}
          </td>
        </tr>
      `;
    });

    return `
      <table>
        <thead>
          <tr>
            <th class="gc-col-input">手柄输入</th>
            <th class="gc-col-key">映射按键</th>
            <th class="gc-col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  }

  _buildMiniBtn() {
    const btn = document.createElement('button');
    btn.id = 'gc-mini-btn';
    btn.textContent = '🎮';
    btn.title = '打开手柄控制器 | 可拖拽移动';
    btn.style.display = 'none';

    // Drag support
    let dragging = false, moved = false;
    let startX = 0, startY = 0, btnStartX = 0, btnStartY = 0;

    const onStart = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const r = btn.getBoundingClientRect();
      btnStartX = r.left;
      btnStartY = r.top;
      btn.style.cursor = 'grabbing';
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      moved = true;
      let x = btnStartX + (e.clientX - startX);
      let y = btnStartY + (e.clientY - startY);
      x = Math.max(0, Math.min(window.innerWidth - 44, x));
      y = Math.max(0, Math.min(window.innerHeight - 44, y));
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.bottom = 'auto';
      btn.style.right = 'auto';
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      btn.style.cursor = '';
      // 只有真正拖拽移动了才保存位置，防止点击时
      // getBoundingClientRect 在 display:none 后返回 (0,0)
      if (moved) {
        const r = btn.getBoundingClientRect();
        this.storage.setPanelPosition({ miniX: r.left, miniY: r.top });
      }
    };

    btn.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    // Click to restore — only if not dragged
    btn.addEventListener('mouseup', () => {
      if (!moved) this._restore();
    });

    return btn;
  }

  // ── Event Binding ──────────────────────────────────

  _bindEvents(el) {
    // Header buttons
    el.querySelector('.gc-btn-min').addEventListener('click', () => this._minimize());
    el.querySelector('.gc-btn-close').addEventListener('click', () => this.hide());

    // Tabs
    el.querySelectorAll('.gc-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });

    // Profile (only in mapping tab)
    const profileSelect = el.querySelector('.gc-profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => this._switchProfile(e.target.value));
    }
    const addProfileBtn = el.querySelector('.gc-btn-add-profile');
    if (addProfileBtn) addProfileBtn.addEventListener('click', () => this._addProfile());
    const delProfileBtn = el.querySelector('.gc-btn-del-profile');
    if (delProfileBtn) delProfileBtn.addEventListener('click', () => this._deleteProfile());

    // Table remap / unmap (only in mapping tab)
    const tbody = el.querySelector('tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const remapBtn = e.target.closest('.gc-remap-btn');
        const unmapBtn = e.target.closest('.gc-unmap-btn');
        const inputId = remapBtn?.dataset.inputId || unmapBtn?.dataset.inputId;
        if (!inputId) return;
        if (remapBtn) this._startRemap(inputId);
        if (unmapBtn) this._unmap(inputId);
      });
    }

    // Footer buttons (only in mapping tab)
    const addMappingBtn = el.querySelector('.gc-btn-add-mapping');
    if (addMappingBtn) addMappingBtn.addEventListener('click', () => this._addCustomMapping());
    const presetBtn = el.querySelector('.gc-btn-preset');
    if (presetBtn) presetBtn.addEventListener('click', () => this._showPresets());
    const resetBtn = el.querySelector('.gc-btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this._resetDefaults());
    const exportBtn = el.querySelector('.gc-btn-export');
    if (exportBtn) exportBtn.addEventListener('click', () => this._exportConfig());
    const importBtn = el.querySelector('.gc-btn-import');
    if (importBtn) importBtn.addEventListener('click', () => this._importConfig());
    const advancedBtn = el.querySelector('.gc-btn-advanced');
    if (advancedBtn) advancedBtn.addEventListener('click', () => this._showAdvanced());

    // Site management (only in sites tab)
    const addSiteBtn = el.querySelector('.gc-btn-add-site');
    if (addSiteBtn) addSiteBtn.addEventListener('click', () => this._addSite());
    const addSiteInput = el.querySelector('.gc-add-site-input');
    if (addSiteInput) {
      addSiteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._addSite();
      });
    }
    el.querySelectorAll('.gc-btn-remove-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const site = e.target.dataset.site;
        if (site) this._removeSite(site);
      });
    });

    // Drag
    el.querySelector('.gc-header').addEventListener('mousedown', (e) => this._onDragStart(e));
    document.addEventListener('mousemove', (e) => this._onDragMove(e));
    document.addEventListener('mouseup', () => this._onDragEnd());
  }

  // ── Drag ───────────────────────────────────────────

  _onDragStart(e) {
    if (e.target.closest('button')) return; // 不拦截按钮点击
    this._dragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    const rect = this._el.getBoundingClientRect();
    this._panelStartX = rect.left;
    this._panelStartY = rect.top;
    this._dragOverlay.classList.add('gc-active');
  }

  _onDragMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;

    let x = this._panelStartX + dx;
    let y = this._panelStartY + dy;

    // Clamp to viewport
    const pw = this._el.offsetWidth;
    const ph = this._el.offsetHeight;
    x = Math.max(0, Math.min(window.innerWidth - pw, x));
    y = Math.max(0, Math.min(window.innerHeight - 30, y));

    this._el.style.left = x + 'px';
    this._el.style.top = y + 'px';
  }

  _onDragEnd() {
    if (!this._dragging) return;
    this._dragging = false;
    this._dragOverlay.classList.remove('gc-active');
    // 持久化位置
    const rect = this._el.getBoundingClientRect();
    this.storage.setPanelPosition({ x: rect.left, y: rect.top });
  }

  // ── Visibility ─────────────────────────────────────

  show() {
    if (this._el) {
      this._el.style.display = '';
      this._minimized = false;
      this._visible = true;
      this.storage.setPanelPosition({ minimized: false });
    }
    if (this._miniBtn) this._miniBtn.style.display = 'none';
  }

  hide() {
    if (this._el) {
      this._el.style.display = 'none';
      this._minimized = false;
      this._visible = false;
      this.storage.setPanelPosition({ minimized: false });
    }
    if (this._miniBtn) this._miniBtn.style.display = 'block';
  }

  toggle() {
    if (this._visible && !this._minimized) {
      this.hide();
    } else {
      this.show();
    }
  }

  _minimize() {
    this._minimized = true;
    this._el.style.display = 'none';
    if (this._miniBtn) this._miniBtn.style.display = 'flex';
    this.storage.setPanelPosition({ minimized: true });
  }

  _restore() {
    this._minimized = false;
    this.show();
  }

  // ── State restore ──────────────────────────────────

  _restoreState() {
    const pos = this.storage.getPanelPosition();

    // 面板位置
    if (pos.x >= 0 && pos.y >= 0) {
      this._el.style.left = pos.x + 'px';
      this._el.style.top = pos.y + 'px';
    } else {
      // 默认居中
      const pw = this._el.offsetWidth;
      const ph = this._el.offsetHeight;
      this._el.style.left = ((window.innerWidth - pw) / 2) + 'px';
      this._el.style.top = ((window.innerHeight - ph) / 2) + 'px';
    }

    // 小悬浮球位置
    if (this._miniBtn) {
      if (pos.miniX >= 0 && pos.miniY >= 0) {
        this._miniBtn.style.left = pos.miniX + 'px';
        this._miniBtn.style.top = pos.miniY + 'px';
        this._miniBtn.style.bottom = 'auto';
        this._miniBtn.style.right = 'auto';
      }
    }

    // 始终默认最小化 —— 进页面不弹设置面板，用户手动打开
    this._minimize();
  }

  // ── Connection status ──────────────────────────────

  updateConnectionStatus(connected) {
    const statusEl = this._el?.querySelector('.gc-conn-status');
    if (!statusEl) return;
    statusEl.textContent = connected ? '🟢 已连接' : '🔴 未连接';
    statusEl.className = 'gc-conn-status ' + (connected ? 'gc-connected' : 'gc-disconnected');
  }

  // ── Profile management ─────────────────────────────

  _switchProfile(profile) {
    this.storage.setActiveProfile(this.site, profile);
    this._refreshTable();
  }

  _addProfile() {
    const name = window.prompt('请输入新配置名称:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const profiles = this.storage.getProfiles(this.site);
    if (profiles.includes(trimmed)) {
      this._toast('配置名称已存在');
      return;
    }
    // Copy current profile mappings to new one
    const curProfile = this.storage.getActiveProfile(this.site);
    const curMappings = this.storage.getMappings(this.site, curProfile);
    this.storage.addProfile(this.site, trimmed);
    this.storage.setMappings(this.site, trimmed, JSON.parse(JSON.stringify(curMappings)));
    this.storage.setActiveProfile(this.site, trimmed);
    this._refreshPanel();
  }

  _deleteProfile() {
    const profiles = this.storage.getProfiles(this.site);
    if (profiles.length <= 1) {
      this._toast('至少保留一个配置');
      return;
    }
    const cur = this.storage.getActiveProfile(this.site);
    if (!window.confirm(`确定要删除配置 "${cur}" 吗？此操作不可撤销。`)) return;
    this.storage.deleteProfile(this.site, cur);
    this._refreshPanel();
  }

  // ── Remap ──────────────────────────────────────────

  _startRemap(inputId) {
    // 取消之前的录音
    if (this._recordingCleanup) {
      this._recordingCleanup();
      this._recordingCleanup = null;
    }

    this._recordingInputId = inputId;
    this._refreshTable();

    this._recordingCleanup = startKeyCapture({
      onCapture: (key) => {
        this._recordingInputId = null;
        this._recordingCleanup = null;

        if (key !== null) {
          this._setMapping(inputId, key);
        }
        this._refreshTable();
      },
    });
  }

  _unmap(inputId) {
    this._setMapping(inputId, '');
    this._refreshTable();
  }

  _setMapping(inputId, key) {
    const activeProfile = this.storage.getActiveProfile(this.site);
    const mappings = this.storage.getMappings(this.site, activeProfile);

    // 解析 inputId
    let type, index, direction;
    if (inputId.startsWith('axis:')) {
      type = 'axis';
      const parts = inputId.split(':');
      index = parseInt(parts[1], 10);
      direction = parts[2];
    } else {
      type = 'button';
      index = parseInt(inputId.replace('button:', ''), 10);
    }

    // 查找并更新
    const existing = mappings.find(m => {
      if (m.type !== type || m.index !== index) return false;
      if (type === 'axis') return m.direction === direction;
      return true;
    });

    if (existing) {
      existing.key = key;
    } else {
      const entry = { type, index, key };
      if (type === 'axis') entry.direction = direction;
      mappings.push(entry);
    }

    this.storage.setMappings(this.site, activeProfile, mappings);
  }

  // ── Add custom mapping ─────────────────────────────

  _addCustomMapping() {
    // 简单的 prompt 方式添加额外映射（将来可替换为更友好的 UI）
    const input = window.prompt('输入手柄按钮编号 (0-16) 或轴编号 (如 axis:2:positive):');
    if (!input) return;
    const key = window.prompt('输入要映射的键盘按键:');
    if (!key) return;

    let type, index, direction;
    if (input.startsWith('axis:')) {
      type = 'axis';
      const parts = input.split(':');
      index = parseInt(parts[1], 10);
      direction = parts[2] || 'positive';
    } else {
      type = 'button';
      index = parseInt(input, 10);
      if (isNaN(index)) {
        this._toast('无效的输入格式');
        return;
      }
    }

    const activeProfile = this.storage.getActiveProfile(this.site);
    const mappings = this.storage.getMappings(this.site, activeProfile);
    const entry = { type, index, key };
    if (type === 'axis') entry.direction = direction;
    mappings.push(entry);
    this.storage.setMappings(this.site, activeProfile, mappings);
    this._refreshTable();
  }

  // ── Presets ─────────────────────────────────────────

  _showPresets() {
    const dlg = document.createElement('div');
    dlg.style.cssText = `
      position: fixed; z-index: 2147483647; top: 50%; left: 50%; transform: translate(-50%,-50%);
      background: #1e1e2e; color: #cdd6f4; padding: 20px; border-radius: 12px;
      border: 1px solid #45475a; width: 400px; font-family: inherit; font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;

    const items = PRESETS.map(p => `
      <div style="padding:10px; margin-bottom:6px; border-radius:8px; background:rgba(49,50,68,0.4); cursor:pointer;"
           class="gc-preset-item" data-preset-id="${escAttr(p.id)}">
        <div style="font-weight:600;">${escHtml(p.name)}</div>
        <div style="font-size:11px; color:#a6adc8; margin-top:2px;">${escHtml(p.description)}</div>
      </div>
    `).join('');

    dlg.innerHTML = `
      <h3 style="margin:0 0 12px 0; font-size:15px;">📦 加载预设配置</h3>
      <p style="font-size:12px; color:#a6adc8; margin-bottom:12px;">选择一个预设即可覆盖当前配置的映射：</p>
      ${items}
      <div style="margin-top:12px; text-align:right;">
        <button class="gc-btn-sm gc-btn-cancel" style="border-color:#6c7086; color:#6c7086;">取消</button>
      </div>
    `;
    document.body.appendChild(dlg);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;z-index:2147483646;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);';
    document.body.appendChild(overlay);

    function close() {
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    overlay.addEventListener('click', close);
    dlg.querySelector('.gc-btn-cancel').addEventListener('click', close);

    dlg.querySelectorAll('.gc-preset-item').forEach(item => {
      item.addEventListener('click', () => {
        const presetId = item.dataset.presetId;
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const activeProfile = this.storage.getActiveProfile(this.site);
        this.storage.setMappings(this.site, activeProfile, JSON.parse(JSON.stringify(preset.mapping)));
        close();
        this._refreshTable();
        this._toast(`已加载预设: ${preset.name}`);
      });
      item.addEventListener('mouseenter', (e) => { e.currentTarget.style.background = 'rgba(137,180,250,0.15)'; });
      item.addEventListener('mouseleave', (e) => { e.currentTarget.style.background = 'rgba(49,50,68,0.4)'; });
    });
  }

  // ── Reset defaults ─────────────────────────────────

  _resetDefaults() {
    if (!window.confirm('确定要还原为默认映射吗？当前配置将被覆盖。')) return;
    const activeProfile = this.storage.getActiveProfile(this.site);
    const defaults = getSiteDefaults(this.site);
    this.storage.setMappings(this.site, activeProfile, JSON.parse(JSON.stringify(defaults)));
    this._refreshTable();
    this._toast('已还原为默认映射');
  }

  // ── Export / Import ────────────────────────────────

  _exportConfig() {
    const json = this.storage.exportConfig();
    navigator.clipboard.writeText(json).then(() => {
      this._toast('配置已复制到剪贴板');
    }).catch(() => {
      // Fallback: 创建一个 textarea
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this._toast('配置已复制到剪贴板');
    });
  }

  _importConfig() {
    const jsonStr = window.prompt('请粘贴配置 JSON:');
    if (!jsonStr) return;
    if (this.storage.importConfig(jsonStr)) {
      this._refreshPanel();
      this._toast('配置导入成功');
    } else {
      this._toast('导入失败：JSON 格式错误');
    }
  }

  // ── Advanced settings ──────────────────────────────

  _showAdvanced() {
    const config = this.storage.getConfig();
    const html = `
      死区 (摇杆): <input id="gc-adv-deadzone" type="range" min="0" max="0.5" step="0.01" value="${config.deadzone}"> <span>${config.deadzone.toFixed(2)}</span><br>
      轴激活阈值: <input id="gc-adv-threshold" type="range" min="0.1" max="0.9" step="0.05" value="${config.axisThreshold}"> <span>${config.axisThreshold.toFixed(2)}</span><br>
      长按重复: <input id="gc-adv-repeat" type="checkbox" ${config.repeatEnabled ? 'checked' : ''}> 启用<br>
      重复延迟(ms): <input id="gc-adv-rpt-delay" type="number" min="100" max="2000" value="${config.repeatDelay}"><br>
      重复速率(Hz): <input id="gc-adv-rpt-rate" type="number" min="5" max="60" value="${config.repeatRate}"><br>
    `;

    // 简单 dialog
    const dlg = document.createElement('div');
    dlg.style.cssText = `
      position: fixed; z-index: 2147483647; top: 50%; left: 50%; transform: translate(-50%,-50%);
      background: #1e1e2e; color: #cdd6f4; padding: 20px; border-radius: 12px;
      border: 1px solid #45475a; width: 360px; font-family: inherit; font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    dlg.innerHTML = `
      <h3 style="margin:0 0 12px 0; font-size:15px;">高级设置</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${html}
      </div>
      <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="gc-btn-sm gc-btn-save">保存</button>
        <button class="gc-btn-sm gc-btn-cancel" style="border-color:#6c7086; color:#6c7086;">取消</button>
      </div>
    `;
    document.body.appendChild(dlg);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;z-index:2147483646;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);';
    document.body.appendChild(overlay);

    function close() {
      document.body.removeChild(dlg);
      document.body.removeChild(overlay);
    }

    overlay.addEventListener('click', close);
    dlg.querySelector('.gc-btn-cancel').addEventListener('click', close);
    dlg.querySelector('.gc-btn-save').addEventListener('click', () => {
      this.storage.setDeadzone(parseFloat(dlg.querySelector('#gc-adv-deadzone').value));
      this.storage.setAxisThreshold(parseFloat(dlg.querySelector('#gc-adv-threshold').value));
      this.storage.setRepeatConfig({
        enabled: dlg.querySelector('#gc-adv-repeat').checked,
        delay: parseInt(dlg.querySelector('#gc-adv-rpt-delay').value, 10),
        rate: parseInt(dlg.querySelector('#gc-adv-rpt-rate').value, 10),
      });
      close();
      this._toast('高级设置已保存');
    });

    // 实时更新 slider 显示
    dlg.querySelector('#gc-adv-deadzone').addEventListener('input', (e) => {
      dlg.querySelector('#gc-adv-deadzone + span').textContent = parseFloat(e.target.value).toFixed(2);
    });
    dlg.querySelector('#gc-adv-threshold').addEventListener('input', (e) => {
      dlg.querySelector('#gc-adv-threshold + span').textContent = parseFloat(e.target.value).toFixed(2);
    });
  }

  // ── Tab switching ──────────────────────────────────

  _switchTab(tab) {
    this._activeTab = tab;
    // 只更新 tab 和 content，不重建整个面板（避免丢失 drag 状态）
    const el = this._el;
    if (!el) return;

    // Update tab buttons
    el.querySelectorAll('.gc-tab').forEach(t => {
      t.classList.toggle('gc-tab-active', t.dataset.tab === tab);
    });

    // Update content panels
    el.querySelectorAll('.gc-content').forEach(c => {
      c.classList.toggle('gc-content-active', c.dataset.content === tab);
    });

    // If switching to sites tab, refresh the site list
    if (tab === 'sites') {
      const sitesContent = el.querySelector('[data-content="sites"]');
      if (sitesContent) {
        sitesContent.innerHTML = this._sitesTabHTML();
        this._bindSiteEvents(sitesContent);
      }
    }
  }

  _bindSiteEvents(container) {
    const addBtn = container.querySelector('.gc-btn-add-site');
    if (addBtn) addBtn.addEventListener('click', () => this._addSite());
    const input = container.querySelector('.gc-add-site-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._addSite();
      });
    }
    container.querySelectorAll('.gc-btn-remove-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const site = e.target.dataset.site;
        if (site) this._removeSite(site);
      });
    });
  }

  // ── Site management ─────────────────────────────────

  _addSite() {
    const input = this._el.querySelector('.gc-add-site-input');
    if (!input) return;
    const value = input.value.trim();
    if (!value) {
      this._toast('请输入域名');
      return;
    }
    this.storage.addEnabledSite(value);
    input.value = '';
    // Refresh sites tab
    this._switchTab('sites');
    this._toast(`已添加站点: ${value}`);
  }

  _removeSite(site) {
    const defaultSites = this.storage.getDefaultEnabledSites();
    this.storage.removeEnabledSite(site);

    // 如果移除的是当前站点，且该站点不在默认列表中 → 禁用
    if (site === this.site && !defaultSites.includes(site)) {
      this._toast(`已移除当前站点，手柄控制器将在此站点禁用`);
      this.destroy();
      // 通知主流程
      window.dispatchEvent(new CustomEvent('gc-site-disabled', { detail: { site } }));
    } else {
      this._switchTab('sites');
      this._toast(`已移除站点: ${site}`);
    }
  }

  // ── Destroy ─────────────────────────────────────────

  /** 完全销毁面板 DOM 和所有注入元素 */
  destroy() {
    // 取消录音
    if (this._recordingCleanup) {
      this._recordingCleanup();
      this._recordingCleanup = null;
    }
    // 移除面板
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
      this._el = null;
    }
    // 移除最小化按钮
    if (this._miniBtn && this._miniBtn.parentNode) {
      this._miniBtn.parentNode.removeChild(this._miniBtn);
      this._miniBtn = null;
    }
    // 移除样式
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
      this._styleEl = null;
    }
    // 移除拖拽遮罩
    if (this._dragOverlay && this._dragOverlay.parentNode) {
      this._dragOverlay.parentNode.removeChild(this._dragOverlay);
      this._dragOverlay = null;
    }
    this._visible = false;
    this._minimized = false;
  }

  // ── Refresh ────────────────────────────────────────

  _refreshTable() {
    const wrap = this._el.querySelector('.gc-table-wrap');
    if (wrap) {
      wrap.innerHTML = this._tableHTML();
      const tbody = wrap.querySelector('tbody');
      if (tbody) {
        tbody.addEventListener('click', (e) => {
          const remapBtn = e.target.closest('.gc-remap-btn');
          const unmapBtn = e.target.closest('.gc-unmap-btn');
          const inputId = remapBtn?.dataset.inputId || unmapBtn?.dataset.inputId;
          if (!inputId) return;
          if (remapBtn) this._startRemap(inputId);
          if (unmapBtn) this._unmap(inputId);
        });
      }
    }
  }

  _refreshPanel() {
    if (!this._el) return;
    this._el.innerHTML = this._panelHTML();
    this._bindEvents(this._el);
  }

  // ── Toast ──────────────────────────────────────────

  _toast(msg) {
    showToast(msg);
  }
}

// ── Standalone toast ─────────────────────────────────

let _toastTimer = null;

/**
 * 页面右下角弹出通知。可被 panel 和 index.js 共用。
 * @param {string} msg
 * @param {number} [duration=2500] 显示时长 ms
 */
export function showToast(msg, duration = 2500) {
  // 清除上一个 toast，避免堆叠
  if (_toastTimer) clearTimeout(_toastTimer);
  const existing = document.querySelector('.gc-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'gc-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  _toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      _toastTimer = null;
    }, 300);
  }, duration);
}

// ── HTML escaping helpers ────────────────────────────

function escHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
