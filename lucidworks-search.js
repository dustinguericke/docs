console.log('Lucidworks Search script loaded');

function blockMintlifyAndInjectCustomModal(selector, launchHandler) {
  const button = document.querySelector(selector);
  if (!button) return;

  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    launchHandler();
  };

  const clone = button.cloneNode(true);
  button.replaceWith(clone);
  clone.addEventListener('click', handler, true);
}

function launchLucidworksModal() {
  if (document.getElementById('lucidworks-search-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'lucidworks-search-modal';
  modal.className = 'lw-modal-overlay';

  modal.innerHTML = `
    <div class="lw-modal-container collapsed" id="lucidworks-modal-container">
      <input id="lucidworks-search-input" class="lw-search-input" type="text" placeholder="Search..." />
      <div id="lucidworks-search-results-wrapper">
        <div id="lucidworks-search-results" class="lw-results-container"></div>
        <div id="lucidworks-pagination" class="lw-pagination"></div>
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);

  const input = document.getElementById('lucidworks-search-input');
  const modalContainer = document.getElementById('lucidworks-modal-container');
  input.focus();

  let currentQuery = '';
  let currentStart = 0;
  const rows = 10;

  function renderSkeletons(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'lw-skeleton';
      container.appendChild(skeleton);
    }
  }

  async function fetchAndRenderResults(query, start = 0) {
    currentQuery = query;
    currentStart = start;

    const url = `https://docs.b.lucidworks.cloud/api/apps/Docs_Site_2/query/Docs_Site_2?start=${start}&rows=${rows}&q=${encodeURIComponent(query)}`;
    const auth = btoa('dustin-readonly:rkJqpLsyAf9Dbu]TVRm6DT%N');

    const resultsContainer = document.getElementById('lucidworks-search-results');
    const paginationContainer = document.getElementById('lucidworks-pagination');
    renderSkeletons(resultsContainer, rows);
    paginationContainer.innerHTML = '';

    modalContainer.classList.remove('collapsed');
    modalContainer.classList.add('expanded');

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        resultsContainer.innerHTML = 'Search failed.';
        return;
      }

      const data = await res.json();
      const docs = data.response?.docs || [];
      const numFound = data.response?.numFound || 0;

      if (!docs.length) {
        resultsContainer.innerHTML = 'No results found.';
        return;
      }

      resultsContainer.innerHTML = docs.map(doc => {
        const title = doc.title || 'Untitled';
        const description = doc.description || '';
        const url = doc.url_s || '#';

        return `
          <div class="lw-result-item">
            <a href="${url}" target="_blank" class="lw-result-title">${title}</a>
            <div class="lw-result-description">${description}</div>
          </div>
        `;
      }).join('');

      const totalPages = Math.ceil(numFound / rows);
      const currentPage = Math.floor(start / rows) + 1;

      let paginationHTML = '';
      if (currentPage > 1) {
        paginationHTML += `<button class="lw-page-button" data-start="${(currentPage - 2) * rows}">Previous</button>`;
      }
      if (currentPage < totalPages) {
        paginationHTML += `<button class="lw-page-button" data-start="${currentPage * rows}">Next</button>`;
      }
      paginationContainer.innerHTML = paginationHTML;

      paginationContainer.querySelectorAll('.lw-page-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const newStart = parseInt(e.target.getAttribute('data-start'), 10);
          fetchAndRenderResults(currentQuery, newStart);
        });
      });

    } catch (err) {
      console.error('Fetch error:', err);
      resultsContainer.innerHTML = 'An error occurred.';
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (query) fetchAndRenderResults(query, 0);
    }
  });
}

function init() {
  blockMintlifyAndInjectCustomModal('#search-bar-entry', launchLucidworksModal);
  blockMintlifyAndInjectCustomModal('#search-bar-entry-mobile', launchLucidworksModal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
