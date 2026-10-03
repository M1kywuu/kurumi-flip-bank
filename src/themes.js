import { DEFAULT_STORY } from './story.js';
export const KURUMI_THEME = DEFAULT_STORY;

export function validateTheme(theme) {
  if (!theme || !Array.isArray(theme.pages) || theme.pages.length < 8 || theme.pages.length > 24) throw new Error('请装入 8–24 张画页。');
  if (theme.pages.some(p => !p.image && (!Number.isFinite(p.value) || !Array.isArray(p.candles)))) throw new Error('每张画页需要图片，或完整的行情数据。');
  if (theme.pages.some(p => !p.image) && !theme.artwork) throw new Error('行情主题需要角色图片。');
  if (theme.stopWeights && (!Array.isArray(theme.stopWeights) || theme.stopWeights.length !== theme.pages.length || theme.stopWeights.some(w => !Number.isFinite(w) || w < 0) || !theme.stopWeights.some(w => w > 0))) throw new Error('停页权重与画页不匹配。');
  return theme;
}
