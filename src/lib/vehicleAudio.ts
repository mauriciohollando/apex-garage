/**
 * Lightweight Web Audio engine + tire squeal for the test track.
 * No external assets — oscillators only.
 */
export class VehicleAudio {
  private ctx: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private squeal: OscillatorNode | null = null;
  private squealGain: GainNode | null = null;
  private master: GainNode | null = null;
  private started = false;

  async ensure() {
    if (this.started) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 900;
    this.engineFilter.connect(this.master);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0001;
    this.engineGain.connect(this.engineFilter);

    this.engine = this.ctx.createOscillator();
    this.engine.type = "sawtooth";
    this.engine.frequency.value = 55;
    this.engine.connect(this.engineGain);
    this.engine.start();

    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.value = 0.0001;
    this.squealGain.connect(this.master);

    this.squeal = this.ctx.createOscillator();
    this.squeal.type = "triangle";
    this.squeal.frequency.value = 1400;
    this.squeal.connect(this.squealGain);
    this.squeal.start();

    this.started = true;
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  update(opts: { rpm: number; throttle: number; slip: number; speed: number }) {
    if (!this.started || !this.ctx || !this.engine || !this.engineGain || !this.squeal || !this.squealGain || !this.engineFilter) {
      return;
    }
    const t = this.ctx.currentTime;
    const freq = 48 + (opts.rpm / 7000) * 220 + opts.throttle * 30;
    this.engine.frequency.setTargetAtTime(freq, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(700 + opts.throttle * 1400 + opts.rpm * 0.08, t, 0.08);
    const engVol = 0.02 + Math.min(0.2, opts.speed * 0.004) + opts.throttle * 0.12;
    this.engineGain.gain.setTargetAtTime(engVol, t, 0.06);

    const slipAmt = Math.max(0, opts.slip - 0.12);
    this.squeal.frequency.setTargetAtTime(900 + slipAmt * 1800 + opts.speed * 8, t, 0.04);
    this.squealGain.gain.setTargetAtTime(Math.min(0.18, slipAmt * 0.35), t, 0.04);
  }

  stop() {
    try {
      this.engine?.stop();
      this.squeal?.stop();
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.started = false;
    this.ctx = null;
  }
}
