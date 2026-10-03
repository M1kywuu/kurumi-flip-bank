export class ToySound {
  constructor() { this.enabled = false; this.context = null; this.lastClick = -1; }
  async setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) {
      this.context ||= new (window.AudioContext || window.webkitAudioContext)();
      await this.context.resume();
    }
  }
  click(strength = 0.25) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, t = ctx.currentTime;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(680, t);
    oscillator.frequency.exponentialRampToValueAtTime(120, t + 0.023);
    gain.gain.setValueAtTime(strength * 0.14, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(t); oscillator.stop(t + 0.045);
  }
  coin() {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    [1650, 2320, 3100].forEach((f, i) => {
      const ctx = this.context, t = ctx.currentTime + i * 0.018;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.14);
    });
  }
  crash() {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(38, t + .24);
    g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .26);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .27);
  }
  gain() {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    [880, 1109, 1320].forEach((f, i) => {
      const t = this.context.currentTime + i * .055, o = this.context.createOscillator(), g = this.context.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      o.connect(g); g.connect(this.context.destination); o.start(t); o.stop(t + .23);
    });
  }
}
