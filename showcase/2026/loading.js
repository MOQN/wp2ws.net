import { DefaultLoadingManager, FileLoader } from 'three';

const tasks = new Set();
const requests = new Map();
let indicator;
let label;
let percentage;
let active = false;
let failed = false;
let lastPercent = 0;
let hideTimer;
let currentDownload;

function render() {
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'showcase-loading';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('aria-atomic', 'true');
    Object.assign(indicator.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '2147483647',
      padding: '12px 18px',
      background: 'rgba(0, 0, 0, 0.75)',
      color: '#fff',
      font: '400 14px/1.6 system-ui, sans-serif',
      textAlign: 'center',
      pointerEvents: 'none',
    });
    label = document.createElement('div');
    percentage = document.createElement('div');
    indicator.append(label, percentage);
    document.body.appendChild(indicator);
  }

  indicator.hidden = false;
  const complete = [...tasks].every(task => task.done);
  const progress = [...tasks].reduce((sum, task) => sum + task.progress, 0) / tasks.size;
  lastPercent = complete ? 100 : Math.min(99, Math.max(lastPercent, Math.floor(progress * 100)));
  const nextLabel = failed ? 'Loading failed' : 'Loading';
  const nextPercentage = failed ? 'Check console' : `${lastPercent}%`;
  if (label.textContent !== nextLabel) label.textContent = nextLabel;
  if (percentage.textContent !== nextPercentage) percentage.textContent = nextPercentage;
}

function startTask(resource) {
  clearTimeout(hideTimer);
  if (!active) {
    tasks.clear();
    failed = false;
    lastPercent = 0;
    active = true;
  }
  const task = {
    progress: 0,
    done: false,
    update(loaded, total) {
      if (this.done || total <= 0) return;
      this.progress = Math.min(0.99, loaded / total);
      render();
    },
    finish() {
      if (this.done) return;
      this.done = true;
      this.progress = 1;
      render();
      if ([...tasks].every(item => item.done)) {
        hideTimer = setTimeout(() => {
          active = false;
          indicator.hidden = !failed;
        }, 150);
      }
    },
    fail(error) {
      failed = true;
      console.error('Failed to load asset:', resource, error);
      this.finish();
    },
  };
  tasks.add(task);
  render();
  return task;
}

const manager = DefaultLoadingManager;
const itemStart = manager.itemStart;
const itemEnd = manager.itemEnd;
const itemError = manager.itemError;

manager.itemStart = function (url) {
  if (currentDownload && currentDownload.url === undefined) currentDownload.url = url;
  if (!requests.has(url)) requests.set(url, []);
  requests.get(url).push(startTask(url));
  return itemStart.call(this, url);
};

manager.itemEnd = function (url) {
  const queue = requests.get(url);
  queue?.shift()?.finish();
  if (queue?.length === 0) requests.delete(url);
  return itemEnd.call(this, url);
};

manager.itemError = function (url) {
  requests.get(url)?.[0]?.fail(new Error(`Unable to load ${url}`));
  return itemError.call(this, url);
};

// Keep the manager's parse/decode completion tracking, adding byte progress for downloads.
const loadFile = FileLoader.prototype.load;
FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
  if (this.manager !== manager) {
    return loadFile.call(this, url, onLoad, onProgress, onError);
  }
  const download = {};
  const previousDownload = currentDownload;
  currentDownload = download;
  try {
    return loadFile.call(this, url, onLoad, event => {
      if (event.lengthComputable) {
        requests.get(download.url)?.forEach(task => task.update(event.loaded, event.total));
      }
      onProgress?.(event);
    }, onError);
  } finally {
    currentDownload = previousDownload;
  }
};

function trackMedia(media) {
  const task = startTask(media.currentSrc || media.src || 'Media');
  const cleanup = () => {
    media.removeEventListener('progress', update);
    media.removeEventListener('loadeddata', finish);
    media.removeEventListener('error', fail);
    media.removeEventListener('abort', fail);
  };
  const update = () => {
    if (!Number.isFinite(media.duration) || media.duration <= 0) return;
    let buffered = 0;
    for (let i = 0; i < media.buffered.length; i++) {
      buffered += media.buffered.end(i) - media.buffered.start(i);
    }
    task.update(buffered, media.duration);
  };
  const finish = () => {
    cleanup();
    task.finish();
  };
  const fail = () => {
    cleanup();
    task.fail(media.error || new Error('Media loading was aborted'));
  };
  media.addEventListener('progress', update);
  media.addEventListener('loadeddata', finish);
  media.addEventListener('error', fail);
  media.addEventListener('abort', fail);
  if (media.error) fail();
  else if (media.readyState >= 2) finish();
}

window.showcaseLoading = { trackMedia };
