/* WORDROP — WebAudio による8bit効果音 */
(function () {
  let ac = null;
  let muted = false;
  try { muted = localStorage.getItem('wordrop.muted') === '1'; } catch (e) { /* ignore */ }

  function tone(freq, dur, type, vol, slideTo, when) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, when) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (when || 0);
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource();
    const g = ac.createGain();
    s.buffer = buf; g.gain.value = vol || 0.15;
    s.connect(g).connect(ac.destination);
    s.start(t0);
  }

  WD.Sfx = {
    unlock() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ac = new AC();
      }
      if (ac && ac.state === 'suspended') ac.resume();
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('wordrop.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      return muted;
    },
    play(name) {
      switch (name) {
        case 'blip': tone(880, 0.06, 'square', 0.05); break;
        case 'select': tone(660, 0.08, 'square', 0.06); tone(990, 0.1, 'square', 0.06, null, 0.07); break;
        case 'start': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.06, null, i * 0.08)); break;
        case 'land': tone(180, 0.08, 'triangle', 0.08, 90); break;
        case 'drop': tone(1400, 0.9, 'square', 0.04, 120); break;
        case 'impact': noise(0.5, 0.25); tone(110, 0.5, 'triangle', 0.15, 40); break;
        case 'thud': noise(0.12, 0.06); break;
        case 'stage': tone(784, 0.07, 'square', 0.05); tone(1175, 0.12, 'square', 0.05, null, 0.06); break;
        case 'type': tone(1200 + Math.random() * 200, 0.02, 'square', 0.015); break;
        case 'collapse': noise(1.4, 0.3); [392, 330, 262, 196, 131].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.06, null, i * 0.22)); break;
        case 'alarm': for (let i = 0; i < 4; i++) { tone(880, 0.18, 'sawtooth', 0.05, null, i * 0.36); tone(620, 0.18, 'sawtooth', 0.05, null, i * 0.36 + 0.18); } break;
        case 'unlock': [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, null, i * 0.09)); break;
        case 'fanfare': [523, 523, 523, 698, 880, 784, 1046].forEach((f, i) => tone(f, i === 6 ? 0.6 : 0.14, 'square', 0.06, null, i * 0.13)); break;
      }
    },
  };
})();
