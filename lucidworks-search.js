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
      <div id="lw-ai-toggle-btn-container"></div>
      <div id="lucidworks-search-results-wrapper" class="lw-results-wrapper">
        <div id="lucidworks-search-facets" class="lw-facets-container"></div>
        <div class="lw-main-results-area">
          <div id="lucidworks-search-results" class="lw-results-container"></div>
          <div id="lucidworks-pagination" class="lw-pagination"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add('lw-modal-open'); // Add class to prevent body scrolling

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.body.classList.remove('lw-modal-open'); // Remove class when modal closes
    }
  });

  // Prevent wheel events from propagating to the body
  modal.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // Prevent touchmove events from propagating to the body on mobile
  modal.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });

  const input = document.getElementById('lucidworks-search-input');
  const modalContainer = document.getElementById('lucidworks-modal-container');
  const resultsContainer = document.getElementById('lucidworks-search-results');
  const paginationContainer = document.getElementById('lucidworks-pagination');
  const aiToggleBtnContainer = document.getElementById('lw-ai-toggle-btn-container');
  const facetsContainer = document.getElementById('lucidworks-search-facets');

  input.focus();

  let currentMode = 'search';
  let currentQuery = '';
  let currentStart = 0;
  let isProcessing = false; // Simpler flag for tracking operations in progress
  const rows = 10;
  let selectedFacets = {};

  function renderSkeletons(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'lw-skeleton';
      container.appendChild(skeleton);
    }
  }

  function setMode(mode) {
    // Basic protection against rapid switching
    if (isProcessing) return;

    currentMode = mode;
    
    // Clear previous UI elements
    resultsContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
    aiToggleBtnContainer.innerHTML = '';
    facetsContainer.innerHTML = '';

    // Update the site's URL with the appropriate query parameter
    const url = new URL(window.location.href);
    if (mode === 'ai') {
      url.searchParams.delete('q'); // Remove the search query parameter
      if (currentQuery.trim()) {
        url.searchParams.set('qa', currentQuery); // Add the AI query parameter
      } else {
        url.searchParams.delete('qa'); // Ensure no empty `qa` parameter
      }
    } else {
      url.searchParams.delete('qa'); // Remove the AI query parameter
      if (currentQuery.trim()) {
        url.searchParams.set('q', currentQuery); // Add the search query parameter
      } else {
        url.searchParams.delete('q'); // Ensure no empty `q` parameter
      }
    }
    window.history.replaceState({}, '', url.toString()); // Update the URL without reloading

    // Configure UI based on mode
    if (mode === 'ai') {
      facetsContainer.style.display = 'none';
      modalContainer.classList.remove('collapsed');
      modalContainer.classList.add('expanded');
      input.placeholder = "Ask a question...";
      
      // Add button to switch back to search mode if there's a query
      if (currentQuery.trim()) {
        const button = document.createElement('button');
        button.className = 'lw-mode-toggle-button';
        button.textContent = 'Lucidworks Search';
        button.addEventListener('click', () => {
          if (!isProcessing) {
            setMode('search');
            if (currentQuery.trim()) {
              fetchAndRenderSearch(currentQuery, currentStart);
            }
          }
        });
        aiToggleBtnContainer.appendChild(button);
      }
      
      input.focus();
      if (currentQuery.trim()) {
        renderSkeletons(resultsContainer, 3);
        fetchAndRenderSearch(currentQuery, 0);
      } else {
        resultsContainer.innerHTML = '<div class="lw-ai-placeholder">Enter your question above and press Enter to ask Lucidworks AI</div>';
      }
    } else { // search mode
      facetsContainer.style.display = 'block';
      modalContainer.classList.add('collapsed');
      modalContainer.classList.remove('expanded');
      input.placeholder = "Search or ask Lucidworks AI";
      
      // Only add AI button if we have a query
      if (currentQuery.trim()) {
        const button = document.createElement('button');
        button.className = 'lw-mode-toggle-button';
        button.textContent = 'Ask Lucidworks AI';
        button.addEventListener('click', () => {
          if (!isProcessing) {
            setMode('ai');
          }
        });
        aiToggleBtnContainer.appendChild(button);
      }
    }
  }

  async function fetchAndRenderSearch(query, start = 0) {
    if (!query.trim()) return;

    isProcessing = true;
    currentQuery = query;
    currentStart = start;

    // Update the site's URL with the appropriate query parameter based on mode
    const url = new URL(window.location.href);
    if (currentMode === 'ai') {
      url.searchParams.delete('q'); // Remove the search query parameter
      url.searchParams.set('qa', query); // Set the AI query parameter
    } else {
      url.searchParams.delete('qa'); // Remove the AI query parameter
      url.searchParams.set('q', query); // Set the search query parameter
    }
    window.history.replaceState({}, '', url.toString()); // Update the URL without reloading

    try {
      if (currentMode === 'ai') {
        // Ensure facets are hidden in AI mode
        facetsContainer.style.display = 'none';
        
        const url = `https://lw-docs-dev.b.lucidworks.cloud/api/apps/Docs_Site_AI/query/Docs_Site_AI_NHS_RAG?q=${encodeURIComponent(query)}`;
        const auth = btoa('docs:rkJqpLsyAf9Dbu]TVRm6DT%N');
        
        renderSkeletons(resultsContainer, 3);
        paginationContainer.innerHTML = '';
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });
        
        // Verify we're still in AI mode
        if (currentMode !== 'ai') {
          return;
        }
        
        if (!res.ok) {
          resultsContainer.innerHTML = '<div class="lw-result-description">Error retrieving AI results.</div>';
          return;
        }
        
        const data = await res.json();
        const aiAnswer = data?.fusion?.llm_answer;
        const sources = data?.fusion?.llm_source_docs || [];
        
        // Verify again we're still in AI mode
        if (currentMode !== 'ai') {
          return;
        }
        
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
          const sourcesHeading = document.createElement('div');
          sourcesHeading.className = 'lw-sources-heading';
          sourcesHeading.textContent = 'Sources:';
          resultsContainer.appendChild(sourcesHeading);
          
          const sourcesContainer = document.createElement('div');
          sourcesContainer.className = 'lw-sources-container';
          
          sources.forEach((doc) => {
            const docBlock = document.createElement('div');
            docBlock.className = 'lw-result-item';
            
            const link = document.createElement('a');
            link.href = doc.url_s || '#';
            link.target = '_blank';
            link.className = 'lw-result-title';
            link.textContent = doc.title_s || doc.url_s || 'Source Document';
            docBlock.appendChild(link);
            
            sourcesContainer.appendChild(docBlock);
          });
          
          resultsContainer.appendChild(sourcesContainer);
        }
      } else {
        // Show facets in search mode
        facetsContainer.style.display = 'block';
        
        let facetQuery = '';
        const selectedFacetValues = [];
        for (const facet in selectedFacets) {
          if (selectedFacets[facet].length > 0) {
            selectedFacetValues.push(...selectedFacets[facet]);
          }
        }
        
        if (selectedFacetValues.length > 0) {
          facetQuery = `&fq=productName_pretty:("${selectedFacetValues.join('","')}")`;
        }
        
        const url = `https://docs.b.lucidworks.cloud/api/apps/Docs_Site_2/query/Docs_Site_2?start=${start}&rows=${rows}&q=${encodeURIComponent(query)}&facet=true&facet.field=productName_pretty${facetQuery}`;
        const auth = btoa('dustin-readonly:rkJqpLsyAf9Dbu]TVRm6DT%N');
        
        renderSkeletons(resultsContainer, rows);
        paginationContainer.innerHTML = '';
        facetsContainer.innerHTML = '';
        aiToggleBtnContainer.innerHTML = '';
        
        modalContainer.classList.remove('collapsed');
        modalContainer.classList.add('expanded');
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });
        
        // Verify we're still in search mode
        if (currentMode !== 'search') {
          return;
        }
        
        if (!res.ok) {
          resultsContainer.innerHTML = 'Search failed.';
          if (currentQuery.trim()) {
            addAiToggleButton();
          }
          return;
        }
        
        const data = await res.json();
        const docs = data.response?.docs || [];
        const numFound = data.response?.numFound || 0;
        
        // Verify again we're still in search mode
        if (currentMode !== 'search') {
          return;
        }
        
        // Render facets
        if (data.facet_counts?.facet_fields?.productName_pretty) {
          renderFacets(data.facet_counts.facet_fields.productName_pretty);
        }
        
        if (!docs.length) {
          resultsContainer.innerHTML = '<div class="lw-no-results">No results found. Try asking Lucidworks AI instead.</div>';
          if (currentQuery.trim()) {
            addAiToggleButton();
          }
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
        
        if (currentQuery.trim()) {
          addAiToggleButton();
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      resultsContainer.innerHTML = currentMode === 'ai' 
        ? '<div class="lw-result-description">An error occurred while fetching AI results.</div>' 
        : 'An error occurred.';
      
      // Add toggle button if appropriate
      if (currentMode === 'search' && currentQuery.trim()) {
        addAiToggleButton();
      }
    } finally {
      isProcessing = false;
    }
    
    function addAiToggleButton() {
      // Only add the button if we have a query and are in search mode
      if (!currentQuery.trim() || currentMode !== 'search') return;
      
      aiToggleBtnContainer.innerHTML = '';
      const aiToggleButton = document.createElement('button');
      aiToggleButton.className = 'lw-mode-toggle-button';
      aiToggleButton.textContent = 'Ask Lucidworks AI';
      aiToggleButton.addEventListener('click', () => setMode('ai'));
      aiToggleBtnContainer.appendChild(aiToggleButton);
    }
  }

  function renderFacets(facetData) {
    if (!facetData || facetData.length === 0) return;

    facetsContainer.innerHTML = '<div class="lw-facets-title">Filter by Product</div>';
    const facetList = document.createElement('div');
    facetList.className = 'lw-facets-list';

    for (let i = 0; i < facetData.length; i += 2) {
      const facetValue = facetData[i];
      const facetCount = facetData[i + 1];

      if (facetCount === 0) continue;

      const facetItem = document.createElement('div');
      facetItem.className = 'lw-facet-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `facet-${facetValue}`;
      checkbox.className = 'lw-facet-checkbox';
      checkbox.value = facetValue;

      if (selectedFacets['productName_pretty'] && selectedFacets['productName_pretty'].includes(facetValue)) {
        checkbox.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = `facet-${facetValue}`;
      label.className = 'lw-facet-label';
      label.textContent = `${facetValue} (${facetCount})`;

      checkbox.addEventListener('change', (e) => {
        if (!selectedFacets['productName_pretty']) {
          selectedFacets['productName_pretty'] = [];
        }

        if (e.target.checked) {
          if (!selectedFacets['productName_pretty'].includes(facetValue)) {
            selectedFacets['productName_pretty'].push(facetValue);
          }
        } else {
          selectedFacets['productName_pretty'] = selectedFacets['productName_pretty'].filter(
            val => val !== facetValue
          );
        }

        fetchAndRenderSearch(currentQuery, 0);
      });

      facetItem.appendChild(checkbox);
      facetItem.appendChild(label);
      facetList.appendChild(facetItem);
    }

    facetsContainer.appendChild(facetList);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = input.value.trim();
      if (!query) return;
      
      // Reset facets for new searches
      selectedFacets = {};
      
      // Run the search based on the current mode
      fetchAndRenderSearch(query, 0);
    }
  });

  setMode('search');
}

// Update the blockMintlifyAndInjectCustomModal function to handle the ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('lucidworks-search-modal');
    if (modal) {
      modal.remove();
      document.body.classList.remove('lw-modal-open');
    }
  }
});

function init() {
  blockMintlifyAndInjectCustomModal('#search-bar-entry', launchLucidworksModal);
  blockMintlifyAndInjectCustomModal('#search-bar-entry-mobile', launchLucidworksModal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
