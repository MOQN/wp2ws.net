document.addEventListener('DOMContentLoaded', () => {
  fetch('projects.csv')
    .then(response => response.text())
    .then(data => {
      const lines = data.trim().split('\n');
      const listElement = document.getElementById('project-list');
      const iframe = document.getElementById('p5-iframe');
      const entries = [];

      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;
      }

      lines.forEach((line, index) => {
        if (!line.trim()) {
          return;
        }

        if (index === 0 && /^name\s*,\s*project_url\s*,\s*site_url\s*$/i.test(line.trim())) {
          return;
        }

        const firstComma = line.indexOf(',');
        const secondComma = line.indexOf(',', firstComma + 1);

        if (firstComma === -1 || secondComma === -1) {
          return;
        }

        const name = line.slice(0, firstComma).trim();
        const projectUrl = line.slice(firstComma + 1, secondComma).trim();
        const documentationUrl = line.slice(secondComma + 1).trim();

        entries.push({ name, projectUrl, documentationUrl });
      });

      shuffleArray(entries).forEach(entry => {
        const { name, projectUrl, documentationUrl } = entry;

        const li = document.createElement('li');

        const headerRow = document.createElement('div');
        headerRow.className = 'project-header-row';

        const nameLink = document.createElement('a');
        nameLink.className = 'project-name';
        nameLink.href = projectUrl;
        nameLink.textContent = name;
        nameLink.target = '_blank';
        nameLink.rel = 'noopener noreferrer';

        const documentationLabel = document.createElement('a');
        documentationLabel.className = 'project-documentation-label';
        documentationLabel.textContent = '🟣';
        documentationLabel.href = documentationUrl;
        documentationLabel.target = '_blank';
        documentationLabel.rel = 'noopener noreferrer';

        headerRow.appendChild(nameLink);
        headerRow.appendChild(documentationLabel);
        li.appendChild(headerRow);

        const activateProject = function () {
          iframe.src = projectUrl;

          document.querySelectorAll('#project-list li').forEach(el => {
            el.classList.remove('active');
          });
          li.classList.add('active');
        };

        li.addEventListener('click', activateProject);
        nameLink.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          activateProject();
        });
        documentationLabel.addEventListener('click', event => {
          event.stopPropagation();
        });

        listElement.appendChild(li);
      });
    })
    .catch(error => console.error(error));
});