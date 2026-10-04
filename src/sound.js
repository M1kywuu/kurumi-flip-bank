export class ToySound {
  constructor() {
    this.enabled = true; this.context = null; this.master = null;
    this.buffers = new Map(); this.voices = new Set(); this.celebrationVersion = 0;
    this.sampleBytes = Promise.all(['applause', 'cheers'].map(async name => {
      try {
        const response = await fetch(new URL(`./assets/audio/${name}.mp3`, document.baseURI));
        if (!response.ok) return null;
        return [name, await response.arrayBuffer()];
      } catch { return null; }
    }));
  }
  async unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain(); this.master.connect(this.context.destination);
    }
    await this.context.resume();
    this.master.gain.setValueAtTime(this.enabled ? 1 : 0, this.context.currentTime);
    await this.decodeSamples();
  }
  async decodeSamples() {
    if (!this.context) return;
    this.decodeReady ||= this.sampleBytes.then(entries => Promise.all(entries.filter(Boolean).map(async ([name, bytes]) => {
      try { this.buffers.set(name, await this.context.decodeAudioData(bytes.slice(0))); } catch {}
    })));
    await this.decodeReady;
  }
  async setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) await this.unlock();
    else { this.stopCelebration(); this.master?.gain.setTargetAtTime(0, this.context.currentTime, .01); }
  }
  click(strength = 0.25) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, t = ctx.currentTime;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(680, t);
    oscillator.frequency.exponentialRampToValueAtTime(120, t + 0.023);
    gain.gain.setValueAtTime(strength * 0.14, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    oscillator.connect(gain); gain.connect(this.master); oscillator.start(t); oscillator.stop(t + 0.045);
  }
  coin() {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    [1650, 2320, 3100].forEach((f, i) => {
      const ctx = this.context, t = ctx.currentTime + i * 0.018;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.14);
    });
  }
  stopCelebration() {
    this.celebrationVersion++;
    for (const entry of this.voices) {
      try { entry.source.stop(); } catch {}
      entry.source.disconnect(); entry.gain.disconnect();
    }
    this.voices.clear();
  }
  async celebrate(profile) {
    this.stopCelebration();
    if (!profile || !this.enabled || !this.context || this.context.state !== 'running') return;
    const version = this.celebrationVersion;
    await this.decodeSamples();
    if (version !== this.celebrationVersion || !this.enabled || this.context.state !== 'running') return;
    const ctx = this.context, now = ctx.currentTime;
    for (const [name, volume] of [['applause', profile.clap], ['cheers', profile.cheer]]) {
      const buffer = this.buffers.get(name); if (!volume || !buffer) continue;
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      const duration = name === 'applause' && profile.tier === 'applause' ? Math.min(1.4, buffer.duration) : buffer.duration;
      source.buffer = buffer;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .035);
      gain.gain.setValueAtTime(volume, now + Math.max(.04, duration - .22)); gain.gain.linearRampToValueAtTime(0, now + duration);
      source.connect(gain); gain.connect(this.master);
      const entry = { source, gain }; this.voices.add(entry);
      source.onended = () => { this.voices.delete(entry); source.disconnect(); gain.disconnect(); };
      source.start(now, 0, duration);
    }
  }
}
