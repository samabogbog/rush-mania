/** Small local synthesis bank: no network requests, activated by a player gesture. */
export class FeedbackAudio {
  private context: AudioContext | null = null;
  enabled = localStorage.getItem("mossvale-sfx") !== "off";
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Audio can be unavailable while the game remains playable. */
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("mossvale-sfx", this.enabled ? "on" : "off");
    if (this.enabled) this.unlock();
  }
  play(kind: "hit" | "magic" | "arrow" | "hurt" | "level" | "ui" | "step") {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== "running") return;
    const bank = {
      hit: [220, 80, 0.12, "triangle"],
      magic: [540, 1100, 0.2, "sine"],
      arrow: [1000, 200, 0.1, "triangle"],
      hurt: [140, 60, 0.16, "sawtooth"],
      level: [500, 1000, 0.35, "sine"],
      ui: [700, 900, 0.06, "sine"],
      step: [95, 65, 0.04, "triangle"],
    } as const;
    const [start, end, duration, type] = bank[kind];
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      end,
      ctx.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      kind === "step" ? 0.02 : 0.06,
      ctx.currentTime + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
