import { FileLoader } from 'three';

// Violin: VSCO 2 Community Edition (CC0). Rupture sounds: Boyan Peng.
const files = [
  {
    id: 'arco-A5',
    file: 'vsco/source/LLVln_ArcoVib_A5_p.wav',
    midi: 81,
    articulation: 'arco',
    trimStart: 0.015,
    gain: 7.87745,
  },
  {
    id: 'arco-A6',
    file: 'vsco/source/LLVln_ArcoVib_A6_p.wav',
    midi: 93,
    articulation: 'arco',
    trimStart: 0.405,
    gain: 10.28912,
  },
  {
    id: 'arco-C5',
    file: 'vsco/source/LLVln_ArcoVib_C5_p.wav',
    midi: 72,
    articulation: 'arco',
    trimStart: 0,
    gain: 4.42288,
  },
  {
    id: 'arco-C6',
    file: 'vsco/source/LLVln_ArcoVib_C6_p.wav',
    midi: 84,
    articulation: 'arco',
    trimStart: 0,
    gain: 7.15372,
  },
  {
    id: 'arco-E5',
    file: 'vsco/source/LLVln_ArcoVib_E5_p.wav',
    midi: 76,
    articulation: 'arco',
    trimStart: 0.005,
    gain: 13.9686,
  },
  {
    id: 'arco-E6',
    file: 'vsco/source/LLVln_ArcoVib_E6_p.wav',
    midi: 88,
    articulation: 'arco',
    trimStart: 0.085,
    gain: 11.10257,
  },
  {
    id: 'pizz-A5',
    file: 'vsco/source/LLVln_Pizz_A5_p_RR1.wav',
    midi: 81,
    articulation: 'pizz',
    trimStart: 0,
    gain: 14.5456,
  },
  {
    id: 'pizz-E5',
    file: 'vsco/source/LLVln_Pizz_E5_p_RR1.wav',
    midi: 76,
    articulation: 'pizz',
    trimStart: 0,
    gain: 18.20444,
  },
  {
    id: 'remains-string-user-1',
    file: 'user/Remains_String_1.wav',
    articulation: 'composition',
    trimStart: 0,
    gain: 1,
    userProvided: true,
  },
  {
    id: 'remains-string-user-2',
    file: 'user/Remains_String_2.wav',
    articulation: 'composition',
    trimStart: 0,
    gain: 1,
    userProvided: true,
  },
];

// Load the recordings once Sound is enabled.
export async function loadSamples(context) {
  const entries = [];
  const loader = new FileLoader().setResponseType('arraybuffer');
  for (const sample of files) {
    const url = new URL('./assets/' + sample.file, import.meta.url);
    const data = await loader.loadAsync(url.href);
    const buffer = await context.decodeAudioData(data);
    entries.push({ ...sample, buffer });
  }
  return { entries, library: 'VSCO violin and original Logic Pro recordings' };
}

export const loadViolinSamples = loadSamples;

// Pick the nearest recorded note and adjust its playback speed.
export function chooseSample(bank, frequency, articulation = 'arco', sampleId = null) {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const candidates = bank.entries.filter((e) =>
    sampleId ? e.id === sampleId : e.articulation === articulation,
  );
  if (!candidates.length) throw new Error('Missing sound: ' + (sampleId || articulation));
  const entry = candidates.reduce((a, b) => (Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a));
  return { entry, rate: 2 ** ((midi - entry.midi) / 12), semitones: midi - entry.midi };
}
