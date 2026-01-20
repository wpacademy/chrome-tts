# Text to Speech Reader

A Chrome extension that reads articles and web page text aloud using natural-sounding voices.

## Features

- **One-click reading** - Floating play button on every page to read articles instantly
- **Multiple reading modes** - Read selected text, entire articles, or full pages
- **Customizable voice** - Choose from available system voices
- **Adjustable settings** - Control speed, pitch, and volume
- **Auto-detects articles** - Automatically finds main content on web pages
- **Persistent settings** - Your preferences are saved automatically

## Installation

1. Download the latest release or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `text-to-speech-extension` folder
6. The extension icon will appear in your toolbar

## Usage

### On-Page Controls
- Open any webpage with article content
- Click the green **Play** button (bottom-right corner) to start reading
- Click the **Stop** button to pause
- The extension automatically detects the main article text

### Popup Controls
1. Click the extension icon in Chrome's toolbar
2. **Read Selected Text** - Read your current text selection
3. **Read Article** - Read the detected article on the page
4. **Read Entire Page** - Read all text on the page
5. **Stop** - Stop any ongoing speech
6. Adjust **Speed**, **Pitch**, and **Volume** sliders
7. Select a different **Voice** from the dropdown

## Supported Voices

The extension uses your system's built-in voices:
- **Windows**: Microsoft David, Microsoft Zira, Microsoft Huihui, etc.
- **macOS**: Samantha, Victoria, Alex, and others
- **Linux**: Various installed voices

Note: Some voices listed by Chrome (Google Wavenet/Neural) require Google Cloud credentials and may not work. The extension filters these to show only reliable system voices.

## Privacy

- All speech processing happens locally in your browser
- No data is sent to external servers
- No tracking or analytics
- No permissions to access personal data

## Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, tabs, storage
- **No external dependencies**: Pure JavaScript, no external libraries

## Files

- `manifest.json` - Extension configuration
- `background.js` - Message routing service worker
- `content.js` - Content script for text extraction and on-page UI
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality and direct speech synthesis
- `icons/` - Extension icons

## Contributing

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use and modify for personal or commercial projects.
