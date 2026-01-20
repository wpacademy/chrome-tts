var isSpeaking = false;
var currentSettings = { rate: 1, pitch: 1, volume: 1, voiceName: null };
var isSpeakingLocked = false;
var pendingSpeech = null;

document.addEventListener('DOMContentLoaded', function() {
  var readSelectedBtn = document.getElementById('readSelected');
  var readArticleBtn = document.getElementById('readArticle');
  var readPageBtn = document.getElementById('readPage');
  var stopBtn = document.getElementById('stop');
  var rateSlider = document.getElementById('rate');
  var pitchSlider = document.getElementById('pitch');
  var volumeSlider = document.getElementById('volume');
  var rateValue = document.getElementById('rateValue');
  var pitchValue = document.getElementById('pitchValue');
  var volumeValue = document.getElementById('volumeValue');
  var voiceSelect = document.getElementById('voiceSelect');
  var statusDiv = document.getElementById('status');
  var articleIndicator = document.getElementById('articleIndicator');

  var synthesis = window.speechSynthesis;
  var voices = [];

  console.log('Popup initialized, synthesis:', synthesis ? 'available' : 'not available');

  function updateStatus(message, speaking) {
    statusDiv.textContent = message;
    statusDiv.classList.toggle('speaking', speaking);
  }

  function loadVoices() {
    var allVoices = synthesis ? synthesis.getVoices() : [];
    console.log('All voices loaded:', allVoices.length);
    
    voices = allVoices.filter(function(voice) {
      var name = voice.name.toLowerCase();
      var isGoogle = name.includes('google') || name.includes('wavenet') || name.includes('neural');
      return !isGoogle;
    });
    
    console.log('Filtered voices:', voices.length, 'of', allVoices.length);
    
    voiceSelect.innerHTML = '';
    
    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">No voices available</option>';
      return;
    }
    
    for (var i = 0; i < voices.length; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = voices[i].name + ' (' + (voices[i].lang || 'unknown') + ')';
      voiceSelect.appendChild(opt);
    }
    
    restoreVoiceSelection();
  }

  function restoreVoiceSelection() {
    if (currentSettings.voiceName && voices.length > 0) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === currentSettings.voiceName) {
          voiceSelect.value = i;
          console.log('Restored voice:', voices[i].name);
          break;
        }
      }
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(['rate', 'pitch', 'volume', 'voiceName'], function(result) {
      rateSlider.value = result.rate !== undefined ? result.rate : 1;
      pitchSlider.value = result.pitch !== undefined ? result.pitch : 1;
      volumeSlider.value = result.volume !== undefined ? result.volume : 1;
      
      rateValue.textContent = (result.rate || 1) + 'x';
      pitchValue.textContent = result.pitch || 1;
      volumeValue.textContent = Math.round((result.volume || 1) * 100) + '%';
      
      currentSettings = {
        rate: parseFloat(rateSlider.value),
        pitch: parseFloat(pitchSlider.value),
        volume: parseFloat(volumeSlider.value),
        voiceName: result.voiceName || null
      };
      
      console.log('Settings loaded:', currentSettings);
      loadVoices();
    });
  }

  function saveSettings() {
    var selectedVoice = voices[voiceSelect.value];
    var voiceName = selectedVoice ? selectedVoice.name : null;
    
    currentSettings = {
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
      volume: parseFloat(volumeSlider.value),
      voiceName: voiceName
    };
    
    console.log('Saving settings:', currentSettings);
    
    chrome.storage.sync.set(currentSettings, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'reloadSettings' }, function(response) {});
          } catch (e) {}
        }
      });
    });
  }

  function checkForArticle() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) return;
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getArticle' }, function(response) {
          if (chrome.runtime.lastError) return;
          
          if (response && response.hasArticle) {
            articleIndicator.classList.remove('hidden');
            readArticleBtn.classList.remove('hidden');
          } else {
            articleIndicator.classList.add('hidden');
            readArticleBtn.classList.add('hidden');
          }
        });
      } catch (e) {}
    });
  }

  if (synthesis) {
    synthesis.onvoiceschanged = function() {
      console.log('Voices changed event');
      loadVoices();
    };
    loadSettings();
  } else {
    voiceSelect.innerHTML = '<option value="">Speech not supported</option>';
    updateStatus('Speech not supported');
  }

  rateSlider.oninput = function() {
    rateValue.textContent = rateSlider.value + 'x';
    saveSettings();
  };
  
  pitchSlider.oninput = function() {
    pitchValue.textContent = pitchSlider.value;
    saveSettings();
  };
  
  volumeSlider.oninput = function() {
    volumeValue.textContent = Math.round(volumeSlider.value * 100) + '%';
    saveSettings();
  };
  
  voiceSelect.onchange = saveSettings;

  function doRead(text, type) {
    console.log('doRead called with text length:', text ? text.length : 'null');
    console.log('Text preview:', text ? text.substring(0, 100) + '...' : 'null');
    
    if (!text || text.trim().length === 0) {
      console.log('No text to read');
      updateStatus('No text to read');
      return;
    }
    
    if (!synthesis) {
      console.log('Speech synthesis not available');
      updateStatus('Speech not supported');
      return;
    }
    
    console.log('Starting speech directly...');
    synthesis.cancel();
    
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(rateSlider.value);
    utterance.pitch = parseFloat(pitchSlider.value);
    utterance.volume = parseFloat(volumeSlider.value);
    
    var voice = voices[voiceSelect.value];
    if (voice) {
      utterance.voice = voice;
      console.log('Using voice:', voice.name);
    } else {
      console.log('No voice selected, using default');
    }
    
    utterance.onstart = function() {
      console.log('Speech started successfully');
      isSpeaking = true;
      updateStatus('Reading ' + type + '...', true);
    };
    
    utterance.onend = function() {
      console.log('Speech ended successfully');
      isSpeaking = false;
      updateStatus('Done reading');
    };
    
    utterance.onerror = function(e) {
      console.log('Speech error:', e.error);
      isSpeaking = false;
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        updateStatus('Error: ' + e.error);
      }
    };
    
    console.log('Calling synthesis.speak()...');
    synthesis.speak(utterance);
    console.log('speak() called, speaking:', synthesis.speaking);
    
    setTimeout(function() {
      console.log('After speak(), synthesis.speaking:', synthesis.speaking);
      console.log('After speak(), synthesis.pending:', synthesis.pending);
      
      if (!synthesis.speaking && !synthesis.pending && isSpeaking) {
        console.log('Speech appears to have stopped unexpectedly');
      }
    }, 500);
  }

  readSelectedBtn.onclick = function() {
    console.log('Read Selected clicked');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        updateStatus('No active tab');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' }, function(response) {
          if (chrome.runtime.lastError) {
            updateStatus('Cannot access page');
            return;
          }
          
          if (response && response.text && response.text.trim()) {
            doRead(response.text, 'selected text');
          } else {
            updateStatus('No text selected');
          }
        });
      } catch (e) {
        updateStatus('Error accessing page');
      }
    });
  };

  readArticleBtn.onclick = function() {
    console.log('Read Article clicked');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      console.log('Active tab:', tabs[0]?.id);
      
      if (!tabs[0]) {
        updateStatus('No active tab');
        return;
      }
      
      console.log('Sending getArticle message to tab...');
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getArticle' }, function(response) {
          console.log('Response received:', response);
          
          if (chrome.runtime.lastError) {
            console.log('Runtime error:', chrome.runtime.lastError);
            updateStatus('Cannot access page');
            return;
          }
          
          if (!response) {
            console.log('No response from content script');
            updateStatus('No response from page');
            return;
          }
          
          if (response.hasArticle) {
            console.log('Article found, length:', response.text ? response.text.length : 'null');
            
            chrome.runtime.sendMessage({ 
              action: 'readArticle', 
              text: response.text,
              rate: parseFloat(rateSlider.value),
              pitch: parseFloat(pitchSlider.value),
              volume: parseFloat(volumeSlider.value),
              voiceName: voices[voiceSelect.value] ? voices[voiceSelect.value].name : null
            }, function(rsp) {
              console.log('Background response:', rsp);
            });
          } else {
            console.log('No article found on page');
            updateStatus('No article found');
          }
        });
      } catch (e) {
        console.log('Exception:', e);
        updateStatus('Error accessing page');
      }
    });
  };

  readPageBtn.onclick = function() {
    console.log('Read Page clicked');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) {
        updateStatus('No active tab');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageText' }, function(response) {
          if (chrome.runtime.lastError) {
            updateStatus('Cannot access page');
            return;
          }
          
          if (response && response.text && response.text.trim()) {
            doRead(response.text, 'page');
          } else {
            updateStatus('No text found');
          }
        });
      } catch (e) {
        updateStatus('Error accessing page');
      }
    });
  };

  stopBtn.onclick = function() {
    console.log('Stop clicked');
    if (synthesis) {
      synthesis.cancel();
    }
    isSpeaking = false;
    isSpeakingLocked = false;
    updateStatus('Stopped');
    chrome.runtime.sendMessage({ action: 'stopSpeaking' });
  };

  checkForArticle();
});
