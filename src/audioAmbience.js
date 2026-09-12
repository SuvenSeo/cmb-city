export function createAudioAmbience() {
  let ctx = null;
  let masterGain = null;
  let oceanGain = null;
  let waveFilter = null;
  let noiseNode = null;
  let lfoInterval = 0;
  let isPlaying = false;
  let volume = 0.5;

  function initContext() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Procedural Ocean Surf Synthesizer
    // 1. Generate 5 seconds of pink noise buffer
    const bufferSize = ctx.sampleRate * 5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Resonant Lowpass for coastal wave roar
    waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(320, ctx.currentTime);
    waveFilter.Q.setValueAtTime(3.5, ctx.currentTime);

    oceanGain = ctx.createGain();
    oceanGain.gain.setValueAtTime(0.01, ctx.currentTime);

    noiseNode.connect(waveFilter);
    waveFilter.connect(oceanGain);
    oceanGain.connect(masterGain);
    noiseNode.start(0);

    // Procedural 2-Stroke Tuk-Tuk Engine Synthesizer
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(26, ctx.currentTime);

    engineSubOsc = ctx.createOscillator();
    engineSubOsc.type = 'triangle';
    engineSubOsc.frequency.setValueAtTime(52, ctx.currentTime);

    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'bandpass';
    engineFilter.frequency.setValueAtTime(280, ctx.currentTime);
    engineFilter.Q.setValueAtTime(2.6, ctx.currentTime);

    engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(0, ctx.currentTime);

    engineOsc.connect(engineFilter);
    engineSubOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(masterGain);

    engineOsc.start(0);
    engineSubOsc.start(0);

    // Natural wave swelling LFO
    let wavePhase = 0;
    lfoInterval = window.setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      wavePhase += 0.05;
      const wave = Math.sin(wavePhase);
      const swell = (Math.sin(wavePhase * 0.5) + 1) * 0.5;
      const targetGain = Math.max(0.04, (wave * 0.5 + 0.5) * 0.45 * (0.6 + swell * 0.4));
      const targetFreq = 220 + (wave * 0.5 + 0.5) * 280;
      
      const now = ctx.currentTime;
      oceanGain.gain.setTargetAtTime(targetGain, now, 0.2);
      waveFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
    }, 100);
  }

  let engineOsc = null;
  let engineSubOsc = null;
  let engineFilter = null;
  let engineGain = null;

  return {
    get isPlaying() {
      return isPlaying;
    },
    start() {
      if (typeof window === 'undefined') return;
      initContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      isPlaying = true;
      if (masterGain) {
        masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
      }
    },
    stop() {
      isPlaying = false;
      if (ctx && masterGain) {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
    },
    toggle() {
      if (isPlaying) {
        this.stop();
      } else {
        this.start();
      }
      return isPlaying;
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (ctx && masterGain && isPlaying) {
        masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
      }
    },
    playTukTukHorn() {
      if (!ctx || ctx.state !== 'running' || !isPlaying) return;
      const now = ctx.currentTime;
      
      // Traditional dual-tone Colombo tuk-tuk horn: 620Hz & 780Hz
      const tones = [
        { freq1: 620, freq2: 780, start: now, dur: 0.09 },
        { freq1: 620, freq2: 780, start: now + 0.12, dur: 0.11 },
      ];

      tones.forEach(t => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const hornGain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(t.freq1, t.start);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(t.freq2, t.start);

        hornGain.gain.setValueAtTime(0, t.start);
        hornGain.gain.linearRampToValueAtTime(0.12 * volume, t.start + 0.01);
        hornGain.gain.linearRampToValueAtTime(0, t.start + t.dur);

        osc1.connect(hornGain);
        osc2.connect(hornGain);
        hornGain.connect(masterGain);

        osc1.start(t.start);
        osc2.start(t.start);
        osc1.stop(t.start + t.dur);
        osc2.stop(t.start + t.dur);
      });
    },
    updateTukTukEngine(speedKmH, isThrottle = false) {
      if (!ctx || ctx.state !== 'running' || !isPlaying) return;
      if (!engineGain || !engineOsc || !engineFilter) return;

      const now = ctx.currentTime;
      const normSpeed = Math.min(1.0, Math.max(0, speedKmH) / 45.0);

      // Idle at ~26Hz, accelerating up to ~88Hz
      const baseFreq = 26 + normSpeed * 56 + (isThrottle ? 10 : 0);
      engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
      if (engineSubOsc) engineSubOsc.frequency.setTargetAtTime(baseFreq * 2, now, 0.08);

      const filterCutoff = 240 + normSpeed * 460 + (isThrottle ? 140 : 0);
      engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.08);

      const targetGain = (0.04 + normSpeed * 0.14 + (isThrottle ? 0.06 : 0)) * volume;
      engineGain.gain.setTargetAtTime(targetGain, now, 0.06);
    },
    stopTukTukEngine() {
      if (!ctx || !engineGain) return;
      engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    },
    dispose() {
      if (lfoInterval) clearInterval(lfoInterval);
      if (noiseNode) {
        try { noiseNode.stop(); } catch (_) {}
      }
      if (ctx) {
        try { ctx.close(); } catch (_) {}
      }
      ctx = null;
    }
  };
}
