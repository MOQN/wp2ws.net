(function () {
  const defaultSourceCandidates = [
    'main.js',
    '_js/main.js',
    'sketch.js',
    'js/sketch.js',
    'script.js',
    'js/script.js',
    'script-p5.js',
    '_js/script-p5.js',
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
      const explicitCandidates = [];
      const sourceVariants = [sourcePath, sourcePath.replace(/^_js\//, 'js/'), sourcePath.replace(/^js\//, '_js/')];

      sourceVariants.forEach(function (variant) {
        if (!variant) return;
        const normalized = trimLeadingSlash(variant);
        if (!normalized) return;
        explicitCandidates.push(joinPath(folder, normalized));
      });

      const uniqueCandidates = Array.from(new Set(explicitCandidates));
      function tryExplicit(index) {
        if (index >= uniqueCandidates.length) {
          throw new Error('No matching source file found for explicit path: ' + sourcePath + ' in folder: ' + folder);
        }

        const path = uniqueCandidates[index];
        return fetchSourceText(path)
          .then(function (source) {
            return { source: source, sourceUrl: path };
          })
          .catch(function () {
            return tryExplicit(index + 1);
          });
      }

      return tryExplicit(0);
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
      window.Prism.highlightElement(code);
    }
  }

  function createIframeBlock(frameSrc) {
    const iframeWrap = document.createElement('div');
    iframeWrap.className = 'sketch-frame-wrap';
    iframeWrap.style.position = 'relative';
    iframeWrap.style.margin = '0';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', frameSrc);
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '500');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'camera; fullscreen; xr-spatial-tracking');
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

  function createCodeBlock(name) {
    const codeWrap = document.createElement('div');
    codeWrap.className = 'code-block-wrap';
    codeWrap.style.margin = '0';

    if (typeof name === 'string' && name.trim()) {
      const label = document.createElement('div');
      label.className = 'code-block-name';
      label.textContent = name;
      codeWrap.appendChild(label);
    }

    const codeBody = document.createElement('div');
    codeBody.style.position = 'relative';
    codeWrap.appendChild(codeBody);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'sketch-action-button sketch-copy-button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', 'Copy code to clipboard');
    applyButtonStyle(copyButton);
    codeBody.appendChild(copyButton);

    const pre = document.createElement('pre');
    pre.style.margin = '0';
    pre.style.width = '100%';
    pre.style.minHeight = '400px';
    pre.style.marginBottom = '10px';

    const code = document.createElement('code');
    code.className = 'code-block language-javascript';
    code.style.display = 'block';

    pre.appendChild(code);
    codeBody.appendChild(pre);

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

  function loadCodeBlock({ folder, framePath, sourcePath, sourceCandidates = defaultSourceCandidates, anchorId, width, name } = {}) {
    const resolvedFolder = resolveFolder(folder);
    if (!resolvedFolder) return;

    const insertion = getInsertionTarget(anchorId);
    if (!insertion) return;

    const container = document.createElement('div');
    container.style.margin = '10px 0';
    container.style.width = '100%';
    container.style.maxWidth = '100%';

    const codeBlock = createCodeBlock(name);
    codeBlock.codeWrap.style.maxWidth = '100%';

    if (framePath !== null) {
      const frameSrc = framePath ? joinPath(resolvedFolder, framePath) : resolvedFolder;
      const iframeWrap = createIframeBlock(frameSrc);
      iframeWrap.style.maxWidth = '100%';

      // A number sets the preview width in pixels. CSS lengths and percentages also work.
      const previewWidth = typeof width === 'number' ? width + 'px' : width;
      if (width === 'half' || (previewWidth && CSS.supports('width', previewWidth))) {
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '10px';
        codeBlock.codeWrap.style.minWidth = '0';

        if (width === 'half') {
          const columnSize = '1 1 max(280px, calc((100% - 10px) / 2))';
          iframeWrap.style.flex = columnSize;
          codeBlock.codeWrap.style.flex = columnSize;
        } else {
          iframeWrap.style.width = previewWidth;
          iframeWrap.style.flexShrink = '0';
          codeBlock.codeWrap.style.flex = '1 1 280px';
        }
      } else {
        iframeWrap.style.margin = '0 0 10px 0';
      }

      container.appendChild(iframeWrap);
    }

    container.appendChild(codeBlock.codeWrap);
    insertBlock(container, insertion.insertionParent, insertion.insertionTarget, insertion.main);
    fetchPreferredSource(resolvedFolder, sourcePath, sourceCandidates)
      .then(function (result) {
        applyCodeText(codeBlock.code, result.source);
      })
      .catch(function (error) {
        console.error('Failed to load code:', error);
      });
  }

  window.loadCodeBlock = loadCodeBlock;
})();
