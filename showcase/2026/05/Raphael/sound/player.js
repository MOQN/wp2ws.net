import { RemainsSound, loadSamples } from './engine.js';

const toggle = document.querySelector('#sound'),
  status = document.querySelector('#sound-status');
let context = null,
  samples = null,
  engine = null,
  enabled = false,
  busy = false,
  previousTime = null,
  pauseTimer = null;
const levels = { master: 0.5 };

function makeEngine() {
  if (engine) {
    const old = engine;
    old.setAudible(false);
    setTimeout(() => old.destroy(), 90);
  }
  engine = new RemainsSound(context, { samples, ...levels });
  previousTime = null;
}
function updateUI(message) {
  toggle.querySelector('.button-label').textContent = busy ? 'Loading…' : 'Sound';
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
  toggle.disabled = busy;
  status.textContent = message || (enabled ? 'Sound on' : 'Sound off');
}
function sync() {
  if (!window.remains || !engine) return;
  const state = remains.audioState();
  if (previousTime !== null && state.time < previousTime - 0.001) makeEngine();
  previousTime = state.time;
  const audible = enabled && !state.paused && !document.hidden;
  if (audible) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
    if (context.state === 'suspended') context.resume().catch(showError);
    engine.setAudible(true);
    engine.update(state);
  } else {
    engine.setAudible(false);
    if (!engine.last) engine.update(state);
    if (!pauseTimer && context.state === 'running')
      pauseTimer = setTimeout(() => {
        pauseTimer = null;
        if (!enabled || remains.audioState().paused || document.hidden) context.suspend().catch(showError);
      }, 90);
  }
}
function showError(error) {
  enabled = false;
  busy = false;
  engine?.setAudible(false);
  updateUI('Sound unavailable. Try again.');
  toggle.querySelector('.button-label').textContent = 'Retry sound';
  console.error(error);
}
// Start audio only after Sound is clicked.
toggle.addEventListener('click', async () => {
  if (busy) return;
  if (enabled) {
    enabled = false;
    updateUI();
    sync();
    return;
  }
  busy = true;
  updateUI();
  try {
    if (!context) context = new AudioContext({ latencyHint: 'interactive' });
    await context.resume();
    if (!samples) {
      samples = await loadSamples(context);
      makeEngine();
    }
    enabled = true;
    busy = false;
    updateUI();
    sync();
  } catch (error) {
    showError(error);
  }
});
document.addEventListener('keydown', (event) => {
  if (
    event.code === 'KeyM' &&
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !toggle.closest('[inert]') &&
    !event.target.closest('input,textarea,[contenteditable="true"]')
  )
    toggle.click();
});
const interval = setInterval(sync, 1000 / 30);
document.addEventListener('visibilitychange', sync);
window.addEventListener('pagehide', () => {
  clearInterval(interval);
  clearTimeout(pauseTimer);
  engine?.destroy();
  context?.close();
});
window.remainsAudio = {
  inspect: () => engine?.inspect(),
  context: () => context?.state,
  enabled: () => enabled,
};
updateUI();
