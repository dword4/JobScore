// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function displayScore(score) {
  const scoreDisplay = document.getElementById('scoreDisplay');
  if (scoreDisplay) {
    if (typeof score === 'object' && score.hits !== undefined && score.total !== undefined) {
      scoreDisplay.textContent = `${score.hits}/${score.total}`;
    } else {
      // Fallback for old format
      scoreDisplay.textContent = score.toString();
    }
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
  const keywordsTextarea = document.getElementById('keywords');
  const highlightBtn = document.getElementById('highlightBtn');
  const clearBtn = document.getElementById('clearBtn');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const keywordTags = document.getElementById('keywordTags');
  
  // Load saved keywords and score
  browserAPI.storage.local.get(['keywords', 'pageScore']).then(function(result) {
    if (result.keywords) {
      keywordsTextarea.value = result.keywords.join('\n');
      displayKeywordTags(result.keywords);
    }
    if (result.pageScore !== undefined) {
      displayScore(result.pageScore);
    }
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
