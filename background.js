chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'speakArticle' || request.action === 'readArticle') {
    var text = request.text;
    var tabId = sender.tab ? sender.tab.id : null;
    
    if (!text || !text.trim()) {
      if (tabId) {
        try {
          chrome.tabs.sendMessage(tabId, { action: 'updateStatus', message: 'No text to read', reading: false });
        } catch (e) {}
      }
      sendResponse({ error: 'no text' });
      return true;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'speakFromPopup',
          text: text,
          rate: request.rate || 1,
          pitch: request.pitch || 1,
          volume: request.volume || 1,
          voiceName: request.voiceName
        }, function(response) {
          if (chrome.runtime.lastError) {
            if (tabId) {
              try {
                chrome.tabs.sendMessage(tabId, { action: 'updateStatus', message: 'Open popup to read', reading: false });
              } catch (e) {}
            }
            sendResponse({ error: 'popup not available' });
            return;
          }
          sendResponse(response || { status: 'started' });
        });
      } else {
        sendResponse({ error: 'no tab' });
      }
    });
    return true;
    
  } else if (request.action === 'stopSpeaking') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopSpeaking' }, function(response) {});
      }
    });
    sendResponse({ status: 'stopped' });
    
  } else if (request.action === 'getArticle') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getArticle' }, function(response) {
          sendResponse(response || { hasArticle: false });
        });
      } else {
        sendResponse({ hasArticle: false });
      }
    });
    return true;
  }
  
  return false;
});
