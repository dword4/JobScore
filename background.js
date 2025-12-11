// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Background script for the extension
browserAPI.runtime.onInstalled.addListener(function() {
  console.log('Keyword Highlighter extension installed');
});

// Handle export requests from popup
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'exportKeywords') {
    try {
      const content = request.keywords.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      browserAPI.downloads.download({
        url: url,
        filename: `keywords_${new Date().getTime()}.txt`,
        saveAs: false
      }, function(downloadId) {
        sendResponse({success: true});
        setTimeout(function() {
          URL.revokeObjectURL(url);
        }, 1000);
      });
      
      return true;
    } catch (error) {
      sendResponse({success: false, error: error.message});
    }
  }
});
