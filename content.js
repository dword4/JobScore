// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentScore = { hits: 0, total: 0 };
let highlightedElements = [];
let currentKeywords = [];
let observer = null;
let scoreOverlay = null;
let isOverlayVisible = true;
let overlayPosition = { x: 20, y: 20 };

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'highlight') {
    clearHighlights();
    currentKeywords = request.keywords;
    const scoreData = highlightKeywordsSync(request.keywords);
    currentScore = scoreData;
    createOrUpdateOverlay();
    startObserving();
    sendResponse({score: scoreData});
  } else if (request.action === 'clear') {
    clearHighlights();
    stopObserving();
    currentKeywords = [];
    currentScore = { hits: 0, total: 0 };
    createOrUpdateOverlay();
    sendResponse({score: currentScore});
  } else if (request.action === 'getScore') {
    sendResponse({score: currentScore});
  } else if (request.action === 'showOverlay') {
    isOverlayVisible = true;
    createOrUpdateOverlay();
    browserAPI.storage.local.set({overlayVisible: true});
    sendResponse({success: true});
  } else if (request.action === 'hideOverlay') {
    isOverlayVisible = false;
    if (scoreOverlay) {
      scoreOverlay.style.display = 'none';
    }
    browserAPI.storage.local.set({overlayVisible: false});
    sendResponse({success: true});
  } else if (request.action === 'toggleOverlay') {
    isOverlayVisible = !isOverlayVisible;
    if (isOverlayVisible) {
      createOrUpdateOverlay();
    } else if (scoreOverlay) {
      scoreOverlay.style.display = 'none';
    }
    browserAPI.storage.local.set({overlayVisible: isOverlayVisible});
    sendResponse({visible: isOverlayVisible});
  }
});

function startObserving() {
  if (observer) {
    observer.disconnect();
  }
  
  observer = new MutationObserver(function(mutations) {
    let shouldReHighlight = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            shouldReHighlight = true;
          }
        });
      }
    });
    
    if (shouldReHighlight && currentKeywords.length > 0) {
      // Debounce re-highlighting to avoid too many calls
      clearTimeout(window.rehighlightTimeout);
      window.rehighlightTimeout = setTimeout(() => {
        console.log('Re-highlighting due to DOM changes');
        clearHighlights();
        const newScore = highlightKeywordsSync(currentKeywords);
        currentScore = newScore;
        
        // Update overlay and notify popup of score change
        createOrUpdateOverlay();
        try {
          browserAPI.runtime.sendMessage({
            action: 'scoreUpdated',
            score: newScore
          });
        } catch (e) {
          // Popup might not be open
        }
      }, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  clearTimeout(window.rehighlightTimeout);
}

function highlightKeywords(keywords) {
  console.log('Highlighting keywords:', keywords);
  const foundKeywords = new Set();
  
  // Wait a bit for dynamic content to load
  return new Promise((resolve) => {
    setTimeout(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentElement;
            if (parent && (
              parent.tagName === 'SCRIPT' || 
              parent.tagName === 'STYLE' || 
              parent.tagName === 'NOSCRIPT' ||
              parent.classList.contains('keyword-highlight') ||
              parent.closest('.keyword-highlight') ||
              parent.closest('#job-score-overlay')
            )) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        // Only process text nodes with meaningful content
        if (node.textContent.trim().length > 0) {
          textNodes.push(node);
        }
      }
      
      console.log(`Processing ${textNodes.length} text nodes`);
      
      textNodes.forEach(textNode => {
        let text = textNode.textContent;
        let hasMatches = false;
        let newHTML = text;
        
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b(${escapeRegex(keyword)})\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) {
            console.log(`Found keyword "${keyword}" in text:`, text.substring(0, 100));
            foundKeywords.add(keyword.toLowerCase());
            hasMatches = true;
            newHTML = newHTML.replace(regex, '<span class="keyword-highlight">$1</span>');
          }
        });
        
        if (hasMatches) {
          try {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = newHTML;
            
            // Ensure parent still exists before replacing
            if (textNode.parentNode) {
              textNode.parentNode.replaceChild(wrapper, textNode);
              highlightedElements.push(wrapper);
            }
          } catch (e) {
            console.warn('Failed to highlight text node:', e);
          }
        }
      });
      
      const result = {
        hits: foundKeywords.size,
        total: keywords.length,
        foundKeywords: Array.from(foundKeywords)
      };
      console.log('Score result:', result);
      resolve(result);
    }, 100);
  });
}

// Synchronous version for immediate use
function highlightKeywordsSync(keywords) {
  console.log('Highlighting keywords:', keywords);
  const foundKeywords = new Set();
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (parent && (
          parent.tagName === 'SCRIPT' || 
          parent.tagName === 'STYLE' || 
          parent.tagName === 'NOSCRIPT' ||
          parent.classList.contains('keyword-highlight') ||
          parent.closest('.keyword-highlight') ||
          parent.closest('#job-score-overlay')
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    // Only process text nodes with meaningful content
    if (node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }
  
  console.log(`Processing ${textNodes.length} text nodes`);
  
  textNodes.forEach(textNode => {
    let text = textNode.textContent;
    let hasMatches = false;
    let newHTML = text;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${escapeRegex(keyword)})\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        console.log(`Found keyword "${keyword}" in text:`, text.substring(0, 100));
        foundKeywords.add(keyword.toLowerCase());
        hasMatches = true;
        newHTML = newHTML.replace(regex, '<span class="keyword-highlight">$1</span>');
      }
    });
    
    if (hasMatches) {
      try {
        const wrapper = document.createElement('span');
        wrapper.innerHTML = newHTML;
        
        // Ensure parent still exists before replacing
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(wrapper, textNode);
          highlightedElements.push(wrapper);
        }
      } catch (e) {
        console.warn('Failed to highlight text node:', e);
      }
    }
  });
  
  const result = {
    hits: foundKeywords.size,
    total: keywords.length,
    foundKeywords: Array.from(foundKeywords)
  };
  console.log('Score result:', result);
  return result;
}

function clearHighlights() {
  highlightedElements.forEach(element => {
    const parent = element.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(element.textContent), element);
      parent.normalize();
    }
  });
  highlightedElements = [];
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function createOrUpdateOverlay() {
  if (!isOverlayVisible) return;
  
  if (!scoreOverlay) {
    scoreOverlay = document.createElement('div');
    scoreOverlay.id = 'job-score-overlay';
    scoreOverlay.innerHTML = `
      <div class="score-header">
        <span class="score-title">Job Score</span>
        <div class="score-controls">
          <button class="minimize-btn" title="Minimize">−</button>
          <button class="close-btn" title="Hide">×</button>
        </div>
      </div>
      <div class="score-content">
        <div class="score-number">0/0</div>
        <div class="score-keywords"></div>
      </div>
    `;
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      #job-score-overlay {
        position: fixed;
        top: ${overlayPosition.y}px;
        right: ${overlayPosition.x}px;
        width: 200px;
        background: #ffffff;
        border: 2px solid #4CAF50;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        user-select: none;
        transition: all 0.3s ease;
      }
      
      #job-score-overlay.minimized .score-content {
        display: none;
      }
      
      #job-score-overlay.minimized {
        width: 120px;
      }
      
      #job-score-overlay .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: #4CAF50;
        color: white;
        border-radius: 6px 6px 0 0;
        cursor: move;
        font-weight: bold;
        font-size: 11px;
      }
      
      #job-score-overlay .score-controls {
        display: flex;
        gap: 4px;
      }
      
      #job-score-overlay .score-controls button {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 18px;
        height: 18px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #job-score-overlay .score-controls button:hover {
        background: rgba(255,255,255,0.3);
      }
      
      #job-score-overlay .score-content {
        padding: 12px;
        text-align: center;
      }
      
      #job-score-overlay .score-number {
        font-size: 18px;
        font-weight: bold;
        color: #4CAF50;
        margin-bottom: 8px;
        transition: color 0.3s ease;
      }
      
      #job-score-overlay .score-keywords {
        font-size: 10px;
        color: #666;
        max-height: 60px;
        overflow-y: auto;
      }
      
      #job-score-overlay .keyword-found {
        color: #4CAF50;
        font-weight: bold;
      }
      
      #job-score-overlay .keyword-missing {
        color: #999;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(scoreOverlay);
    
    // Add event listeners
    const minimizeBtn = scoreOverlay.querySelector('.minimize-btn');
    const closeBtn = scoreOverlay.querySelector('.close-btn');
    const header = scoreOverlay.querySelector('.score-header');
    
    minimizeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      scoreOverlay.classList.toggle('minimized');
    });
    
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      isOverlayVisible = false;
      scoreOverlay.style.display = 'none';
      browserAPI.storage.local.set({overlayVisible: false});
    });
    
    // Make draggable
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      const rect = scoreOverlay.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    });
    
    function handleDrag(e) {
      if (!isDragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - scoreOverlay.offsetWidth, e.clientX - dragOffset.x));
      const y = Math.max(0, Math.min(window.innerHeight - scoreOverlay.offsetHeight, e.clientY - dragOffset.y));
      scoreOverlay.style.left = x + 'px';
      scoreOverlay.style.top = y + 'px';
      scoreOverlay.style.right = 'auto';
      overlayPosition = { x: window.innerWidth - x - scoreOverlay.offsetWidth, y: y };
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopDrag);
      browserAPI.storage.local.set({overlayPosition: overlayPosition});
    }
  }
  
  // Update content
  const scoreNumber = scoreOverlay.querySelector('.score-number');
  const scoreKeywords = scoreOverlay.querySelector('.score-keywords');
  
  if (scoreNumber) {
    scoreNumber.textContent = `${currentScore.hits}/${currentScore.total}`;
    // Set color based on score ratio (inverted: low score = green, high score = red)
    const ratio = currentScore.total > 0 ? currentScore.hits / currentScore.total : 0;
    const color = getScoreColor(ratio);
    scoreNumber.style.color = color;
    
    // Update overlay border and header background color
    scoreOverlay.style.borderColor = color;
    const header = scoreOverlay.querySelector('.score-header');
    if (header) {
      header.style.backgroundColor = color;
    }
  }
  
  if (scoreKeywords && currentKeywords.length > 0) {
    const keywordElements = currentKeywords.map(keyword => {
      const found = currentScore.foundKeywords && currentScore.foundKeywords.includes(keyword.toLowerCase());
      return `<span class="${found ? 'keyword-found' : 'keyword-missing'}">${keyword}</span>`;
    });
    scoreKeywords.innerHTML = keywordElements.join(' • ');
  } else if (scoreKeywords) {
    scoreKeywords.innerHTML = 'No keywords set';
  }
  
  scoreOverlay.style.display = 'block';
}

// Load overlay settings on page load
browserAPI.storage.local.get(['overlayVisible', 'overlayPosition']).then(function(result) {
  if (result.overlayVisible !== undefined) {
    isOverlayVisible = result.overlayVisible;
  }
  if (result.overlayPosition) {
    overlayPosition = result.overlayPosition;
  }
  
  // Create overlay if it should be visible and there are keywords
  if (isOverlayVisible) {
    createOrUpdateOverlay();
  }
});
