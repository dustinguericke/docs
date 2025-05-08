import { toggleModal, isExpanded, setSearchHandler, getSearchInput } from './lucidworks-search.js';

const modalOverlay = document.createElement('div');
modalOverlay.className = 'lw-modal-overlay';

const modalContainer = document.createElement('div');
modalContainer.className = 'lw-modal-container collapsed';

const searchInput = document.createElement('input');
searchInput.className = 'lw-search-input';
searchInput.type = 'text';
searchInput.placeholder = 'Ask Lucidworks AI...';

const resultsWrapper = document.createElement('div');
resultsWrapper.id = 'lucidworks-search-results-wrapper';

const resultsContainer = document.createElement('div');
resultsContainer.className = 'lw-results-container';

const pagination = document.createElement('div');
pagination.className = 'lw-pagination';

resultsWrapper.appendChild(resultsContainer);
resultsWrapper.appendChild(pagination);

modalContainer.appendChild(searchInput);
modalContainer.appendChild(resultsWrapper);
modalOverlay.appendChild(modalContainer);
document.body.appendChild(modalOverlay);

async function runLucidworksAIQuery(query) {
  resultsContainer.innerHTML = '<div class="lw-skeleton"></div><div class="lw-skeleton"></div><div class="lw-skeleton"></div>';
  pagination.innerHTML = '';

  try {
    const response = await fetch(`https://lw-docs-dev.b.lucidworks.cloud/api/apps/Docs_Site_AI/query/Docs_Site_AI_NHS_RAG?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': 'Basic ' + btoa('docs:rkJqpLsyAf9Dbu]TVRm6DT%N')
      }
    });
    const data = await response.json();
    const aiAnswer = data?.fusion?.llm_answer;
    const sources = data?.fusion?.llm_source_docs || [];

    resultsContainer.innerHTML = '';

    if (aiAnswer) {
      const answerBlock = document.createElement('div');
      answerBlock.className = 'lw-result-item';
      answerBlock.innerHTML = `<div class="lw-result-description">${aiAnswer}</div>`;
      resultsContainer.appendChild(answerBlock);
    } else {
      const answerBlock = document.createElement('div');
      answerBlock.className = 'lw-result-item';
      answerBlock.innerHTML = `<div class="lw-result-description">Lucidworks AI is ready. (No answer returned)</div>`;
      resultsContainer.appendChild(answerBlock);
    }

    if (sources.length > 0) {
      sources.forEach((doc) => {
        const docBlock = document.createElement('div');
        docBlock.className = 'lw-result-item';
        const link = document.createElement('a');
        link.href = doc.source;
        link.target = '_blank';
        link.className = 'lw-result-title';
        link.textContent = doc.title || doc.source;
        docBlock.appendChild(link);
        resultsContainer.appendChild(docBlock);
      });
    }
  } catch (error) {
    resultsContainer.innerHTML = '<div class="lw-result-description">Error retrieving results. Please try again later.</div>';
  }
}

function openModalAndSubmitQuery() {
  if (!isExpanded(modalContainer)) toggleModal(modalContainer);
  const query = searchInput.value.trim();
  if (query) {
    const url = new URL(window.location.href);
    url.searchParams.set('qa', query);
    window.history.replaceState({}, '', url.toString()); // Update the URL without reloading
    runLucidworksAIQuery(query);
  }
}

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      const url = new URL(window.location.href);
      url.searchParams.set('qa', query);
      window.history.replaceState({}, '', url.toString()); // Update the URL without reloading
      runLucidworksAIQuery(query);
    }
  }
});

setSearchHandler(() => {
  searchInput.value = getSearchInput();
  openModalAndSubmitQuery();
});

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) toggleModal(modalContainer);
});

searchInput.addEventListener('focus', () => {
  if (!isExpanded(modalContainer)) toggleModal(modalContainer);
});
