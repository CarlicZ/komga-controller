/**
 * bilibili-manga.js — Bilibili 漫画预设
 *
 * 适用于 manga.bilibili.com 等漫画阅读站点。
 * 十字键 → 方向键翻页，LB=全屏，RB=C
 */
export const bilibiliManga = {
  id: 'bilibili-manga',
  name: 'Bilibili 漫画',
  description: '十字键=方向翻页，LB=全屏(F11)，RB=C',
  mapping: [
    // 功能键 — 未映射
    { type: 'button', index: 0, key: '' },
    { type: 'button', index: 1, key: '' },
    { type: 'button', index: 2, key: '' },
    { type: 'button', index: 3, key: '' },

    // 肩键
    { type: 'button', index: 4, key: 'F11' },
    { type: 'button', index: 5, key: 'c' },
    { type: 'button', index: 6, key: '' },
    { type: 'button', index: 7, key: '' },

    // 菜单键
    { type: 'button', index: 8, key: '' },
    { type: 'button', index: 9, key: '' },
    { type: 'button', index: 16, key: '' },

    // 十字键
    { type: 'button', index: 12, key: 'ArrowUp' },
    { type: 'button', index: 13, key: 'ArrowDown' },
    { type: 'button', index: 14, key: 'ArrowLeft' },
    { type: 'button', index: 15, key: 'ArrowRight' },
  ],
};
