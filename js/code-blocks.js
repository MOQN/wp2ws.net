(function () {
  const defaultSourceCandidates = [
    'main.js',
    'js/main.js',
    'sketch.js',
    'js/sketch.js',
    'script.js',
    'js/script.js',
    'script-p5.js',
    'js/script-p5.js',
    'p5Script.js',
    'js/p5Script.js'
  ];

  function resolveFolder(folder) {
    if (folder) {
      return folder;
    }

    let pagePath = window.location.hash.replace(/^#\//, '').replace(/\/$/, '');
    if (!pagePath) {
      console.error('No page path detected.');
      return null;
    }

    let parts = pagePath.split('/');
    if (parts.length > 1) {
      parts.pop();
    }

    return parts.join('/');
  }

  function trimLeadingSlash(path) {
    return String(path || '').replace(/^\/+/, '');
  }

  function joinPath(base, subpath) {
    const cleanBase = String(base || '').replace(/\/+$/, '');
    const cleanSubpath = trimLeadingSlash(subpath);
    return cleanSubpath ? cleanBase + '/' + cleanSubpath : cleanBase;
  }

  function normalizeConfig(folderOrOptions, anchorId) {
    if (folderOrOptions && typeof folderOrOptions === 'object') {
      return {
        folder: folderOrOptions.folder || '',
        anchorId: folderOrOptions.anchorId || anchorId || null,
        sourcePath: folderOrOptions.sourcePath || null,
        sourceCandidates: Array.isArray(folderOrOptions.sourceCandidates)
          ? folderOrOptions.sourceCandidates
          : defaultSourceCandidates,
        framePath: folderOrOptions.framePath || null,
      };
    }

    return {
      folder: folderOrOptions,
      anchorId: anchorId || null,
      sourcePath: null,
      sourceCandidates: defaultSourceCandidates,
      framePath: null,
    };
  }

  function getInsertionTarget(anchorId) {
    const main = document.getElementById('main');
    if (!main) {
      console.error('Main container not found.');
      return null;
    }

    // Try to find the markdown-section for Docsify
    const markdownSection = document.querySelector('.markdown-section');
    const targetParent = markdownSection || main;

    const scriptAnchor = anchorId ? document.getElementById(anchorId) : document.currentScript;
    const insertionParent = (scriptAnchor && scriptAnchor.parentNode) ? scriptAnchor.parentNode : targetParent;
    const insertionTarget = scriptAnchor && scriptAnchor.parentNode === insertionParent ? scriptAnchor : null;

    return { main, insertionParent, insertionTarget };
  }

  function applyButtonStyle(button) {
    button.style.position = 'absolute';
    button.style.zIndex = '2';
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.border = '1px solid rgba(0, 0, 0, 0.12)';
    button.style.borderRadius = '999px';
    button.style.background = 'rgba(255, 255, 255, 0.92)';
    button.style.color = '#1C1678';
    button.style.fontFamily = "'Montserrat', sans-serif";
    button.style.fontSize = '12px';
    button.style.fontWeight = '600';
    button.style.lineHeight = '1';
    button.style.padding = '0.5rem 0.8rem';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.08)';
    button.style.transition = 'transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease';
    button.style.top = '12px';
    button.style.right = '12px';
  }

  function addCopyBehavior(copyButton, code) {
    copyButton.addEventListener('click', async function () {
      const source = code.textContent || '';

      try {
        await navigator.clipboard.writeText(source);
        copyButton.textContent = 'Copied';
        window.setTimeout(function () {
          copyButton.textContent = 'Copy';
        }, 1200);
      } catch (error) {
        const fallback = document.createElement('textarea');
        fallback.value = source;
        fallback.setAttribute('readonly', 'true');
        fallback.style.position = 'absolute';
        fallback.style.left = '-9999px';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        document.body.removeChild(fallback);
      }
    });
  }

  function addReloadBehavior(reloadButton, iframe, frameSrc) {
    reloadButton.addEventListener('click', function () {
      try {
        iframe.contentWindow.location.reload();
      } catch (error) {
        const joiner = frameSrc.indexOf('?') === -1 ? '?' : '&';
        iframe.src = frameSrc + joiner + 'reload=' + Date.now();
      }
    });
  }

  function fetchSourceText(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error('404 or bad path');
      return response.text();
    });
  }

  function fetchPreferredSource(folder, sourcePath, sourceCandidates) {
    if (sourcePath) {
      const explicitPath = joinPath(folder, sourcePath);
      return fetchSourceText(explicitPath).then(function (source) {
        return { source: source, sourceUrl: explicitPath };
      });
    }

    const candidates = (sourceCandidates && sourceCandidates.length)
      ? sourceCandidates
      : defaultSourceCandidates;

    let index = 0;
    function next() {
      if (index >= candidates.length) {
        throw new Error('No matching source file found in folder: ' + folder);
      }
      const candidate = trimLeadingSlash(candidates[index++]);
      const path = joinPath(folder, candidate);
      return fetchSourceText(path)
        .then(function (source) {
          return { source: source, sourceUrl: path };
        })
        .catch(next);
    }

    return next();
  }

  function applyCodeText(code, text) {
    code.textContent = text;
    if (window.Prism) {
      Prism.highlightAll();
    }
  }

  function parseCanvasSize(source) {
    const match = source.match(/createCanvas\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)/);
    if (!match) {
      return null;
    }

    const width = Math.round(Number(match[1]));
    const height = Math.round(Number(match[2]));

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }

    return {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  function createIframeBlock(frameSrc) {
    const iframeWrap = document.createElement('div');
    iframeWrap.className = 'sketch-frame-wrap';
    iframeWrap.style.position = 'relative';
    iframeWrap.style.margin = '0';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', frameSrc);
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '400');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.style.margin = '0';
    iframe.style.width = '100%';
    iframeWrap.appendChild(iframe);

    const reloadButton = document.createElement('button');
    reloadButton.type = 'button';
    reloadButton.className = 'sketch-action-button sketch-reload-button';
    reloadButton.textContent = 'Reload';
    reloadButton.setAttribute('aria-label', 'Reload sketch');
    applyButtonStyle(reloadButton);
    addReloadBehavior(reloadButton, iframe, frameSrc);
    iframeWrap.appendChild(reloadButton);

    return iframeWrap;
  }

  function createCodeBlock() {
    const codeWrap = document.createElement('div');
    codeWrap.className = 'code-block-wrap';
    codeWrap.style.position = 'relative';
    codeWrap.style.margin = '0';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'sketch-action-button sketch-copy-button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');
    applyButtonStyle(copyButton);
    codeWrap.appendChild(copyButton);

    const pre = document.createElement('pre');
    pre.style.margin = '0';
    pre.style.width = '100%';
    pre.style.minHeight = '400px';
    pre.style.marginBottom = '10px';

    const code = document.createElement('code');
    code.id = 'code-block';
    code.className = 'language-javascript';
    code.style.display = 'block';

    pre.appendChild(code);
    codeWrap.appendChild(pre);

    addCopyBehavior(copyButton, code);

    return { codeWrap, code };
  }

  function insertBlock(container, insertionParent, insertionTarget, main) {
    if (insertionTarget) {
      insertionParent.insertBefore(container, insertionTarget);
    } else {
      main.appendChild(container);
    }
  }

  // Horizontal layout (code left, canvas right)
  function loadCodeBlock(folderOrOptions, anchorId) {
    const config = normalizeConfig(folderOrOptions, anchorId);
    const resolvedFolder = resolveFolder(config.folder);
    if (!resolvedFolder) return;

    const frameSrc = config.framePath
      ? joinPath(resolvedFolder, config.framePath)
      : resolvedFolder;

    const insertion = getInsertionTarget(config.anchorId);
    if (!insertion) return;

    fetchPreferredSource(resolvedFolder, config.sourcePath, config.sourceCandidates)
      .then(function (result) {
        const canvasSize = parseCanvasSize(result.source);
        const canvasWidth = canvasSize ? canvasSize.width : 400;
        const canvasHeight = canvasSize ? canvasSize.height : 400;
        const useHorizontal = canvasWidth <= 400;

        const iframeWrap = createIframeBlock(frameSrc);
        const iframe = iframeWrap.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute('height', String(canvasHeight));
        }

        const codeBlock = createCodeBlock();

        if (useHorizontal) {
          const rowWrap = document.createElement('div');
          rowWrap.style.display = 'flex';
          rowWrap.style.flexWrap = 'nowrap';
          rowWrap.style.alignItems = 'flex-start';
          rowWrap.style.gap = '10px';
          rowWrap.style.margin = '10px 0';

          iframeWrap.style.flex = '0 0 ' + canvasWidth + 'px';
          iframeWrap.style.width = canvasWidth + 'px';
          iframeWrap.style.maxWidth = '100%';

          codeBlock.codeWrap.style.flex = '0 0 390px';
          codeBlock.codeWrap.style.width = '390px';
          codeBlock.codeWrap.style.maxWidth = '100%';

          rowWrap.appendChild(codeBlock.codeWrap);
          rowWrap.appendChild(iframeWrap);
          insertBlock(rowWrap, insertion.insertionParent, insertion.insertionTarget, insertion.main);
        } else {
          const stackWrap = document.createElement('div');
          stackWrap.style.margin = '10px 0';
          stackWrap.style.width = canvasWidth + 'px';
          stackWrap.style.maxWidth = '100%';

          iframeWrap.style.margin = '0 0 10px 0';
          iframeWrap.style.width = canvasWidth + 'px';
          iframeWrap.style.maxWidth = '100%';

          codeBlock.codeWrap.style.width = canvasWidth + 'px';
          codeBlock.codeWrap.style.maxWidth = '100%';

          stackWrap.appendChild(iframeWrap);
          stackWrap.appendChild(codeBlock.codeWrap);
          insertBlock(stackWrap, insertion.insertionParent, insertion.insertionTarget, insertion.main);
        }

        applyCodeText(codeBlock.code, result.source);
      })
      .catch(function (error) {
        console.error('Failed to load code:', error);
      });
  }

  // Stacked layout (iframe top, code block full width below)
  function loadCodeBlockWide(folderOrOptions, anchorId) {
    const config = normalizeConfig(folderOrOptions, anchorId);
    const resolvedFolder = resolveFolder(config.folder);
    if (!resolvedFolder) return;

    const frameSrc = config.framePath
      ? joinPath(resolvedFolder, config.framePath)
      : resolvedFolder;

    const insertion = getInsertionTarget(config.anchorId);
    if (!insertion) return;

    const stackWrap = document.createElement('div');
    stackWrap.style.margin = '10px 0';
    stackWrap.style.width = '800px';
    stackWrap.style.maxWidth = '100%';

    const iframeWrap = createIframeBlock(frameSrc);
    iframeWrap.style.margin = '0 0 10px 0';
    iframeWrap.style.width = '800px';
    iframeWrap.style.maxWidth = '100%';

    const codeBlock = createCodeBlock();
    codeBlock.codeWrap.style.width = '800px';
    codeBlock.codeWrap.style.maxWidth = '100%';

    stackWrap.appendChild(iframeWrap);
    stackWrap.appendChild(codeBlock.codeWrap);

    insertBlock(stackWrap, insertion.insertionParent, insertion.insertionTarget, insertion.main);
    fetchPreferredSource(resolvedFolder, config.sourcePath, config.sourceCandidates)
      .then(function (result) {
        applyCodeText(codeBlock.code, result.source);
      })
      .catch(function (error) {
        console.error('Failed to load code:', error);
      });
  }

  // New function to handle batch loading with automatic zero-padding
  function loadCodeBlocks(baseFolder, count) {
    for (let i = 1; i <= count; i++) {
      // padStart ensures single digits become two digits (e.g., 1 -> 01, 10 -> 10)
      const paddedNumber = String(i).padStart(2, '0');
      const targetFolder = baseFolder + paddedNumber;
      const targetAnchor = 'code-' + paddedNumber;

      loadCodeBlock(targetFolder, targetAnchor);
    }
  }

  function loadCodeBlocksFromEntries(entries) {
    if (!Array.isArray(entries)) return;

    entries.forEach(function (entry) {
      if (!entry) return;
      if (entry.layout === 'wide') {
        loadCodeBlockWide(entry);
      } else {
        loadCodeBlock(entry);
      }
    });
  }

  window.loadCodeBlock = loadCodeBlock;
  window.loadCodeBlockWide = loadCodeBlockWide;
  window.loadCodeBlocks = loadCodeBlocks;
  window.loadCodeBlocksFromEntries = loadCodeBlocksFromEntries;
})();