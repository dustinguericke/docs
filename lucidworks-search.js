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
      <input id="lucidworks-search-input" class="lw-search-input" type="text" placeholder="Search or ask Lucidworks AI" />
      <div id="lucidworks-search-results-wrapper">
        <div id="lw-ai-toggle-btn-container"></div>
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
  const resultsContainer = document.getElementById('lucidworks-search-results');
  const paginationContainer = document.getElementById('lucidworks-pagination');
  const aiToggleBtnContainer = document.getElementById('lw-ai-toggle-btn-container');

  input.focus();

  let currentMode = 'search';
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

  function setMode(mode) {
    currentMode = mode;
    resultsContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
    aiToggleBtnContainer.innerHTML = '';

    const button = document.createElement('button');
    button.className = 'lw-mode-toggle-button';

    if (mode === 'ai') {
      // Clear any previous results and prepare the modal
      modalContainer.classList.remove('collapsed');
      modalContainer.classList.add('expanded');
      
      // Change the input placeholder to be more AI-specific
      input.placeholder = "Ask a question...";
      
      button.textContent = 'Lucidworks Search';
      button.addEventListener('click', () => {
        setMode('search');
        // Reset placeholder when switching back to search
        input.placeholder = "Search or ask Lucidworks AI";
        if (currentQuery.trim()) {
          fetchAndRenderSearch(currentQuery, currentStart);
        }
      });
      
      // Focus on input to encourage immediate interaction
      input.focus();
      
      // Automatically submit the current query if one exists
      if (currentQuery.trim()) {
        renderSkeletons(resultsContainer, 3);
        // Use setTimeout to ensure the UI updates before making the API call
        setTimeout(() => fetchAndRenderSearch(currentQuery, 0), 100);
      } else {
        resultsContainer.innerHTML = '<div class="lw-ai-placeholder">Enter your question above and press Enter to ask Lucidworks AI</div>';
      }
    } else {
      modalContainer.classList.add('collapsed');
      modalContainer.classList.remove('expanded');
      button.textContent = 'Ask Lucidworks AI';
      button.addEventListener('click', () => setMode('ai'));
    }

    aiToggleBtnContainer.appendChild(button);
  }

  async function fetchAndRenderSearch(query, start = 0) {
    currentQuery = query;
    currentStart = start;

    if (currentMode === 'ai') {
      // Handle AI mode
      const url = `https://lw-docs-dev.b.lucidworks.cloud/api/apps/Docs_Site_AI/query/Docs_Site_AI_NHS_RAG?q=${encodeURIComponent(query)}`;
      const auth = btoa('docs:rkJqpLsyAf9Dbu]TVRm6DT%N');

      renderSkeletons(resultsContainer, 3);
      paginationContainer.innerHTML = '';

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (!res.ok) {
          resultsContainer.innerHTML = '<div class="lw-result-description">Error retrieving AI results.</div>';
          return;
        }

        const data = await res.json();
        const aiAnswer = data?.fusion?.llm_answer;
        const sources = data?.fusion?.llm_source_docs || [];

        resultsContainer.innerHTML = '';

        if (aiAnswer) {
          const answerBlock = document.createElement('div');
          answerBlock.className = 'lw-result-item';
          answerBlock.innerHTML = `<div class="lw-result-description">${aiAnswer}</div>`;
          resultsContainer.appendChild(answerBlock);
        } else {
          resultsContainer.innerHTML = '<div class="lw-result-description">No AI answer returned.</div>';
        }

        if (sources.length > 0) {
          // Add a sources heading
          const sourcesHeading = document.createElement('div');
          sourcesHeading.className = 'lw-sources-heading';
          sourcesHeading.textContent = 'Sources:';
          resultsContainer.appendChild(sourcesHeading);

          // Create a container for sources
          const sourcesContainer = document.createElement('div');
          sourcesContainer.className = 'lw-sources-container';
          
          sources.forEach((doc) => {
            const docBlock = document.createElement('div');
            docBlock.className = 'lw-result-item';
            
            const link = document.createElement('a');
            link.href = doc.url_s || '#'; // Use url_s for the link destination
            link.target = '_blank';
            link.className = 'lw-result-title';
            link.textContent = doc.title_s || doc.url_s || 'Source Document'; // Use title_s instead of title
            docBlock.appendChild(link);
            
            sourcesContainer.appendChild(docBlock);
          });
          
          resultsContainer.appendChild(sourcesContainer);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        resultsContainer.innerHTML = '<div class="lw-result-description">An error occurred while fetching AI results.</div>';
      }
      return;
    }

    const url = `https://docs.b.lucidworks.cloud/api/apps/Docs_Site_2/query/Docs_Site_2?start=${start}&rows=${rows}&q=${encodeURIComponent(query)}`;
    const auth = btoa('dustin-readonly:rkJqpLsyAf9Dbu]TVRm6DT%N');

    renderSkeletons(resultsContainer, rows);
    paginationContainer.innerHTML = '';
    aiToggleBtnContainer.innerHTML = '';

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
        // Even if search fails, still show the AI toggle button
        addAiToggleButton();
        return;
      }

      const data = await res.json();
      const docs = data.response?.docs || [];
      const numFound = data.response?.numFound || 0;

      if (!docs.length) {
        resultsContainer.innerHTML = '<div class="lw-no-results">No results found. Try asking Lucidworks AI instead.</div>';
        // Still show the AI toggle button when no results are found
        addAiToggleButton();
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
          fetchAndRenderSearch(currentQuery, newStart);
        });
      });

      // Add the AI toggle button
      addAiToggleButton();

    } catch (err) {
      console.error('Fetch error:', err);
      resultsContainer.innerHTML = 'An error occurred.';
      // Still show the AI toggle button on error
      addAiToggleButton();
    }
    
    // Helper function to add the AI toggle button
    function addAiToggleButton() {
      const aiToggleButton = document.createElement('button');
      aiToggleButton.className = 'lw-mode-toggle-button';
      aiToggleButton.textContent = 'Ask Lucidworks AI';
      aiToggleButton.addEventListener('click', () => setMode('ai'));
      aiToggleBtnContainer.appendChild(aiToggleButton);
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (!query) return;
      fetchAndRenderSearch(query, 0); // This handles both AI and search modes
    }
  });

  setMode('search');
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
