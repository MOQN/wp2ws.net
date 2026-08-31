# Example Gallery

Browse all course examples organized by week.

## Weekly Examples

- [Week 03: Intro to Three.js](/w03/) - Basic Three.js concepts and geometries
- [Week 04: Objects & GUI](/w04/) - Dynamic arrays and GUI controls
- [Week 05: Lights & Shadow](/w05/) - Lighting systems and shadows
- [Week 06: Points & Realism](/w06/) - PointsMaterial and realistic rendering
- [Week 09: Navigation](/w09/) - Camera controls and navigation
- [Week 10: Interaction & ML](/w10/) - Raycasting and ML model integration
- [Week 12: WebXR](/w12/) - WebXR and immersive experiences

## Source Repository

All examples are from [MOQN/IMA-Web-Page-To-Web-Space](https://github.com/MOQN/IMA-Web-Page-To-Web-Space).

---

## All Examples (auto-generated)

<!-- markdownlint-disable MD033 -->
<script>
  (function () {
    const owner = 'MOQN';
    const repo = 'IMA-Web-Page-To-Web-Space';
    const ref = 'main';
    const treeUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/git/trees/' + ref + '?recursive=1';
    const cdnBase = 'https://cdn.jsdelivr.net/gh/' + owner + '/' + repo + '@' + ref;

    const sourcePriority = [
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

    const topLevelAllowList = [
      '03_intro_to_threejs',
      '04a_objects_dynamicArrays',
      '04b_adding_gui',
      '05_lights_n_shadow',
      '06a_pointsMaterial',
      '06b_adding_realism',
      '09a_navigation',
      '10a_interaction_raycaster',
      '10b_Interaction_w_MLmodels',
      '12_webXR',
      'in-class'
    ];

    const excludedPatterns = [
      /^prev\//,
      /\/__test__\//,
      /\/archive\//,
      /\/\.[^/]+\//,
      / copy(\/|$)/i
    ];

    function isExcluded(path) {
      return excludedPatterns.some(function (pattern) {
        return pattern.test(path);
      });
    }

    function getDir(path) {
      const idx = path.lastIndexOf('/');
      return idx === -1 ? '' : path.slice(0, idx);
    }

    function getTopLevel(dir) {
      return dir.split('/').at(0) || '';
    }

    function buildEntries(tree) {
      const byDir = new Map();

      tree.forEach(function (item) {
        if (!item || item.type !== 'blob' || !item.path || isExcluded(item.path)) return;

        const dir = getDir(item.path);
        const rel = dir ? item.path.slice(dir.length + 1) : item.path;

        if (!byDir.has(dir)) {
          byDir.set(dir, {
            hasIndex: false,
            sources: new Set()
          });
        }

        const record = byDir.get(dir);
        if (rel === 'index.html') {
          record.hasIndex = true;
        }
        if (sourcePriority.indexOf(rel) !== -1) {
          record.sources.add(rel);
        }
      });

      const allEntries = [];
      byDir.forEach(function (record, dir) {
        if (!record.hasIndex) return;

        const topLevel = getTopLevel(dir);
        if (topLevelAllowList.indexOf(topLevel) === -1) return;

        const sourcePath = sourcePriority.find(function (candidate) {
          return record.sources.has(candidate);
        });
        if (!sourcePath) return;

        allEntries.push({
          folder: cdnBase + '/' + dir,
          topLevel: topLevel,
          framePath: 'index.html',
          sourcePath: sourcePath,
          layout: 'wide'
        });
      });

      allEntries.sort(function (a, b) {
        return a.folder.localeCompare(b.folder);
      });

      const pickedByTopLevel = new Map();
      allEntries.forEach(function (entry) {
        if (!pickedByTopLevel.has(entry.topLevel)) {
          pickedByTopLevel.set(entry.topLevel, {
            folder: entry.folder,
            framePath: entry.framePath,
            sourcePath: entry.sourcePath,
            layout: entry.layout
          });
        }
      });

      return Array.from(pickedByTopLevel.values());
    }

    fetch(treeUrl)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to fetch repo tree');
        return response.json();
      })
      .then(function (data) {
        const tree = Array.isArray(data.tree) ? data.tree : [];
        const entries = buildEntries(tree);

        if (!entries.length) {
          const p = document.createElement('p');
          p.textContent = 'No examples detected from repository tree.';
          const main = document.getElementById('main');
          if (main) main.appendChild(p);
          return;
        }

        loadCodeBlocksFromEntries(entries);
      })
      .catch(function (error) {
        console.error(error);
        const p = document.createElement('p');
        p.textContent = 'Failed to load examples from GitHub API.';
        const main = document.getElementById('main');
        if (main) main.appendChild(p);
      });
  })();
</script>
<!-- markdownlint-enable MD033 -->

## Notes

- This page intentionally ignores prev.
- If you want fewer examples, add stricter filters in the script.
