function detectArticle() {
  var candidates = [];
  
  var articleTag = document.querySelector('article');
  if (articleTag) {
    var text = articleTag.innerText || articleTag.textContent;
    if (text && text.trim().length > 200) {
      console.log('Found <article> tag with', text.length, 'characters');
      return { 
        element: articleTag, 
        text: text.trim(),
        hasArticleTag: true 
      };
    }
  }
  
  var articleSelectors = [
    '[role="article"]',
    '.article',
    '.post',
    '.entry-content',
    '.post-content',
    '.article-content',
    '.story-body',
    '.main-content',
    '#article-body',
    '.content-body',
    'main',
    '.main'
  ];
  
  for (var s = 0; s < articleSelectors.length; s++) {
    var elements = document.querySelectorAll(articleSelectors[s]);
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var text = el.innerText || el.textContent;
      var wordCount = text ? text.split(/\s+/).length : 0;
      
      if (wordCount > 100) {
        candidates.push({
          element: el,
          text: text.trim(),
          wordCount: wordCount,
          hasArticleTag: false
        });
      }
    }
  }
  
  if (candidates.length > 0) {
    candidates.sort(function(a, b) { return b.wordCount - a.wordCount; });
    console.log('Found', candidates.length, 'article candidates, using one with', candidates[0].text.length, 'characters');
    return candidates[0];
  }
  
  var paragraphs = document.querySelectorAll('p');
  var fullText = '';
  var parentElement = null;
  
  for (var j = 0; j < paragraphs.length; j++) {
    var p = paragraphs[j];
    var pText = p.innerText || p.textContent;
    if (pText && pText.trim().length > 20) {
      fullText += pText.trim() + ' ';
      if (!parentElement) {
        parentElement = p.parentElement;
      }
    }
  }
  
  if (fullText.length > 200 && parentElement) {
    console.log('Built from paragraphs:', fullText.length, 'characters');
    return {
      element: parentElement,
      text: fullText.trim(),
      hasArticleTag: false
    };
  }
  
  var bodyText = document.body.innerText || document.body.textContent;
  if (bodyText && bodyText.length > 200) {
    console.log('Using body text:', bodyText.length, 'characters');
    return {
      element: document.body,
      text: bodyText.replace(/\s+/g, ' ').trim(),
      hasArticleTag: false
    };
  }
  
  console.log('No article found on page');
  return null;
}

function injectStyles() {
  if (document.getElementById('tts-reader-styles')) {
    return;
  }
  
  var style = document.createElement('style');
  style.id = 'tts-reader-styles';
  style.textContent = [
    '.tts-reader-container {',
    '  position: fixed !important;',
    '  bottom: 20px !important;',
    '  right: 20px !important;',
    '  z-index: 999999 !important;',
    '  display: flex !important;',
    '  gap: 10px !important;',
    '}',
    '.tts-reader-btn {',
    '  width: 50px !important;',
    '  height: 50px !important;',
    '  border-radius: 50% !important;',
    '  border: none !important;',
    '  cursor: pointer !important;',
    '  display: flex !important;',
    '  align-items: center !important;',
    '  justify-content: center !important;',
    '  font-size: 20px !important;',
    '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;',
    '}',
    '.tts-reader-btn:hover {',
    '  transform: scale(1.1) !important;',
    '}',
    '.tts-play-btn {',
    '  background: #4CAF50 !important;',
    '  color: white !important;',
    '}',
    '.tts-stop-btn {',
    '  background: #f44336 !important;',
    '  color: white !important;',
    '}',
    '.tts-status {',
    '  position: fixed !important;',
    '  bottom: 80px !important;',
    '  right: 20px !important;',
    '  background: rgba(0, 0, 0, 0.85) !important;',
    '  color: white !important;',
    '  padding: 12px 18px !important;',
    '  border-radius: 8px !important;',
    '  font-size: 14px !important;',
    '  z-index: 999999 !important;',
    '  display: none !important;',
    '}',
    '.tts-status.visible {',
    '  display: block !important;',
    '}'
  ].join('');
  
  document.head.appendChild(style);
}

function createControls() {
  if (document.getElementById('tts-reader-container')) {
    return;
  }
  
  injectStyles();
  
  var container = document.createElement('div');
  container.id = 'tts-reader-container';
  container.className = 'tts-reader-container';
  
  var playBtn = document.createElement('button');
  playBtn.id = 'tts-play-btn';
  playBtn.className = 'tts-reader-btn tts-play-btn';
  playBtn.innerHTML = '&#9658;';
  playBtn.title = 'Read article';
  
  var stopBtn = document.createElement('button');
  stopBtn.id = 'tts-stop-btn';
  stopBtn.className = 'tts-reader-btn tts-stop-btn';
  stopBtn.innerHTML = '&#9632;';
  stopBtn.title = 'Stop reading';
  stopBtn.style.display = 'none';
  
  container.appendChild(playBtn);
  container.appendChild(stopBtn);
  
  document.body.appendChild(container);
  
  var status = document.createElement('div');
  status.id = 'tts-status';
  status.className = 'tts-status';
  document.body.appendChild(status);
  
  playBtn.onclick = handlePlayClick;
  stopBtn.onclick = handleStopClick;
  
  console.log('On-page controls created');
}

var isReading = false;
var currentSettings = { rate: 1, pitch: 1, volume: 1, voiceName: null };
var voices = [];

function loadSettings(callback) {
  chrome.storage.sync.get(['rate', 'pitch', 'volume', 'voiceName'], function(result) {
    currentSettings = {
      rate: result.rate || 1,
      pitch: result.pitch || 1,
      volume: result.volume || 1,
      voiceName: result.voiceName || null
    };
    loadVoices(callback);
  });
}

function loadVoices(callback) {
  var allVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  console.log('All voices loaded:', allVoices.length);
  
  voices = allVoices.filter(function(voice) {
    var name = voice.name.toLowerCase();
    var isGoogle = name.includes('google') || name.includes('wavenet') || name.includes('neural');
    if (isGoogle) {
      console.log('Filtering out potentially unavailable voice:', voice.name);
    }
    return !isGoogle;
  });
  
  console.log('Filtered voices:', voices.length, 'of', allVoices.length);
  console.log('Voice names:', voices.map(function(v) { return v.name; }).join(', '));
  
  if (voices.length === 0) {
    setTimeout(function() {
      loadVoices(callback);
    }, 200);
    return;
  }
  
  if (callback) callback();
}

function updateUI(reading) {
  var playBtn = document.getElementById('tts-play-btn');
  var stopBtn = document.getElementById('tts-stop-btn');
  
  if (playBtn) {
    playBtn.innerHTML = reading ? '&#10074;&#10074;' : '&#9658;';
    playBtn.title = reading ? 'Pause' : 'Read article';
  }
  
  if (stopBtn) {
    stopBtn.style.display = reading ? 'flex' : 'none';
  }
}

function showStatus(message) {
  var status = document.getElementById('tts-status');
  if (status) {
    status.textContent = message;
    status.classList.add('visible');
    setTimeout(function() {
      status.classList.remove('visible');
    }, 3000);
  }
}

function getVoiceFromSettings() {
  if (!voices.length || !currentSettings.voiceName) {
    return voices[0] || null;
  }
  
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].name === currentSettings.voiceName) {
      return voices[i];
    }
  }
  
  return voices[0] || null;
}

function handlePlayClick() {
  console.log('On-page play button clicked');
  
  var article = detectArticle();
  console.log('Article detected:', article ? article.text.length + ' chars' : 'null');
  
  if (!article || !article.text || article.text.length < 50) {
    showStatus('No article detected');
    return;
  }
  
  console.log('Sending speak request to background...');
  
  chrome.runtime.sendMessage({ 
    action: 'speakArticle', 
    text: article.text,
    rate: currentSettings.rate || 1,
    pitch: currentSettings.pitch || 1,
    volume: currentSettings.volume || 1,
    voiceName: currentSettings.voiceName
  }, function(response) {
    console.log('Response from background:', response);
  });
}

function handleStopClick() {
  chrome.runtime.sendMessage({ action: 'stopSpeaking' }, function(response) {
    isReading = false;
    updateUI(false);
    showStatus('Stopped');
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request.action);
  
  if (request.action === 'speakFromPopup') {
    console.log('Speaking from popup request, text length:', request.text ? request.text.length : 'null');
    
    if (!window.speechSynthesis) {
      showStatus('Speech not supported');
      sendResponse({ error: 'not supported' });
      return;
    }
    
    window.speechSynthesis.cancel();
    
    var utterance = new SpeechSynthesisUtterance(request.text);
    utterance.rate = request.rate || 1;
    utterance.pitch = request.pitch || 1;
    utterance.volume = request.volume || 1;
    
    var voice = null;
    if (request.voiceName && voices.length > 0) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === request.voiceName) {
          voice = voices[i];
          break;
        }
      }
    }
    
    if (voice) {
      utterance.voice = voice;
      console.log('Using requested voice:', voice.name);
    } else {
      console.log('No matching voice found, using first available:', voices[0] ? voices[0].name : 'none');
    }
    
    utterance.onstart = function() {
      console.log('utterance.onstart fired - speech should be playing');
      isReading = true;
      updateUI(true);
      showStatus('Reading article...');
    };
    
    utterance.onend = function() {
      console.log('utterance.onend fired - speech finished');
      isReading = false;
      updateUI(false);
      showStatus('Done reading');
    };
    
    utterance.onerror = function(e) {
      console.log('utterance.onerror:', e.error);
      isReading = false;
      updateUI(false);
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        showStatus('Error: ' + e.error);
      }
    };
    
    console.log('Calling window.speechSynthesis.speak()...');
    console.log('speechSynthesis.speaking before speak():', window.speechSynthesis.speaking);
    window.speechSynthesis.speak(utterance);
    console.log('speechSynthesis.speaking after speak():', window.speechSynthesis.speaking);
    sendResponse({ status: 'started' });
  } else if (request.action === 'stopSpeaking') {
    window.speechSynthesis.cancel();
    isReading = false;
    updateUI(false);
    sendResponse({ status: 'stopped' });
  } else if (request.action === 'updateStatus') {
    showStatus(request.message);
    updateUI(request.reading);
    sendResponse({ ok: true });
  } else if (request.action === 'getArticle') {
    var article = detectArticle();
    console.log('getArticle response:', article ? article.text.length + ' chars' : 'null');
    sendResponse({ 
      hasArticle: !!article,
      text: article ? article.text : null
    });
  } else if (request.action === 'getPageText') {
    var article = detectArticle();
    sendResponse({ text: article ? article.text : '' });
  } else if (request.action === 'getSelectedText') {
    var selection = window.getSelection();
    var selected = selection ? selection.toString().trim() : '';
    sendResponse({ text: selected });
  } else if (request.action === 'reloadSettings') {
    loadSettings();
    sendResponse({ ok: true });
  }
  return true;
});

function init() {
  console.log('Content script initializing...');
  
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() {
      voices = window.speechSynthesis.getVoices();
    };
  }
  
  loadSettings(function() {
    console.log('Settings loaded, creating controls...');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(createControls, 500);
      });
    } else {
      setTimeout(createControls, 500);
    }
  });
}

init();
