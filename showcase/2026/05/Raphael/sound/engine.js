import { chooseSample, loadSamples, loadViolinSamples } from './samples.js?v=25-comments';
export { loadSamples, loadViolinSamples };
const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
const smooth = (x, a, b) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const target = (p, value, at, lag = 0.08) => p.setTargetAtTime(value, at, lag);
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class RemainsSound {
  constructor(
    context,
    {
      samples,
      master = 0.5,
      material = 0.11,
      effects = 0.35,
      space = 0.55,
      destination = context.destination,
    } = {},
  ) {
    if (!samples?.entries?.length) throw new Error('真实小提琴采样尚未载入');
    this.context = context;
    this.samples = samples;
    this.sources = new Set();
    this.voices = new Set();
    this.voiceRecords = [];
    this.eventLog = [];
    this.disposed = false;
    this.last = null;
    this.seen = new Map();
    this.serial = 0;
    this.levels = { master, material, effects, space };
    const c = context;
    this.input = c.createGain();
    this.material = c.createGain();
    this.space = c.createGain();
    this.mix = c.createGain();
    this.mix.gain.value = 2.0;
    this.effectsInput = c.createGain();
    this.effects = c.createGain();
    this.verb = c.createConvolver();
    this.verb.buffer = this.makeImpulse();
    const wet = c.createGain();
    wet.gain.value = 0.24;
    this.material.connect(this.mix);
    this.verb.connect(wet);
    wet.connect(this.space);
    this.space.connect(this.mix);
    const high = c.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 190;
    this.input.connect(high);
    high.connect(this.material);
    high.connect(this.verb);
    this.effectsInput.connect(this.effects);
    const edge = c.createBiquadFilter();
    edge.type = 'peaking';
    edge.frequency.value = 3400;
    edge.Q.value = 0.7;
    edge.gain.value = -1.6;
    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 8200;
    low.Q.value = 0.5;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -17;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 2.5;
    this.compressor.attack.value = 0.015;
    this.compressor.release.value = 0.34;
    this.output = c.createGain();
    this.gate = c.createGain();
    this.gate.gain.value = 0;
    this.effects.connect(this.output);
    const ceiling = c.createWaveShaper(),
      curve = new Float32Array(4097);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1,
        a = Math.abs(x);
      curve[i] = a <= 0.8 ? x : Math.sign(x) * (0.8 + 0.14 * Math.tanh((a - 0.8) / 0.14));
    }
    ceiling.curve = curve;
    ceiling.oversample = 'none';
    this.mix.connect(edge);
    edge.connect(low);
    low.connect(this.compressor);
    this.compressor.connect(this.output);
    this.output.connect(ceiling);
    ceiling.connect(this.gate);
    this.gate.connect(destination);
    this.nodes = [
      this.input,
      this.material,
      this.effectsInput,
      this.effects,
      this.space,
      this.mix,
      this.verb,
      wet,
      high,
      edge,
      low,
      this.compressor,
      this.output,
      ceiling,
      this.gate,
    ];
    this.strings = [587.33, 880, 1318.51].map((frequency, i) => ({
      frequency,
      pan: (i - 1) * 0.26,
      voice: null,
    }));
    this.bowState = [0, 0, 0];
    this.setLevels(this.levels);
  }

  makeImpulse() {
    const c = this.context,
      b = c.createBuffer(2, Math.ceil(c.sampleRate * 2.2), c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const rand = random(808 + ch * 991),
        d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / c.sampleRate;
        lp = 0.53 * lp + 0.47 * (rand() * 2 - 1);
        d[i] = t < 0.026 ? 0 : lp * Math.exp(-t * 3.6) * Math.min(1, (t - 0.026) / 0.075);
      }
    }
    return b;
  }
  setLevels(levels, at = this.context.currentTime) {
    Object.assign(this.levels, levels);
    for (const [key, node] of [
      ['master', this.output],
      ['material', this.material],
      ['effects', this.effects],
      ['space', this.space],
    ])
      target(node.gain, clamp(this.levels[key]), at, 0.035);
  }
  setAudible(value, at = this.context.currentTime) {
    target(this.gate.gain, value ? 1 : 0, at, 0.015);
  }

  makeVoice(frequency, at, { pan = 0, pluck = false, airy = false, bus = 'material', sampleId = null } = {}) {
    this.voiceRecords = this.voiceRecords.filter((v) => v.endsAt > at);
    if (this.disposed || this.voiceRecords.length >= 36) return null;
    const { entry, rate, semitones } = chooseSample(
      this.samples,
      frequency,
      pluck ? 'pizz' : 'arco',
      sampleId,
    );
    const c = this.context,
      source = c.createBufferSource(),
      gain = c.createGain(),
      panner = c.createStereoPanner(),
      filter = c.createBiquadFilter();
    source.buffer = entry.buffer;
    source.playbackRate.value = rate;
    source.loop = false;
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = bus === 'effects' ? 5200 : airy ? 6500 : 7600;
    gain.gain.value = 0;
    panner.pan.value = pan;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(bus === 'effects' ? this.effectsInput : this.input);
    const duration = (entry.buffer.duration - entry.trimStart) / rate;
    const voice = {
      source,
      gain,
      panner,
      filter,
      entry,
      rate,
      semitones,
      bus,
      at,
      endsAt: at + duration,
      naturalDuration: duration,
      nodes: [source, filter, gain, panner],
      stopping: false,
    };
    this.sources.add(source);
    this.voices.add(voice);
    this.voiceRecords.push(voice);
    source.onended = () => {
      voice.nodes.forEach((n) => n.disconnect());
      this.sources.delete(source);
      this.voices.delete(voice);
    };
    source.start(at, entry.trimStart);
    return voice;
  }
  release(voice, at, seconds = 0.42) {
    if (!voice || voice.stopping) return;
    voice.stopping = true;
    voice.gain.gain.cancelScheduledValues(at);
    target(voice.gain.gain, 0, at, seconds / 5);
    voice.endsAt = Math.min(voice.endsAt, at + seconds + 0.04);
    voice.source.stop(voice.endsAt);
  }
  log(kind, at, voice, extra = {}) {
    this.eventLog.push({
      kind,
      at,
      sample: voice.entry.id,
      instrument: voice.entry.userProvided
        ? 'user-logic-export'
        : 'recorded-' + (voice.entry.instrument || 'violin') + '-' + voice.entry.articulation,
      bus: voice.bus,
      playbackRate: voice.rate,
      loop: voice.source.loop,
      semitones: voice.semitones,
      frequency:
        voice.entry.midi === undefined ? null : 440 * 2 ** ((voice.entry.midi - 69 + voice.semitones) / 12),
      ...extra,
    });
    if (this.eventLog.length > 512) this.eventLog.shift();
  }

  gesture(
    kind,
    at,
    {
      duration = 0.9,
      level = 0.12,
      frequency = 880,
      pan = 0,
      spread = 0,
      attack = 0.14,
      pluck = false,
      airy = false,
      bus = 'material',
      sampleId = null,
    } = {},
  ) {
    const v = this.makeVoice(frequency, at, { pan, pluck, airy, bus, sampleId });
    if (!v) return;
    duration = Math.min(duration, v.naturalDuration - 0.025);
    const env = new Float32Array(128);
    for (let i = 0; i < env.length; i++) {
      const u = i / (env.length - 1),
        t = u * duration;
      const onset = smooth(t, 0, pluck ? 0.006 : Math.min(attack, duration * 0.3));
      const release = pluck
        ? 1 - smooth(u, 0.72, 1)
        : (0.82 + 0.18 * Math.sin(u * Math.PI)) * (1 - smooth(u, 0.44, 1));
      env[i] = entryLevel(v, level) * onset * release;
    }
    v.gain.gain.setValueCurveAtTime(env, at, duration);
    v.panner.pan.setValueAtTime(clamp(pan, -1, 1), at);
    v.panner.pan.linearRampToValueAtTime(clamp(pan + spread, -1, 1), at + duration);
    v.endsAt = at + duration + 0.025;
    v.source.stop(v.endsAt);
    v.stopping = true;
    this.log(kind, at, v, { duration, pan });
  }

  burst(final, at) {
    if (this.disposed) return;
    // Keep the original pitch of the two rupture recordings.
    const version = final ? 2 : 1;
    const entry = this.samples.entries.find((e) => e.id === `remains-string-user-${version}`);
    if (!entry) throw new Error(`缺少 Remains_String_${version}.wav`);
    const c = this.context,
      source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = entry.buffer;
    source.playbackRate.value = 1;
    source.loop = false;
    source.connect(gain);
    gain.connect(this.effectsInput);
    const duration = entry.buffer.duration,
      level = final ? 1 : 0.55;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.002);
    gain.gain.setValueAtTime(level, at + duration - 0.01);
    gain.gain.linearRampToValueAtTime(0, at + duration);
    const voice = {
      source,
      gain,
      entry,
      at,
      endsAt: at + duration,
      naturalDuration: duration,
      rate: 1,
      semitones: 0,
      bus: 'effects',
      nodes: [source, gain],
      stopping: true,
    };
    this.sources.add(source);
    this.voices.add(voice);
    this.voiceRecords.push(voice);
    source.onended = () => {
      voice.nodes.forEach((n) => n.disconnect());
      this.sources.delete(source);
      this.voices.delete(voice);
    };
    source.start(at, 0);
    source.stop(at + duration);
    this.log(final ? 'final-rupture' : 'first-rupture', at, voice, {
      duration,
      pan: 0,
      nativeRelease: true,
      level,
      unprocessedMix: true,
    });
  }

  update(s, at = this.context.currentTime) {
    if (this.disposed || !s || !Number.isFinite(s.time)) return;
    const story = s.story || {},
      core = story.core || {},
      rhythm = core.rhythm || {},
      previous = this.last;
    const jumped = previous && (s.time < previous.time - 0.001 || s.time - previous.time > 0.6),
      fresh = !previous || jumped;
    if (jumped) {
      this.seen.clear();
      for (const v of this.strings) {
        this.release(v.voice, at, 0.18);
        v.voice = null;
      }
    }
    const phase = story.phase || 'shell',
      inCore = ['regather', 'core', 'coreRupture'].includes(phase),
      final = story.finalAge >= 0;
    const absence = phase === 'gone' ? 0 : final ? 1 - smooth(story.finalAge, 1.1, 6.5) : 1;
    const pressure = clamp(rhythm.pressure ?? 0, 0, 1.5),
      breath = inCore ? clamp(pressure / 1.2) : clamp(((s.breath ?? 1) - 0.979) / 0.042);
    const strain = clamp(story.strain ?? 0),
      tension = clamp(core.tension ?? 0),
      speed = clamp((inCore ? core.speed : s.affectedSpeed) ?? 0, 0, 3);
    const flight = ['burst', 'crossing'].includes(phase),
      dt = fresh ? 0 : clamp(s.time - previous.time, 0, 0.2);
    const stroke = smooth(breath, inCore ? 0.2 : 0.22, inCore ? 0.72 : 0.82);
    this.strings.forEach((part, i) => {
      const follow = 1 - Math.exp(-dt / (0.08 + i * 0.16));
      this.bowState[i] = fresh ? stroke : this.bowState[i] + (stroke - this.bowState[i]) * follow;
      const bow = Math.pow(this.bowState[i], 1 + i * 0.27) * absence * (flight || final ? 0 : 1);
      if (part.voice && (bow < 0.013 || at > part.voice.endsAt - 0.5)) {
        this.release(part.voice, at);
        part.voice = null;
      }
      if (!part.voice && bow > 0.055) {
        part.voice = this.makeVoice(part.frequency, at, { pan: part.pan });
        if (part.voice) this.log('breath-bow', at, part.voice, { pan: part.pan });
      }
      if (part.voice) {
        const effort = 1 + (inCore ? tension : strain) * 0.09;
        target(part.voice.gain.gain, entryLevel(part.voice, [0.12, 0.26, 0.17][i]) * bow * effort, at, 0.1);
      }
    });

    const keys = new Set();
    for (const e of s.impactEvents || []) {
      const key = e.targetId + ':' + e.contactAt.toFixed(5);
      keys.add(key);
      let seen = this.seen.get(key);
      if (!seen) {
        seen = new Set();
        this.seen.set(key, seen);
      }
      const pan = clamp((e.center?.[0] || 0) / 3, -0.7, 0.7),
        pitch = [659.255, 880, 1046.5][Math.abs(e.targetId) % 3];
      const start = e.contactAt - (e.travel ?? 0.94);
      const emit = (name, time, fn) => {
        if (s.time >= time && !seen.has(name)) {
          seen.add(name);
          if (!fresh && s.time - time < 0.22) fn(at);
        }
      };
      emit('launch', start, (t) =>
        this.gesture('inflow', t, {
          duration: Math.max(0.45, e.travel ?? 0.94),
          level: 0.045,
          frequency: 1318.51,
          airy: true,
          pan: pan * 0.6,
          attack: 0.18,
        }),
      );
      emit('contact', e.contactAt, (t) =>
        this.gesture('contact', t, { duration: 0.8, level: 0.23, frequency: pitch, pluck: true, pan }),
      );
      emit('tear', e.hitAt, (t) =>
        this.gesture('local-tear', t, {
          duration: 1.05,
          level: 0.125 + strain * 0.03,
          frequency: pitch,
          pan,
          spread: pan * 0.13,
          attack: 0.115,
        }),
      );
    }
    for (const key of this.seen.keys()) if (!keys.has(key)) this.seen.delete(key);
    if (!fresh) {
      if (story.burstAge >= 0 && previous.burstAge < 0) this.burst(false, at);
      if (story.finalAge >= 0 && previous.finalAge < 0) this.burst(true, at);
      if (inCore && (rhythm.slips ?? 0) > previous.slips)
        this.gesture('held-fold-release', at, {
          duration: 1.05,
          level: 0.077,
          frequency: [880, 1046.5, 1318.51][rhythm.slips % 3],
          pan: Math.sin(rhythm.slips * 2.1) * 0.4,
          attack: 0.2,
        });
      if (
        !inCore &&
        !flight &&
        !final &&
        speed > 0.65 &&
        previous.speed <= 0.65 &&
        s.time - this.lastRecovery > 1.4
      ) {
        this.gesture('recovery-slip', at, { duration: 1.05, level: 0.086, frequency: 1174.66, attack: 0.2 });
        this.lastRecovery = s.time;
      }
    } else this.lastRecovery = s.time;
    this.last = {
      time: s.time,
      burstAge: story.burstAge ?? -1,
      finalAge: story.finalAge ?? -1,
      slips: rhythm.slips ?? 0,
      speed,
      phase,
    };
  }
  inspect() {
    return {
      instrument: 'user-pair-v10',
      library: this.samples.library,
      samples: this.samples.entries.length,
      voices: this.voices.size,
      sources: this.sources.size,
      events: this.eventLog.slice(),
      levels: { ...this.levels },
      phase: this.last?.phase,
    };
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    for (const v of this.voices) {
      try {
        v.source.stop();
      } catch {}
      v.nodes.forEach((n) => n.disconnect());
    }
    this.nodes.forEach((n) => n.disconnect());
    this.sources.clear();
    this.voices.clear();
    this.voiceRecords = [];
  }
}
function entryLevel(voice, level) {
  return level * voice.entry.gain;
}
