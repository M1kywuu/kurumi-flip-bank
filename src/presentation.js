import { WinConfetti } from './celebration.js';
// Presentation stays separate from the physical machine and interchangeable pages.
export class ToyPresentation {
  constructor(theme, reducedMotion) {
    this.canvas = document.getElementById('ambient-chart');
    this.overlay = document.getElementById('loss-cut');
    this.reducedMotion = reducedMotion;
    this.confetti = new WinConfetti(document.querySelector('.scene-window'), reducedMotion);
    document.getElementById('loss-dismiss').addEventListener('click', () => this.closeLoss());
    window.addEventListener('keydown', event => { if (event.key === 'Escape') this.closeLoss(); });
    this.setTheme(theme);
  }
  setTheme(theme) {
    this.closeLoss(); this.closeCelebration(); this.theme = theme; this.page = -1;
    document.body.dataset.theme = theme.id;
    this.canvas.hidden = theme.id !== 'kurumi';
    if (theme.id === 'kurumi') {
      this.overlay.style.setProperty('--portrait', `url("${new URL(theme.artwork, document.baseURI).href}")`);
      this.setPage(0);
    }
  }
  setPage(index) {
    if (index === this.page || this.theme.id !== 'kurumi' || (this.reducedMotion && this.page !== -1)) return;
    this.page = index;
    const page = this.theme.pages[index];
    if (!page?.candles?.length) return;
    const ctx = this.canvas.getContext('2d'), { width, height } = this.canvas;
    const { min, max } = page.domain;
    const y = price => height - 36 - (price - min) / (max - min) * (height - 72);
    const pitch = width / page.candles.length;
    ctx.clearRect(0, 0, width, height);
    page.candles.forEach((bar, i) => {
      const x = pitch * (i + .5), open = y(bar.open), close = y(bar.close);
      ctx.strokeStyle = ctx.fillStyle = bar.close >= bar.open ? '#FF9FC7' : '#4fdfdf';
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y(bar.high)); ctx.lineTo(x, y(bar.low)); ctx.stroke();
      ctx.fillRect(x - pitch * .18, Math.min(open, close), pitch * .36, Math.max(3, Math.abs(open - close)));
    });
  }
  showLoss() {
    if (this.theme.id !== 'kurumi') return;
    this.closeCelebration();
    clearTimeout(this.lossTimer);
    this.overlay.hidden = false;
    this.lossTimer = setTimeout(() => this.closeLoss(), 2600);
  }
  closeLoss() {
    clearTimeout(this.lossTimer);
    this.overlay.hidden = true;
  }
  celebrate(profile) { this.confetti.show(profile); }
  closeCelebration() { this.confetti.close(); }
}
