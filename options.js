// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Debug logging function
function debug(msg) {
  const debugLog = document.getElementById('debugLog');
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = timestamp + ': ' + msg;
  
  if (debugLog) {
    const line = document.createElement('div');
    line.className = 'debug-line';
    line.textContent = logMsg;
    debugLog.appendChild(line);
    debugLog.scrollTop = debugLog.scrollHeight;
  }
  console.log(logMsg);
  
  // Save to storage
  browserAPI.storage.local.get(['debugLogs'], function(result) {
    let logs = result.debugLogs || [];
    logs.push(logMsg);
    // Keep only last 100 messages
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }
    browserAPI.storage.local.set({debugLogs: logs});
  });
}

function showStatus(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + type;
  setTimeout(function() {
    statusMessage.className = 'status-message';
  }, 3000);
}

function displayKeywordTags(keywords) {
  const keywordTags = document.getElementById('keywordTags');
  keywordTags.innerHTML = '';
  keywords.forEach(keyword => {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.textContent = keyword;
    keywordTags.appendChild(tag);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  debug('Options page loaded');
  
  const keywordsTextarea = document.getElementById('keywords');
  const saveBtn = document.getElementById('saveBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const debugToggleBtn = document.getElementById('debugToggleBtn');
  const debugLog = document.getElementById('debugLog');
  
  // Load saved keywords
  browserAPI.storage.local.get(['keywords'], function(result) {
    debug('Loading keywords from storage');
    if (result.keywords) {
      const keywordsList = Array.isArray(result.keywords) ? result.keywords : result.keywords.split('\n');
      keywordsTextarea.value = keywordsList.join('\n');
      displayKeywordTags(keywordsList);
      debug('Loaded ' + keywordsList.length + ' keywords');
    }
  });
  
  // Load previous debug logs
  browserAPI.storage.local.get(['debugLogs'], function(result) {
    if (result.debugLogs && result.debugLogs.length > 0) {
      result.debugLogs.forEach(logMsg => {
        const line = document.createElement('div');
        line.className = 'debug-line';
        line.textContent = logMsg;
        debugLog.appendChild(line);
      });
      debugLog.scrollTop = debugLog.scrollHeight;
    }
  });
  
  // Save keywords button
  saveBtn.addEventListener('click', function() {
    const keywords = keywordsTextarea.value
      .split('\n')
      .filter(keyword => keyword.trim() !== '')
      .map(keyword => keyword.trim());
    
    debug('Saving ' + keywords.length + ' keywords');
    browserAPI.storage.local.set({keywords: keywords}, function() {
      debug('Keywords saved to storage');
      displayKeywordTags(keywords);
      showStatus('Keywords saved successfully!', 'success');
    });
  });
  
  // Export keywords
  exportBtn.addEventListener('click', function() {
    debug('Export button clicked');
    const keywords = keywordsTextarea.value
      .split('\n')
      .filter(keyword => keyword.trim() !== '')
      .map(keyword => keyword.trim());
    
    if (keywords.length === 0) {
      showStatus('No keywords to export', 'error');
      return;
    }
    
    debug('Exporting ' + keywords.length + ' keywords');
    browserAPI.runtime.sendMessage({
      action: 'exportKeywords',
      keywords: keywords
    }, function(response) {
      if (response && response.success) {
        debug('Export successful');
        showStatus('Keywords exported successfully!', 'success');
      } else {
        debug('Export failed: ' + (response?.error || 'Unknown error'));
        showStatus('Error: ' + (response?.error || 'Unable to export'), 'error');
      }
    });
  });
  
  // Import keywords
  importFile.addEventListener('change', function(event) {
    debug('File input change event detected');
    const files = this.files;
    debug('Number of files selected: ' + files.length);
    
    if (files.length === 0) {
      debug('No files were selected');
      return;
    }
    
    const file = files[0];
    debug('Processing file: ' + file.name + ', size: ' + file.size);
    
    const reader = new FileReader();
    
    reader.addEventListener('load', function(e) {
      debug('FileReader load event fired');
      const content = e.target.result;
      debug('File loaded, content length: ' + content.length);
      
      try {
        const lines = content.split('\n');
        const keywords = lines
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        debug('Parsed ' + keywords.length + ' keywords from file');
        
        if (keywords.length === 0) {
          showStatus('No keywords found in the file', 'error');
          return;
        }
        
        debug('Updating textarea with ' + keywords.length + ' keywords');
        keywordsTextarea.value = keywords.join('\n');
        displayKeywordTags(keywords);
        
        debug('Saving to storage');
        browserAPI.storage.local.set({keywords: keywords}, function() {
          debug('Keywords from file saved to storage');
          showStatus('Successfully imported ' + keywords.length + ' keywords!', 'success');
        });
      } catch (error) {
        debug('Error processing file: ' + error.message);
        showStatus('Error: ' + error.message, 'error');
      }
    });
    
    reader.addEventListener('error', function(e) {
      debug('FileReader error: ' + e.target.error);
      showStatus('Error reading file: ' + e.target.error, 'error');
    });
    
    debug('Starting to read file');
    reader.readAsText(file);
    
    // Reset file input
    this.value = '';
  });
  
  // Debug toggle
  debugToggleBtn.addEventListener('click', function() {
    debugLog.classList.toggle('visible');
    debugToggleBtn.textContent = debugLog.classList.contains('visible') ? 'Hide Debug Log' : 'Show Debug Log';
  });
});
