export function celebrationFor(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 95) return { tier: 'jackpot', pieces: 112, duration: 3.2, clap: .30, cheer: .46 };
  if (value >= 65) return { tier: 'cheer', pieces: 68, duration: 2.8, clap: 0, cheer: .36 };
  return { tier: 'applause', pieces: 32, duration: 2.3, clap: .28, cheer: 0 };
}

// Paper jets are a lightweight overlay; the machine and its rigid bodies stay upright.
export class WinConfetti {
  constructor(host, reducedMotion) {
    this.host = host; this.reducedMotion = reducedMotion;
    this.canvas = document.createElement('canvas'); this.canvas.id = 'win-confetti';
    this.canvas.className = 'win-confetti'; this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.hidden = true; host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d'); this.particles = []; this.frame = 0;
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
  }
  resize() {
    this.width = this.host.clientWidth; this.height = this.host.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
    this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  show(profile) {
    this.close();
    if (!profile || this.reducedMotion) return;
    this.resize(); this.profile = profile;
    const colors = ['#ff78a6', '#17bcc8', '#fff7c7', '#fff8ef', '#efba61'];
    this.particles = Array.from({ length: profile.pieces }, (_, i) => {
      const direction = i % 2 ? -1 : 1, speed = profile.tier === 'jackpot' ? 1.1 : .95;
      return { x: direction > 0 ? -6 : this.width + 6, y: this.height * (.80 + Math.random() * .08),
        vx: direction * this.width * (.30 + Math.random() * .65),
        vy: -this.height * (.83 + Math.random() * .45) * speed,
        delay: Math.random() * .13, angle: Math.random() * Math.PI,
        spin: (Math.random() - .5) * 14, phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length], size: 4 + Math.random() * 4, ribbon: i % 4 === 0 };
    });
    this.canvas.hidden = false; this.canvas.dataset.tier = profile.tier;
    this.start = performance.now(); this.draw(this.start);
  }
  draw(now) {
    const elapsed = (now - this.start) / 1000, { width: w, height: h, ctx } = this;
    ctx.clearRect(0, 0, w, h);
    if (elapsed >= this.profile.duration) { this.close(); return; }
    for (const p of this.particles) {
      const t = elapsed - p.delay; if (t < 0) continue;
      const drag = (1 - Math.exp(-.85 * t)) / .85;
      const x = p.x + p.vx * drag + Math.sin(t * 7 + p.phase) * t * 5;
      const y = p.y + p.vy * t + h * .56 * t * t;
      if (y > h + 30 || x < -30 || x > w + 30) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle + p.spin * t);
      ctx.scale(1, .16 + Math.abs(Math.cos(t * 9 + p.phase)) * .84);
      ctx.globalAlpha = Math.min(1, Math.max(0, (this.profile.duration - elapsed) / .6));
      if (p.ribbon) {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.7; ctx.beginPath();
        ctx.moveTo(-p.size / 2, -p.size); ctx.quadraticCurveTo(p.size, 0, -p.size / 2, p.size); ctx.stroke();
      } else { ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .67); }
      ctx.restore();
    }
    this.frame = requestAnimationFrame(time => this.draw(time));
  }
  close() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.particles = [];
    this.ctx.clearRect(0, 0, this.width, this.height); this.canvas.hidden = true;
    delete this.canvas.dataset.tier;
  }
}
