import * as THREE from 'three';
import { MARKET_COLORS } from './story.js';

export const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('画页图片没有加载成功。'));
  image.src = src;
});

export function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function textTexture(text, { width = 512, height = 160, background = '#242e37', color = '#d7dfdf', font = '500 48px sans-serif', subtitle = '' } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const ctx = c.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height * (subtitle ? 0.40 : 0.5));
  if (subtitle) { ctx.font = '18px sans-serif'; ctx.globalAlpha = 0.65; ctx.fillText(subtitle, width / 2, height * 0.76); }
  return canvasTexture(c);
}

export function woodTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#bd8c59'; ctx.fillRect(0, 0, 512, 512);
  let seed = 128;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 720; i++) {
    const y = rnd() * 512, alpha = 0.015 + rnd() * 0.06;
    ctx.strokeStyle = `rgba(${rnd() > .55 ? '71,43,22' : '240,210,163'},${alpha})`;
    ctx.lineWidth = 0.3 + rnd() * 1.5; ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, y + Math.sin(x * .017 + y * .042) * 2.8 + Math.sin(x * .006) * 2);
    ctx.stroke();
  }
  const tex = canvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function cabinetPrintTexture({ band = false } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = band ? 64 : 768;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, c.width, c.height); ctx.clip();
  ctx.strokeStyle = '#ee87ab'; ctx.globalAlpha = band ? .32 : .14; ctx.lineWidth = band ? 12 : 16;
  const bottom = band ? 0 : c.height * .76;
  for (let x = -c.height; x < c.width; x += band ? 40 : 82) {
    ctx.beginPath(); ctx.moveTo(x, bottom); ctx.lineTo(x + c.height, bottom + c.height); ctx.stroke();
  }
  ctx.restore();
  if (!band) {
    const star = (x, y, r) => {
      ctx.beginPath(); ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * .18, y - r * .18, x + r, y);
      ctx.quadraticCurveTo(x + r * .18, y + r * .18, x, y + r);
      ctx.quadraticCurveTo(x - r * .18, y + r * .18, x - r, y);
      ctx.quadraticCurveTo(x - r * .18, y - r * .18, x, y - r);
      ctx.fillStyle = '#fff7c7'; ctx.fill(); ctx.strokeStyle = '#eaa0bc'; ctx.lineWidth = 3; ctx.stroke();
    };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e790ae'; ctx.font = 'bold 128px Georgia'; ctx.fillText('¥', 256, 518);
    star(115, 433, 32); star(391, 593, 24); star(360, 336, 19);
  }
  return canvasTexture(c);
}

export function cabinetBackTexture({ ink = '#cf759b', accent = '#68bfc1', coin = '#efc96e' } = {}) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 864;
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height);
  ctx.lineCap = ctx.lineJoin = 'round';
  const star = (x, y, r) => {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + r * .18, y - r * .18, x + r, y);
    ctx.quadraticCurveTo(x + r * .18, y + r * .18, x, y + r);
    ctx.quadraticCurveTo(x - r * .18, y + r * .18, x - r, y);
    ctx.quadraticCurveTo(x - r * .18, y - r * .18, x, y - r);
    ctx.fillStyle = coin; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
  };
  // A little rally, one spectacular plunge, and the coins still safe below.
  const bars = [[115,360,85],[195,295,110],[275,230,115],[355,175,90],[435,290,210],[515,410,240]];
  for (const [i, [x, y, h]] of bars.entries()) {
    ctx.strokeStyle = ctx.fillStyle = i < 4 ? ink : accent; ctx.globalAlpha = .78; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x, y + h + 25); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x - 13, y, 26, h, 6); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(90, 475); ctx.lineTo(175, 392); ctx.lineTo(246, 413); ctx.lineTo(334, 303); ctx.lineTo(415, 515); ctx.lineTo(493, 560); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(467, 559); ctx.lineTo(493, 560); ctx.lineTo(483, 532); ctx.stroke();
  ctx.globalAlpha = .9;
  for (const [x, y, count] of [[184,690,3],[305,712,2],[426,666,4]]) {
    for (let i = 0; i < count; i++) {
      ctx.beginPath(); ctx.roundRect(x - 46, y - i * 20, 92, 27, 13);
      ctx.fillStyle = coin; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 24, y - i * 20 + 10); ctx.lineTo(x + 24, y - i * 20 + 10); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1; star(100, 140, 37); star(520, 110, 24); star(552, 728, 27); star(93, 747, 17);
  return canvasTexture(c);
}

function drawMarket(canvas, page, index, atlas, layout) {
  const ctx = canvas.getContext('2d'), size = canvas.width;
  ctx.fillStyle = '#111924'; ctx.fillRect(0, 0, size, size);
  const bars = page.candles, domain = page.domain || {
    min: Math.min(...bars.map(b => b.low)) - .3, max: Math.max(...bars.map(b => b.high)) + .3,
  };
  const left = 42, right = 924, top = 96, bottom = 442;
  const priceY = price => bottom - (price - domain.min) / (domain.max - domain.min) * (bottom - top);
  ctx.font = '500 26px sans-serif'; ctx.fillStyle = '#c0cedc'; ctx.fillText(`${page.pair || 'FX'} · ${page.interval || '1D'}`, left, 54);
  ctx.font = '21px monospace'; ctx.fillStyle = '#7f94aa'; ctx.textAlign = 'right'; ctx.fillText(page.date, 980, 54);
  ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff10';
  for (let i = 0; i <= 4; i++) {
    const y = top + (bottom - top) * i / 4, price = domain.max - (domain.max - domain.min) * i / 4;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.fillText(price.toFixed(1), 990, y + 6);
  }
  const pitch = (right - left) / bars.length, body = pitch * .53;
  bars.forEach((bar, i) => {
    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) throw new Error('OHLC 数据不一致。');
    const x = left + pitch * (i + .5), yo = priceY(bar.open), yc = priceY(bar.close);
    const color = bar.close >= bar.open ? MARKET_COLORS.up : MARKET_COLORS.down;
    ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, priceY(bar.high)); ctx.lineTo(x, priceY(bar.low)); ctx.stroke();
    ctx.fillRect(x - body / 2, Math.min(yo, yc), body, Math.max(2.2, Math.abs(yo - yc)));
  });
  const last = bars.at(-1), lastY = priceY(last.close), lastColor = last.close >= last.open ? MARKET_COLORS.up : MARKET_COLORS.down;
  ctx.strokeStyle = lastColor; ctx.globalAlpha = .5; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(left, lastY); ctx.lineTo(right, lastY); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.font = '20px monospace'; ctx.fillStyle = '#7f94aa'; ctx.textAlign = 'left'; ctx.fillText(page.xLabels?.[0] ?? String(bars[0].time).slice(5), left, 478); ctx.textAlign = 'right'; ctx.fillText(page.xLabels?.[1] ?? String(last.time).slice(5), right, 478);
  const columns = layout?.columns || 2, rows = layout?.rows || 2;
  const cw = atlas.width / columns, ch = atlas.height / rows, expression = page.expression || 0;
  ctx.drawImage(atlas, (expression % columns) * cw + .8, Math.floor(expression / columns) * ch + .8, cw - 1.6, ch - 1.6, 12, 428, 646, 646);
  ctx.textAlign = 'right'; ctx.fillStyle = '#c6d2dd'; ctx.font = '500 29px sans-serif';
  ctx.fillText(page.value < 0 ? '含み損' : '含み益', 966, 748);
  ctx.fillStyle = page.value >= 0 ? MARKET_COLORS.up : MARKET_COLORS.down; ctx.font = '600 88px sans-serif';
  ctx.fillText(`${page.value >= 0 ? '+' : '−'}${Math.abs(page.value)}`, 969, 844);
  ctx.font = '34px sans-serif'; ctx.fillText('%', 965, 896);
  ctx.font = '23px monospace'; ctx.fillStyle = '#8ea0b2'; ctx.fillText(page.price.toFixed(2), 963, 956);
  ctx.textAlign = 'left';
}

export async function createPageTextures(theme) {
  const atlas = theme.artwork ? await loadImage(theme.artwork) : null;
  const pairs = [];
  try {
    for (const [index, page] of theme.pages.entries()) {
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      if (page.image) {
        const img = await loadImage(page.image), ctx = c.getContext('2d');
        ctx.fillStyle = page.background || '#111b2a'; ctx.fillRect(0, 0, 1024, 1024);
        const scale = Math.min(1024 / img.width, 1024 / img.height);
        ctx.drawImage(img, (1024 - img.width * scale) / 2, (1024 - img.height * scale) / 2, img.width * scale, img.height * scale);
      } else drawMarket(c, page, index, atlas, theme.atlas);
      const upper = document.createElement('canvas'), lower = document.createElement('canvas');
      upper.width = lower.width = 1024; upper.height = lower.height = 512;
      upper.getContext('2d').drawImage(c, 0, 0, 1024, 512, 0, 0, 1024, 512);
      lower.getContext('2d').drawImage(c, 0, 512, 1024, 512, 0, 0, 1024, 512);
      const top = canvasTexture(upper), bottom = canvasTexture(lower);
      bottom.repeat.y = -1; bottom.offset.y = 1;
      pairs.push({ top, bottom });
    }
    return pairs;
  } catch (error) { pairs.forEach(p => { p.top.dispose(); p.bottom.dispose(); }); throw error; }
}
