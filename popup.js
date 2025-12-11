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

function displayScore(score) {
  const scoreDisplay = document.getElementById('scoreDisplay');
  const scoreContainer = scoreDisplay?.parentElement;
  
  if (scoreDisplay) {
    if (typeof score === 'object' && score.hits !== undefined && score.total !== undefined) {
      scoreDisplay.textContent = `${score.hits}/${score.total}`;
      // Set color based on score ratio (inverted: low score = green, high score = red)
      const ratio = score.total > 0 ? score.hits / score.total : 0;
      const color = getScoreColor(ratio);
      scoreDisplay.style.color = color;
      
      // Also update border color of the container
      if (scoreContainer) {
        scoreContainer.style.borderColor = color;
      }
    } else {
      // Fallback for old format
      scoreDisplay.textContent = score.toString();
      scoreDisplay.style.color = '#4CAF50';
      if (scoreContainer) {
        scoreContainer.style.borderColor = '#4CAF50';
      }
    }
  }
}

function getScoreColor(ratio) {
  // Inverted color scheme: 0% = green, 100% = red
  // Green (good): rgb(76, 175, 80)
  // Yellow (medium): rgb(255, 193, 7) 
  // Red (bad): rgb(244, 67, 54)
  
  if (ratio <= 0.3) {
    // Green to yellow-green (0-30%)
    const factor = ratio / 0.3;
    const r = Math.round(76 + (200 - 76) * factor);
    const g = Math.round(175 + (220 - 175) * factor);
    const b = Math.round(80 + (60 - 80) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio <= 0.7) {
    // Yellow-green to orange (30-70%)
    const factor = (ratio - 0.3) / 0.4;
    const r = Math.round(200 + (255 - 200) * factor);
    const g = Math.round(220 + (150 - 220) * factor);
    const b = Math.round(60 + (7 - 60) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Orange to red (70-100%)
    const factor = (ratio - 0.7) / 0.3;
    const r = Math.round(255 + (244 - 255) * factor);
    const g = Math.round(150 + (67 - 150) * factor);
    const b = Math.round(7 + (54 - 7) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Listen for score updates from content script
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'scoreUpdated') {
    displayScore(request.score);
    browserAPI.storage.local.set({pageScore: request.score});
  }
});

document.addEventListener('DOMContentLoaded', function() {
  debug('DOMContentLoaded fired');
  const keywordsTextarea = document.getElementById('keywords');
  const highlightBtn = document.getElementById('highlightBtn');
  const clearBtn = document.getElementById('clearBtn');
  const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const keywordTags = document.getElementById('keywordTags');
  
  debug('optionsBtn element found: ' + (optionsBtn ? 'yes' : 'no'));
  
  // Load saved keywords and score
  browserAPI.storage.local.get(['keywords', 'pageScore', 'overlayVisible']).then(function(result) {
    if (result.keywords) {
      keywordsTextarea.value = result.keywords.join('\n');
      displayKeywordTags(result.keywords);
    }
    if (result.pageScore !== undefined) {
      displayScore(result.pageScore);
    }
    // Update toggle button text based on overlay state
    updateToggleButtonText(result.overlayVisible !== false);
  });
  
  // Update score from active tab
  updateScore();
  
  highlightBtn.addEventListener('click', function() {
    const keywords = keywordsTextarea.value
      .split('\n')
      .filter(keyword => keyword.trim() !== '')
      .map(keyword => keyword.trim().toLowerCase());
    
    if (keywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }
    
    // Save keywords
    browserAPI.storage.local.set({keywords: keywords});
    displayKeywordTags(keywords);
    
    // Send message to content script
    browserAPI.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {
        action: 'highlight',
        keywords: keywords
      }).then(function(response) {
        console.log('Received response from content script:', response);
        if (response && response.score !== undefined) {
          displayScore(response.score);
          browserAPI.storage.local.set({pageScore: response.score});
        }
      }).catch(function(error) {
        console.error('Error:', error);
      });
    });
  });
  
  clearBtn.addEventListener('click', function() {
    browserAPI.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {
        action: 'clear'
      });
    });
    displayScore({ hits: 0, total: 0 });
    browserAPI.storage.local.set({pageScore: { hits: 0, total: 0 }});
  });
  
  toggleOverlayBtn.addEventListener('click', function() {
    browserAPI.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {
        action: 'toggleOverlay'
      }).then(function(response) {
        if (response && response.visible !== undefined) {
          updateToggleButtonText(response.visible);
        }
      }).catch(function(error) {
        console.error('Error toggling overlay:', error);
      });
    });
  });

  // Options button - open the options page
  if (optionsBtn) {
    optionsBtn.addEventListener('click', function() {
      debug('Options button clicked');
      browserAPI.runtime.openOptionsPage();
    });
  }
  
  function updateToggleButtonText(isVisible) {
    toggleOverlayBtn.textContent = isVisible ? 'Hide Score Overlay' : 'Show Score Overlay';
  }
  
  function displayKeywordTags(keywords) {
    keywordTags.innerHTML = '';
    keywords.forEach(keyword => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.textContent = keyword;
      keywordTags.appendChild(tag);
    });
  }
  
  function updateScore() {
    browserAPI.tabs.query({active: true, currentWindow: true}).then(function(tabs) {
      browserAPI.tabs.sendMessage(tabs[0].id, {
        action: 'getScore'
      }).then(function(response) {
        if (response && response.score !== undefined) {
          displayScore(response.score);
        }
      }).catch(function(error) {
        // Content script might not be ready yet
        console.log('Could not get score:', error);
      });
    });
  }
});

