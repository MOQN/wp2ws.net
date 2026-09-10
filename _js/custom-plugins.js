// ==========================================
// Docsify Custom Plugins
// ==========================================

(function () {
  // Inspired by Yafira, her code was merged into the official docsify copy-code plugin!
  const installPrismCommentRules = function (mode = 'plain') {
    if (typeof Prism === 'undefined' || !Prism.languages.javascript) return;

    if (!Prism.languages.javascript['custom-highlight']) {
      Prism.languages.insertBefore('javascript', 'keyword', {
        'custom-highlight': /\b(function|add|more)\b/,
        'custom-highlight-1': /\b(async|await|add|more)\b/,
        'custom-highlight-2': /\b(add|more)\b/
      });
    }

    if (!Prism.__ml5DocsCommentRulesInstalled) {
      Prism.hooks.add('after-tokenize', function (env) {
        let isLineStart = true;
        for (let i = 0; i < env.tokens.length; i++) {
          let token = env.tokens[i];
          if (typeof token === 'string') {
            if (token.includes('\n')) {
              const afterLastNewline = token.split('\n').pop();
              isLineStart = (afterLastNewline.trim() === '');
            } else if (token.trim() !== '') {
              isLineStart = false;
            }
          } else {
            if (token.type === 'comment') {
              let aliases = Array.isArray(token.alias) ? token.alias : (token.alias ? [token.alias] : []);

              if (mode === 'bubble') {
                aliases.push(isLineStart ? 'bubble-comment' : 'inline-comment');
              } else {
                aliases.push('inline-comment');
              }

              token.alias = aliases;
              isLineStart = false;
            } else {
              isLineStart = false;
            }
          }
        }
      });
      Prism.__ml5DocsCommentRulesInstalled = true;
    }

    if (mode === 'bubble' && !Prism.__ml5DocsBubbleCommentWrapInstalled) {
      Prism.hooks.add('wrap', function (env) {
        if (env.type === 'comment' && env.classes && env.classes.includes('bubble-comment')) {
          env.content = env.content.replace(/^(\/\/\s*)/, '<span class="hide-slash">$1</span>');
        }
      });
      Prism.__ml5DocsBubbleCommentWrapInstalled = true;
    }
  };

  // Keep the old bubble behavior available, but don't use it for now.
  const prismCustomPlugin = function (hook) {
    const injectPrismRules = () => {
      installPrismCommentRules('bubble');
    };

    hook.init(injectPrismRules);
    hook.doneEach(injectPrismRules);
  };

  // Show the comment text normally without hiding the leading //.
  const prismCustomPluginPlain = function (hook) {
    const injectPrismRules = () => {
      installPrismCommentRules('plain');
    };

    hook.init(injectPrismRules);
    hook.doneEach(injectPrismRules);
  };

  // Examples search by Ryan :D 
  const examplesSearchPlugin = function (hook) {
    hook.doneEach(function () {
      var input = document.getElementById('examples-search');
      var noResults = document.getElementById('examples-no-results');
      if (!input || !noResults) return;

      input.addEventListener('input', function () {
        var query = input.value.trim().toLowerCase();
        var anyVisible = false;

        document.querySelectorAll('.ex-group').forEach(function (group) {
          var groupName = (group.dataset.group || '').toLowerCase();
          var cards = group.querySelectorAll('.ex-card');
          var groupHasMatch = false;

          cards.forEach(function (card) {
            var cardName = (card.dataset.name || '').toLowerCase();
            var matches = !query || cardName.indexOf(query) !== -1 || groupName.indexOf(query) !== -1;
            card.classList.toggle('ex-hidden', !matches);
            if (matches) groupHasMatch = true;
          });

          group.classList.toggle('ex-group-hidden', !groupHasMatch);
          if (groupHasMatch) anyVisible = true;
        });
        noResults.style.display = anyVisible ? 'none' : 'block';
      });
    });
  };

  const clearSearchTextPlugin = function (hook) {
    hook.ready(function () {
      const clearText = document.querySelector('.clear-button .visually-hidden');
      if (clearText) clearText.textContent = '';
    });
  };

  const sidebarStatePlugin = function (hook) {
    const sidebarMobileBreakpoint = 1060;
    let hasResizeListener = false;
    let lastIsMobile = null;

    const sidebarStateByViewport = () => {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      const isMobile = window.innerWidth <= sidebarMobileBreakpoint;
      if (isMobile) {
        // mobile view starts with sidebar hidden, but the toggle button is visible!
        sidebar.classList.remove('show');
      } else {
        // laptop/desktop view starts with sidebar visible; (the toggle button will be hidden.)
        sidebar.classList.add('show');
      }
      lastIsMobile = isMobile;
    };

    hook.ready(function () {
      sidebarStateByViewport();

      if (!hasResizeListener) {
        window.addEventListener('resize', function () {
          const isMobile = window.innerWidth <= sidebarMobileBreakpoint;
          if (lastIsMobile === null || isMobile !== lastIsMobile) {
            sidebarStateByViewport();
          }
        });
        hasResizeListener = true;
      }
    });

    hook.doneEach(sidebarStateByViewport);
  };

  const showcaseSidebarLinkPlugin = function (hook) {
    const updateShowcaseLink = () => {
      const showcaseLink = document.querySelector('.sidebar-nav a[href="#/showcase/26f-01/"]')
        || document.querySelector('.sidebar-nav a[href="#/showcase/26f-01/index.html"]')
        || document.querySelector('.sidebar-nav a[href*="showcase/26f-01"]');

      if (!showcaseLink) return;

      showcaseLink.href = '/showcase/26f-01/index.html';
      showcaseLink.target = '_blank';
      showcaseLink.rel = 'noopener noreferrer';
    };

    hook.ready(updateShowcaseLink);
    hook.doneEach(updateShowcaseLink);
  };

  window.ml5DocsPlugins = {
    prismCustomPlugin,
    prismCustomPluginPlain,
    examplesSearchPlugin,
    clearSearchTextPlugin,
    sidebarStatePlugin,
    showcaseSidebarLinkPlugin
  };

})();