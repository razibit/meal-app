/**
 * Apple Pay-style success chime using Web Audio API.
 * Works cross-platform: iOS Safari, Android Chrome, desktop browsers.
 *
 * The Web Audio API is unlocked after the first user gesture (tap/click),
 * and we resume the AudioContext on each call to handle Safari's auto-suspend.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    // Safari suspends the context after a period of silence
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a short, pleasant two-tone chime reminiscent of Apple Pay.
 * Uses two sine oscillators a major-third apart with a quick fade-out.
 */
export function playSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Master gain
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.18, now);
  master.gain.linearRampToValueAtTime(0, now + 0.35);
  master.connect(ctx.destination);

  // Tone 1 — E5 (659 Hz)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659.25, now);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0.6, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc1.connect(gain1);
  gain1.connect(master);
  osc1.start(now);
  osc1.stop(now + 0.3);

  // Tone 2 — A5 (880 Hz), starts slightly delayed for a "ding-ding" feel
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.08);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.5, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc2.connect(gain2);
  gain2.connect(master);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.35);
}
