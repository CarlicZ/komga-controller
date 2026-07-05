/**
 * youtube.js — YouTube 预设
 */
export const youtube = {
  id: 'youtube',
  name: 'YouTube',
  description: 'A=播放/暂停，B=全屏，十字键=音量/进度',
  mapping: [
    { type: 'button', index: 0, key: 'k' },
    { type: 'button', index: 1, key: 'f' },
    { type: 'button', index: 2, key: 'm' },
    { type: 'button', index: 3, key: 'c' },

    { type: 'button', index: 4, key: 'j' },
    { type: 'button', index: 5, key: 'l' },
    { type: 'button', index: 6, key: 'ArrowLeft' },
    { type: 'button', index: 7, key: 'ArrowRight' },

    { type: 'button', index: 8, key: 'Escape' },
    { type: 'button', index: 9, key: 'f' },

    { type: 'button', index: 12, key: 'ArrowUp' },
    { type: 'button', index: 13, key: 'ArrowDown' },
    { type: 'button', index: 14, key: 'ArrowLeft' },
    { type: 'button', index: 15, key: 'ArrowRight' },

    { type: 'axis', index: 0, direction: 'negative', key: 'ArrowLeft' },
    { type: 'axis', index: 0, direction: 'positive', key: 'ArrowRight' },
    { type: 'axis', index: 1, direction: 'negative', key: 'ArrowUp' },
    { type: 'axis', index: 1, direction: 'positive', key: 'ArrowDown' },
  ],
};
