document.addEventListener('DOMContentLoaded', () => {
  fetch('projects.csv')
    .then(response => response.text())
    .then(data => {
      const lines = data.trim().split('\n');
      const listElement = document.getElementById('project-list');
      const iframe = document.getElementById('project-iframe');
      const iframeWrapper = document.querySelector('.iframe-wrapper');
      const entries = [];

      const shuffleArray = function (array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;
      };

      lines.forEach((line, index) => {
        if (!line.trim()) {
          return;
        }

        if (index === 0 && /^name\s*,\s*project_url(\s*,\s*site_url)?\s*$/i.test(line.trim())) {
          return;
        }

        const firstComma = line.indexOf(',');
        const secondComma = line.indexOf(',', firstComma + 1);

        if (firstComma === -1) {
          return;
        }

        const name = line.slice(0, firstComma).trim();
        const projectUrl = secondComma === -1
          ? line.slice(firstComma + 1).trim()
          : line.slice(firstComma + 1, secondComma).trim();
        const siteUrl = secondComma === -1 ? '' : line.slice(secondComma + 1).trim();

        if (!name || !projectUrl) {
          return;
        }

        entries.push({ name, projectUrl, siteUrl });
      });

      const activateProject = function (projectUrl, listItem) {
        iframe.src = projectUrl;
        iframeWrapper.classList.remove('is-empty');

        document.querySelectorAll('#project-list li').forEach(el => {
          el.classList.remove('active');
        });

        listItem.classList.add('active');
      };

      shuffleArray(entries).forEach(entry => {
        const { name, projectUrl, siteUrl } = entry;

        const li = document.createElement('li');
        const row = document.createElement('div');
        row.className = 'project-row';
        const nameLink = document.createElement('a');
        const docLink = document.createElement('a');

        nameLink.className = 'project-name';
        nameLink.href = projectUrl;
        nameLink.textContent = name;
        nameLink.target = '_blank';
        nameLink.rel = 'noopener noreferrer';

        docLink.className = 'project-doc-link';
        docLink.textContent = '+';

        if (siteUrl) {
          docLink.href = siteUrl;
          docLink.target = '_blank';
          docLink.rel = 'noopener noreferrer';
        } else {
          docLink.classList.add('disabled');
          docLink.setAttribute('aria-disabled', 'true');
          docLink.tabIndex = -1;
        }

        row.appendChild(nameLink);
        row.appendChild(docLink);
        li.appendChild(row);

        li.addEventListener('click', () => {
          activateProject(projectUrl, li);
        });

        nameLink.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          activateProject(projectUrl, li);
        });

        docLink.addEventListener('click', event => {
          event.stopPropagation();

          if (!siteUrl) {
            event.preventDefault();
          }
        });

        listElement.appendChild(li);
      });

      if (entries.length > 0) {
        activateProject(entries[0].projectUrl, listElement.firstElementChild);
      } else {
        iframeWrapper.classList.add('is-empty');
      }
    })
    .catch(error => {
      console.error(error);
      const iframeWrapper = document.querySelector('.iframe-wrapper');
      if (iframeWrapper) {
        iframeWrapper.classList.add('is-empty');
      }
    });
});
