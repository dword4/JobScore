// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Background script for the extension
browserAPI.runtime.onInstalled.addListener(function() {
  console.log('Keyword Highlighter extension installed');
});
