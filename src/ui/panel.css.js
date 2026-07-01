/**
 * panel.css.js — 悬浮面板完整样式表
 * 以模板字符串导出，启动时注入 <style id="gc-styles"> 到 <head>
 *
 * 所有 class 使用 gc- 前缀避免与页面冲突
 */

export const PANEL_CSS = /* css */ `
/* ── 面板容器 ──────────────────────────────── */
#gc-panel {
  position: fixed;
  z-index: 2147483646;
  width: 480px;
  max-height: 80vh;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  user-select: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #45475a;
}

/* ── Header ────────────────────────────────── */
#gc-panel .gc-header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #181825;
  border-bottom: 1px solid #313244;
  cursor: move;
  border-radius: 12px 12px 0 0;
  gap: 8px;
}

#gc-panel .gc-header .gc-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #cdd6f4;
}

#gc-panel .gc-header .gc-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #a6adc8;
  cursor: pointer;
  border-radius: 6px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
#gc-panel .gc-header .gc-btn:hover {
  background: #313244;
  color: #cdd6f4;
}
#gc-panel .gc-header .gc-btn-close:hover {
  background: #f38ba8;
  color: #1e1e2e;
}

/* ── Status bar ─────────────────────────────── */
#gc-panel .gc-status {
  padding: 8px 14px;
  font-size: 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

#gc-panel .gc-status .gc-connected {
  color: #a6e3a1;
}
#gc-panel .gc-status .gc-disconnected {
  color: #f38ba8;
}

/* ── Profile bar ────────────────────────────── */
#gc-panel .gc-profile-bar {
  padding: 8px 14px;
  background: #181825;
  border-bottom: 1px solid #313244;
  display: flex;
  align-items: center;
  gap: 8px;
}

#gc-panel .gc-profile-bar label {
  font-size: 12px;
  color: #a6adc8;
  white-space: nowrap;
}

#gc-panel .gc-profile-bar select {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #45475a;
  border-radius: 6px;
  background: #313244;
  color: #cdd6f4;
  font-size: 12px;
  outline: none;
}

#gc-panel .gc-profile-bar .gc-btn-sm {
  padding: 4px 10px;
  border: 1px solid #45475a;
  border-radius: 6px;
  background: #313244;
  color: #cdd6f4;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
#gc-panel .gc-profile-bar .gc-btn-sm:hover {
  background: #45475a;
}
#gc-panel .gc-profile-bar .gc-btn-danger {
  border-color: #f38ba8;
  color: #f38ba8;
}
#gc-panel .gc-profile-bar .gc-btn-danger:hover {
  background: #f38ba8;
  color: #1e1e2e;
}

/* ── Table ──────────────────────────────────── */
#gc-panel .gc-table-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

#gc-panel .gc-table-wrap::-webkit-scrollbar {
  width: 6px;
}
#gc-panel .gc-table-wrap::-webkit-scrollbar-thumb {
  background: #45475a;
  border-radius: 3px;
}

#gc-panel table {
  width: 100%;
  border-collapse: collapse;
}

#gc-panel thead th {
  position: sticky;
  top: 0;
  background: #181825;
  color: #a6adc8;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 14px;
  text-align: left;
  border-bottom: 1px solid #313244;
  z-index: 1;
}

#gc-panel tbody td {
  padding: 7px 14px;
  border-bottom: 1px solid rgba(49, 50, 68, 0.5);
  font-size: 12px;
}

#gc-panel tbody tr:hover {
  background: rgba(49, 50, 68, 0.4);
}

#gc-panel .gc-col-input {
  width: 40%;
}
#gc-panel .gc-col-key {
  width: 35%;
}
#gc-panel .gc-col-action {
  width: 25%;
  text-align: right;
}

#gc-panel .gc-key-unset {
  color: #6c7086;
  font-style: italic;
}

#gc-panel .gc-key-recording {
  color: #f9e2af;
  font-weight: 600;
  animation: gc-pulse 1.2s ease-in-out infinite;
}

@keyframes gc-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

#gc-panel .gc-remap-btn {
  padding: 3px 12px;
  border: 1px solid #89b4fa;
  border-radius: 5px;
  background: transparent;
  color: #89b4fa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
#gc-panel .gc-remap-btn:hover {
  background: #89b4fa;
  color: #1e1e2e;
}

#gc-panel .gc-unmap-btn {
  padding: 3px 8px;
  border: 1px solid #f38ba8;
  border-radius: 5px;
  background: transparent;
  color: #f38ba8;
  font-size: 11px;
  cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s;
}
#gc-panel .gc-unmap-btn:hover {
  background: #f38ba8;
  color: #1e1e2e;
}

/* ── Footer ─────────────────────────────────── */
#gc-panel .gc-footer {
  display: flex;
  padding: 8px 14px;
  gap: 8px;
  background: #181825;
  border-top: 1px solid #313244;
  border-radius: 0 0 12px 12px;
  flex-wrap: wrap;
}

#gc-panel .gc-footer .gc-btn-sm {
  padding: 4px 10px;
  border: 1px solid #45475a;
  border-radius: 6px;
  background: #313244;
  color: #cdd6f4;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
#gc-panel .gc-footer .gc-btn-sm:hover {
  background: #45475a;
}

#gc-panel .gc-footer .gc-btn-primary {
  border-color: #89b4fa;
  color: #89b4fa;
}
#gc-panel .gc-footer .gc-btn-primary:hover {
  background: #89b4fa;
  color: #1e1e2e;
}

/* ── Minimized button ────────────────────────── */
#gc-mini-btn {
  position: fixed;
  z-index: 2147483646;
  bottom: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #1e1e2e;
  color: #cdd6f4;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #45475a;
  transition: transform 0.15s, box-shadow 0.15s;
}
#gc-mini-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

/* ── Toast ──────────────────────────────────── */
.gc-toast {
  position: fixed;
  z-index: 2147483647;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  border-radius: 8px;
  background: #45475a;
  color: #cdd6f4;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: gc-toast-in 0.2s ease-out;
  pointer-events: none;
}

@keyframes gc-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── Drag ghost (prevent iframe capture) ─────── */
#gc-drag-overlay {
  position: fixed;
  z-index: 2147483645;
  top: 0; left: 0; right: 0; bottom: 0;
  display: none;
}
#gc-drag-overlay.gc-active {
  display: block;
}
`;
