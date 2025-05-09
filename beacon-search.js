console.log('Beacon Search script loaded');

// Create and inject the script element
(function() {
  const script = document.createElement('script');
  script.type = 'module';
  script.id = 'lw-ui-lib';
  script.setAttribute('api-url', 'https://ff057d88-e42e-4257-ad18-95193b77e95d.applications.lucidworks.com');
  script.setAttribute('embed-token', 's4J0kicIWXAOvoh4o57HkkxPV5vMy6cm');
  script.src = 'https://storage.googleapis.com/sb-ui/springboard.esm.js';
  script.setAttribute('beacon', '{}');
  
  // Append the script to the document
  document.head.appendChild(script);
})();