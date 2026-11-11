/* ==========================================================
   背景音樂與音效（全部用 Web Audio 即時合成，沒有音檔、沒有版權問題，直播可以放心用）
   曲風：教堂地下墓室
   - 管風琴：加法合成（8' 4' 2⅔' 2' 疊音），每兩小節換一個和弦，慢慢淡入淡出
   - 合唱 pad：三條鋸齒波通過「啊」母音共振峰濾波，慢慢呼吸
   - 低音踏板音：最低音的持續音
   - 豎琴：Karplus-Strong 撥弦，慢速分解和弦 + 稀疏的旋律（A 和聲小調）
   - 教堂鐘：每八小節一聲低沉的鐘，偶爾有高處的小鈴
   和聲走向：Am – G – F – E（安達盧西亞終止，陰暗而戲劇性），每段旋律隨機產生
   瀏覽器規定要使用者先點過畫面才能發出聲音，所以第一次點擊時才真正開始
   ========================================================== */
const Music = (() => {
  const BPM = 52;
  const BEAT = 60 / BPM;
  const EIGHTH = BEAT / 2;
  const BAR = BEAT * 4;

  // 和聲走向：root 是低音踏板往上一個八度的 MIDI（A2 = 45），third 是三度的半音數
  const CHORDS = [
    { root: 45, third: 3 },  // Am
    { root: 43, third: 4 },  // G
    { root: 41, third: 4 },  // F
    { root: 40, third: 4 },  // E（大三和弦，含 G#，帶出和聲小調的導音）
  ];
  // A 和聲小調（旋律用），從 A4 到 A6
  const SCALE = [69, 71, 72, 74, 76, 77, 80, 81, 83, 84, 86, 88, 89, 92, 93];
  const ARP_PATTERNS = [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 1, 3, 2, 1, 0, 1], [0, 1, 2, 1, 3, 2, 1, 2], [3, 2, 1, 0, 1, 2, 3, 2]];

  let ctx = null, master, comp, musicBus, sfxBus, verb;
  let enabled = true, volume = 0.6, started = false;
  let timer = 0, nextBar = 0, bar = 0, melodyIdx = 4;
  const plucks = new Map();

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    master.connect(comp).connect(ctx.destination);
    // 殘響：6 秒的暗色空間（雜訊衰減，越後面越暗，像石造穹頂）
    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const a = 0.55 - 0.5 * k; // 越後面低通越重
        lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = lp * Math.pow(1 - k, 2.6);
      }
    }
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    verb.connect(wet).connect(master);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    for (const bus of [musicBus, sfxBus]) { bus.connect(master); bus.connect(verb); }
    sfxBus.gain.value = 0.8;
  }

  /* ---------- 聲音零件 ---------- */
  // 管風琴：多組泛音，慢起慢收
  function organNote(midi, time, dur, gain = 0.03) {
    const f = midiHz(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(gain, time + 1.1);
    env.gain.setValueAtTime(gain, time + dur);
    env.gain.linearRampToValueAtTime(0, time + dur + 2.6);
    lp.connect(env).connect(musicBus);
    for (const [ratio, amp] of [[1, 1], [2, 0.55], [3, 0.28], [4, 0.22], [6, 0.1]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      o.detune.value = (Math.random() - 0.5) * 6;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g).connect(lp);
      o.start(time);
      o.stop(time + dur + 2.8);
    }
  }
  // 低音踏板音
  function pedal(midi, time, dur) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.085, time + 1.4);
    env.gain.setValueAtTime(0.085, time + dur);
    env.gain.linearRampToValueAtTime(0, time + dur + 2.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 260;
    lp.connect(env).connect(musicBus);
    for (const [type, mul] of [['sine', 1], ['triangle', 1], ['sine', 2]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = midiHz(midi) * mul;
      const g = ctx.createGain();
      g.gain.value = mul === 2 ? 0.35 : 1;
      o.connect(g).connect(lp);
      o.start(time);
      o.stop(time + dur + 2.4);
    }
  }
  // 合唱 pad：鋸齒波過兩個母音「啊」的共振峰
  function choir(midis, time, dur) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.5, time + 2.6);
    env.gain.setValueAtTime(0.5, time + dur);
    env.gain.linearRampToValueAtTime(0, time + dur + 3.2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18 + Math.random() * 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(env.gain);
    lfo.start(time);
    lfo.stop(time + dur + 3.4);
    env.connect(musicBus);
    for (const [freq, q, amp] of [[780, 7, 1], [1180, 9, 0.55], [2500, 10, 0.2]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0.05 * amp;
      bp.connect(g).connect(env);
      for (const m of midis) {
        for (const det of [-9, 9]) {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = midiHz(m);
          o.detune.value = det + (Math.random() - 0.5) * 5;
          o.connect(bp);
          o.start(time);
          o.stop(time + dur + 3.4);
        }
      }
    }
  }
  // 撥弦（豎琴）：先算好一段聲音存起來，同一個音重複使用
  function pluckBuffer(midi) {
    if (plucks.has(midi)) return plucks.get(midi);
    const sr = ctx.sampleRate, f = midiHz(midi);
    const n = Math.floor(sr * 3.6);
    const p = Math.max(2, Math.floor(sr / f));
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(p);
    let lp = 0;
    for (let i = 0; i < p; i++) { lp = lp * 0.5 + (Math.random() * 2 - 1) * 0.5; ring[i] = lp; }
    const loss = Math.pow(0.12, 1 / f);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const cur = ring[idx], nxt = ring[(idx + 1) % p];
      ring[idx] = loss * 0.5 * (cur + nxt);
      d[i] = cur * Math.min(1, (n - i) / (sr * 0.25));
      idx = (idx + 1) % p;
    }
    const entry = { buf, rate: (f * (p + 0.5)) / sr };
    plucks.set(midi, entry);
    return entry;
  }
  function pluck(midi, time, gain = 0.4, bus = musicBus, pan = (Math.random() - 0.5) * 0.7) {
    const { buf, rate } = pluckBuffer(midi);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    src.connect(tone).connect(g).connect(pn).connect(bus);
    src.start(time);
  }
  // 教堂鐘：非諧波的泛音，衰減很長
  function bell(freq, time, gain = 0.07, decay = 9, bus = musicBus, ratios) {
    const parts = ratios || [[0.5, 0.6], [1, 1], [1.19, 0.55], [1.5, 0.35], [2, 0.4], [2.5, 0.2], [3.2, 0.12], [4.2, 0.08]];
    for (const [ratio, amp] of parts) {
      const o = ctx.createOscillator();
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(gain * amp, time + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, time + decay / (0.6 + ratio * 0.5));
      const pn = ctx.createStereoPanner();
      pn.pan.value = (Math.random() - 0.5) * 0.5;
      o.connect(g).connect(pn).connect(bus);
      o.start(time);
      o.stop(time + decay / (0.6 + ratio * 0.5) + 0.1);
    }
  }
  const glassBell = (freq, time, gain = 0.04, bus = musicBus) =>
    bell(freq, time, gain, 3.5, bus, [[1, 1], [2.76, 0.45], [5.4, 0.2]]);

  /* ---------- 排曲：每次一小節 ---------- */
  function scheduleBar(t) {
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    const r = chord.root;
    const tones = [r + 24, r + 24 + chord.third, r + 31, r + 36]; // 根音、三度、五度、八度（豎琴用）
    if (bar % 2 === 0) {
      const dur = BAR * 2;
      pedal(r - 12, t, dur);
      for (const m of [r, r + 7, r + 12, r + 12 + chord.third, r + 19]) organNote(m, t, dur, 0.03);
      choir([r + 24, r + 24 + chord.third, r + 31], t, dur);
    }
    if (bar % 8 === 0) bell(midiHz(57), t + 0.05, 0.08, 10);
    // 豎琴：慢速分解和弦
    const pattern = pick(ARP_PATTERNS);
    pattern.forEach((k, i) => {
      if (Math.random() < 0.12) return;
      pluck(tones[k], t + i * EIGHTH + (Math.random() - 0.5) * 0.02, i % 4 === 0 ? 0.3 : 0.2);
    });
    // 稀疏的旋律：高音區，在和聲小調上隨機走
    if (Math.random() < 0.7) {
      const count = pick([2, 3, 3, 4]);
      let at = pick([0, 1, 2]);
      for (let k = 0; k < count && at < 8; k++) {
        melodyIdx = Math.max(3, Math.min(SCALE.length - 1, melodyIdx + pick([-2, -1, -1, 0, 1, 1, 2])));
        pluck(SCALE[melodyIdx] + 12 * (melodyIdx < 5 ? 1 : 0), t + at * EIGHTH, 0.26);
        at += pick([1, 2, 2, 3]);
      }
    }
    // 高處偶爾一聲玻璃小鈴
    if (Math.random() < 0.18) glassBell(midiHz(pick([93, 96, 100])), t + Math.random() * BAR, 0.03);
    bar++;
  }

  function tick() {
    // 背景分頁的計時器會被放慢到一秒一次，所以提早排好一整小節
    while (nextBar < ctx.currentTime + BAR + 0.5) {
      scheduleBar(nextBar);
      nextBar += BAR;
    }
  }

  function start() {
    if (!ctx || started) return;
    started = true;
    ctx.resume();
    nextBar = ctx.currentTime + 0.3;
    bar = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(volume * 0.55, ctx.currentTime, 1.4);
    tick();
    timer = setInterval(tick, 200);
  }
  function stop() {
    if (!ctx || !started) return;
    started = false;
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  }

  /* ---------- 對外 ---------- */
  // 使用者第一次點擊 / 按鍵時呼叫
  function unlock() {
    init();
    if (enabled) start();
    else ctx.resume();
  }
  function setEnabled(on) {
    enabled = on;
    if (on) { init(); start(); } else stop();
  }
  function setVolume(v) {
    volume = v;
    if (ctx && started) master.gain.setTargetAtTime(volume * 0.55, ctx.currentTime, 0.1);
  }
  const ready = () => ctx && started;

  const sfx = {
    // 祭品落進棺材：玻璃般清脆的叮，帶一點低沉的回響
    coin() {
      if (!ready()) return;
      const t = ctx.currentTime;
      glassBell(midiHz(pick([88, 91, 93, 96])), t, 0.06, sfxBus);
      pluck(pick([69, 72, 76]), t + 0.03, 0.14, sfxBus);
    },
    // 開棺：一聲低沉的鐘，加上往上的管風琴和弦
    open() {
      if (!ready()) return;
      const t = ctx.currentTime;
      bell(midiHz(52), t, 0.09, 8, sfxBus);
      [45, 52, 57, 60, 64].forEach((m, i) => organNote(m, t + i * 0.12, 1.2, 0.03));
    },
    // 結尾：三聲鐘響，然後一串小鈴往下灑
    finale() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [0, 1.5, 3].forEach((d, i) => bell(midiHz(i === 2 ? 52 : 57), t + d, 0.08, 9, sfxBus));
      [100, 96, 93, 91, 88, 84, 81].forEach((m, i) => glassBell(midiHz(m), t + 0.6 + i * 0.14, 0.035, sfxBus));
      [45, 52, 57, 60, 64].forEach((m) => organNote(m, t + 0.2, 3.5, 0.028));
    },
  };

  return { unlock, setEnabled, setVolume, sfx, get enabled() { return enabled; }, get started() { return started; } };
})();
