/**
 * i18n.js — 中英文手柄按键标签
 */

import { BUTTON_LABELS_ZH, BUTTON_LABELS_EN, AXIS_LABELS } from '../config/defaults.js';

/**
 * 检测页面语言偏好
 * @returns {'zh'|'en'}
 */
export function getLanguage() {
  const lang = navigator.language || '';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

/**
 * 获取按钮的显示标签
 * @param {number} index — 按钮索引 (0-16)
 * @param {'zh'|'en'} [lang]
 * @returns {string}
 */
export function getButtonLabel(index, lang) {
  lang = lang || getLanguage();
  const labels = lang === 'zh' ? BUTTON_LABELS_ZH : BUTTON_LABELS_EN;
  return labels[index] || `Button ${index}`;
}

/**
 * 获取轴的显示标签
 * @param {number} index — 轴索引
 * @param {'negative'|'positive'} direction
 * @param {'zh'|'en'} [lang]
 * @returns {string}
 */
export function getAxisLabel(index, direction, lang) {
  lang = lang || getLanguage();
  const entry = AXIS_LABELS.find(
    a => a.index === index && a.direction === direction
  );
  if (!entry) return `Axis ${index} ${direction === 'positive' ? '+' : '-'}`;
  return lang === 'zh' ? entry.labelZh : entry.labelEn;
}

/**
 * 所有可映射的输入项（展平列表）
 * @param {'zh'|'en'} [lang]
 * @returns {Array<{ id: string, label: string, type: 'button'|'axis', index: number, direction?: string }>}
 */
export function getAllInputs(lang) {
  lang = lang || getLanguage();
  const inputs = [];

  // 按钮 0-16
  for (let i = 0; i < 17; i++) {
    inputs.push({
      id: `button:${i}`,
      label: getButtonLabel(i, lang),
      type: 'button',
      index: i,
    });
  }

  // 轴 x2 (每轴正负两个方向)
  for (const axis of AXIS_LABELS) {
    inputs.push({
      id: `axis:${axis.index}:${axis.direction}`,
      label: lang === 'zh' ? axis.labelZh : axis.labelEn,
      type: 'axis',
      index: axis.index,
      direction: axis.direction,
    });
  }

  return inputs;
}
