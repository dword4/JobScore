// Cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentScore = { hits: 0, total: 0 };
let highlightedElements = [];
let currentKeywords = [];
let observer = null;

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'highlight') {
    clearHighlights();
    currentKeywords = request.keywords;
    const scoreData = highlightKeywordsSync(request.keywords);
    currentScore = scoreData;
    startObserving();
    sendResponse({score: scoreData});
  } else if (request.action === 'clear') {
    clearHighlights();
    stopObserving();
    currentKeywords = [];
    currentScore = { hits: 0, total: 0 };
    sendResponse({score: currentScore});
  } else if (request.action === 'getScore') {
    sendResponse({score: currentScore});
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
        
        // Notify popup of score change if it's listening
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
              parent.closest('.keyword-highlight')
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
        total: keywords.length
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
          parent.closest('.keyword-highlight')
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
    total: keywords.length
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
