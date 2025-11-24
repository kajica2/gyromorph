
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Tension / LFO Nodes
  private tensionOsc: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private tensionLFO: OscillatorNode | null = null;
  private tensionFilter: BiquadFilterNode | null = null;
  private tensionLFO_Gain: GainNode | null = null;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Global volume
      }
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Continuous LFO Drone for extreme tilt
  // intensity: 0.0 to 1.0
  updateTension(intensity: number) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Initialize nodes if they don't exist
    if (!this.tensionOsc) {
        this.tensionOsc = this.ctx.createOscillator();
        this.tensionLFO = this.ctx.createOscillator();
        this.tensionFilter = this.ctx.createBiquadFilter();
        this.tensionGain = this.ctx.createGain();
        this.tensionLFO_Gain = this.ctx.createGain();

        // Signal Chain: Osc -> Filter -> Gain -> Master
        this.tensionOsc.type = 'sawtooth';
        this.tensionOsc.connect(this.tensionFilter);
        this.tensionFilter.connect(this.tensionGain);
        this.tensionGain.connect(this.masterGain!);

        // Modulation Chain: LFO -> LFO_Gain -> Filter.frequency
        this.tensionLFO.type = 'sine';
        this.tensionLFO.connect(this.tensionLFO_Gain);
        this.tensionLFO_Gain.connect(this.tensionFilter.frequency);

        // Initial Settings
        this.tensionOsc.start();
        this.tensionLFO.start();
        this.tensionGain.gain.setValueAtTime(0, t);
        this.tensionFilter.type = 'lowpass';
        this.tensionFilter.Q.value = 5; // Resonant
    }

    // Map intensity to audio parameters
    // If intensity is 0, mute it. If > 0, ensure it's audible.
    
    // 1. Volume: Smooth ramp
    const targetGain = intensity > 0.05 ? Math.min(intensity * 0.4, 0.4) : 0;
    this.tensionGain!.gain.setTargetAtTime(targetGain, t, 0.1);

    if (intensity > 0.05) {
        // 2. Pitch: Rising pitch with intensity (60Hz to 120Hz)
        this.tensionOsc!.frequency.setTargetAtTime(60 + (intensity * 60), t, 0.1);

        // 3. LFO Rate: Wobble faster with intensity (2Hz to 15Hz)
        this.tensionLFO!.frequency.setTargetAtTime(2 + (intensity * 13), t, 0.1);

        // 4. Filter: Open up the filter as intensity increases
        const baseFreq = 200 + (intensity * 800);
        this.tensionFilter!.frequency.setTargetAtTime(baseFreq, t, 0.1);
        
        // 5. Modulation Depth: How much the LFO affects the filter
        this.tensionLFO_Gain!.gain.setTargetAtTime(100 + (intensity * 400), t, 0.1);
    }
  }

  stopTension() {
    if (this.tensionGain && this.ctx) {
        this.tensionGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  // Soft pop/whoosh for spawning
  playSpawn() {
    if (!this.ctx || this.isMuted) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Thud/Bump for collisions
  playHit(intensity: number = 1) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

    const vol = Math.min(intensity, 1) * 0.5;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Magical chime for success
  playMatch() {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Chord: Root, Major 3rd, 5th
    const freqs = [523.25, 659.25, 783.99]; // C Major
    
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sine';
      osc.frequency.value = f;

      // Stagger entries slightly
      const start = t + (i * 0.05);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6);

      osc.start(start);
      osc.stop(start + 0.6);
    });
  }
}

export const audio = new SoundEngine();
