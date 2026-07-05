/**
 * presets/index.js — 预设配置注册表
 *
 * 所有预设在此集中导出。面板的「加载预设」功能从此读取列表。
 * 新增预设只需创建文件并在此注册即可。
 */
import { komgaReading } from './komga-reading.js';
import { youtube } from './youtube.js';
import { bilibiliManga } from './bilibili-manga.js';

/** @type {Array<{ id: string, name: string, description: string, mapping: Array }>} */
export const PRESETS = [
  bilibiliManga,
  komgaReading,
  youtube,
];

/**
 * 根据 id 查找预设
 * @param {string} id
 * @returns {{ id: string, name: string, description: string, mapping: Array } | undefined}
 */
export function getPreset(id) {
  return PRESETS.find(p => p.id === id);
}

/**
 * 根据域名返回推荐的预设 id
 * @param {string} hostname
 * @returns {string}
 */
export function getRecommendedPresetId(hostname) {
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return 'youtube';
  }
  if (hostname.includes('bilibili.com')) {
    return 'bilibili-manga';
  }
  return 'komga-reading';
}
