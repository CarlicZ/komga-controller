/**
 * komga-reading.js — Komga 纵向阅读模式预设
 *
 * 适用于漫画/小说类阅读场景。
 * 十字键上下映射为左右方向键，方便翻页；
 * Start/Select 映射为 Home/End 快速跳转。
 */
export const komgaReading = {
  id: 'komga-reading',
  name: 'Komga 纵向阅读',
  description: '十字键上下 → 左右翻页，Start=Home，Select=End，LB=f，RB=d',
  mapping: [
    // 功能键 — 未映射（用十字键翻页）
    { type: 'button', index: 0, key: '' },
    { type: 'button', index: 1, key: '' },
    { type: 'button', index: 2, key: '' },
    { type: 'button', index: 3, key: '' },

    // 肩键
    { type: 'button', index: 4, key: 'f' },
    { type: 'button', index: 5, key: 'd' },
    { type: 'button', index: 6, key: '' },
    { type: 'button', index: 7, key: '' },

    // 菜单键
    { type: 'button', index: 8, key: 'End' },
    { type: 'button', index: 9, key: 'Home' },
    { type: 'button', index: 16, key: 'Escape' },

    // 十字键 — 上下翻页 → 左右方向键
    { type: 'button', index: 12, key: 'ArrowLeft' },
    { type: 'button', index: 13, key: 'ArrowRight' },
    { type: 'button', index: 14, key: 'ArrowLeft' },
    { type: 'button', index: 15, key: 'ArrowRight' },
  ],
};
