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
    const activeProfile = this.storage.getActiveProfile(this.site);
    const profiles = this.storage.getProfiles(this.site);
    const connected = this.reader.connected;

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
        <button class="gc-btn-sm gc-btn-reset">还原默认</button>
        <button class="gc-btn-sm gc-btn-export">导出</button>
        <button class="gc-btn-sm gc-btn-import">导入</button>
        <button class="gc-btn-sm gc-btn-advanced">高级设置</button>
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
    btn.title = '打开手柄控制器';
    btn.style.display = 'none';
    btn.addEventListener('click', () => this._restore());
    return btn;
  }

  // ── Event Binding ──────────────────────────────────

  _bindEvents(el) {
    // Header buttons
    el.querySelector('.gc-btn-min').addEventListener('click', () => this._minimize());
    el.querySelector('.gc-btn-close').addEventListener('click', () => this.hide());

    // Profile
    el.querySelector('.gc-profile-select').addEventListener('change', (e) => {
      this._switchProfile(e.target.value);
    });
    el.querySelector('.gc-btn-add-profile').addEventListener('click', () => this._addProfile());
    el.querySelector('.gc-btn-del-profile').addEventListener('click', () => this._deleteProfile());

    // Table remap / unmap
    el.querySelector('tbody').addEventListener('click', (e) => {
      const remapBtn = e.target.closest('.gc-remap-btn');
      const unmapBtn = e.target.closest('.gc-unmap-btn');
      const inputId = remapBtn?.dataset.inputId || unmapBtn?.dataset.inputId;
      if (!inputId) return;

      if (remapBtn) this._startRemap(inputId);
      if (unmapBtn) this._unmap(inputId);
    });

    // Footer buttons
    el.querySelector('.gc-btn-add-mapping').addEventListener('click', () => this._addCustomMapping());
    el.querySelector('.gc-btn-reset').addEventListener('click', () => this._resetDefaults());
    el.querySelector('.gc-btn-export').addEventListener('click', () => this._exportConfig());
    el.querySelector('.gc-btn-import').addEventListener('click', () => this._importConfig());
    el.querySelector('.gc-btn-advanced').addEventListener('click', () => this._showAdvanced());

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

    if (pos.minimized) {
      this._minimize();
    }
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

  // ── Refresh ────────────────────────────────────────

  _refreshTable() {
    const wrap = this._el.querySelector('.gc-table-wrap');
    if (wrap) {
      wrap.innerHTML = this._tableHTML();
      // Re-bind table events
      const tbody = wrap.querySelector('tbody');
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

  _refreshPanel() {
    if (!this._el) return;
    this._el.innerHTML = this._panelHTML();
    this._bindEvents(this._el);
  }

  // ── Toast ──────────────────────────────────────────

  _toast(msg) {
    const el = document.createElement('div');
    el.className = 'gc-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 300);
    }, 2000);
  }
}

// ── HTML escaping helpers ────────────────────────────

function escHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
