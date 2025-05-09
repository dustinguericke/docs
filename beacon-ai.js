console.log('Beacon AI script loaded');

// Create and inject the script element
(function() {
  const script = document.createElement('script');
  script.type = 'module';
  script.id = 'lw-ui-lib';
  script.setAttribute('api-url', 'https://ba6a88b1-eaf6-4aff-a1c9-b02d08309b75.applications.lucidworks.com');
  script.setAttribute('embed-token', 'LZCoEK4gkZJb9jpoITBojN4saakiVP2L');
  script.src = 'https://storage.googleapis.com/sb-ui/springboard.esm.js';
  script.setAttribute('beacon', '{}');
  
  // Append the script to the document
  document.head.appendChild(script);
})();