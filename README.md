# Job Keyword Score

A Firefox extension that highlights and scores job listings based on your custom keyword list.

## Features

- **Keyword Highlighting**: Automatically highlights all instances of your keywords on job listing pages
- **Scoring System**: Displays a score showing how many keywords appear on the page
- **Color-Coded Feedback**: Visual indicator that changes color based on keyword match ratio (green = good, red = high matches)
- **Score Overlay**: Toggle a floating overlay on the page showing your keyword score
- **Import/Export**: Easily save and load keyword lists from text files
- **Persistent Storage**: Your keywords are saved automatically and persist across browser sessions

## How It Works

1. Enter your desired keywords (programming languages, frameworks, skills, etc.)
2. Highlight keywords on the current page - the extension will count matches
3. View your score in the popup or toggle the on-page overlay
4. Use the Options page to manage, import, and export your keyword lists

## Installation

### For Development/Testing:

1. **Clone or download this repository** to your computer
   ```
   git clone <repository-url>
   cd JobScore
   ```

2. **Open Chrome Extension Manager**
   - Go to `chrome://extensions/` in your Chrome browser
   - Enable "Developer mode" (toggle in top right corner)

3. **Load the extension**
   - Click "Load unpacked"
   - Navigate to and select the `JobScore` folder
   - The extension will appear in your extensions list

4. **Pin the extension** (optional)
   - Click the puzzle icon in the top right of Chrome
   - Click the pin icon next to "Job Keyword Score" to keep it visible

## Usage

### In the Popup:
- **Enter keywords** in the text area (one per line)
- Click **Highlight Keywords** to scan the current page and show matches
- Click **Clear Highlights** to remove highlights
- Click **Toggle Score Overlay** to show/hide the floating score indicator
- Click **Open Options** to access the full settings page

### In the Options Page:
Access the full settings by:
1. Clicking **Open Options** in the popup, OR
2. Right-clicking the extension icon and selecting "Options"

In the Options page you can:
- **Manage Keywords**: Add, edit, or remove keywords
- **Save Keywords**: Click "Save Keywords" to store your current list
- **Export Keywords**: Download your keyword list as a `.txt` file
- **Import Keywords**: Upload a previously exported `.txt` file with your keywords

## File Format

When importing/exporting keywords, use a plain text file (`.txt`) with one keyword per line:

```
javascript
python
react
web development
remote
```

## Keyboard Shortcuts

Currently no keyboard shortcuts. All features are accessible through the popup and options page.

## Troubleshooting

### Keywords aren't highlighting:
- Make sure you've clicked "Highlight Keywords" after entering your keywords
- Check that the page has loaded completely
- Some websites may block content injection - the extension works on most job boards

### Score showing 0/0:
- Click "Highlight Keywords" first to scan the page
- The score updates only when you actively highlight

### Can't import a file:
- Make sure the file is a plain text file (`.txt`)
- Each keyword should be on its own line
- The file should contain at least one keyword

## Technical Details

- **Manifest Version**: 2
- **Permissions**: activeTab, storage, downloads
- **Storage**: Uses Chrome's local storage API (per-user, per-device)
- **Compatibility**: Chrome 51+

## File Structure

```
JobScore/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface
├── popup.js              # Popup logic
├── options.html          # Settings page
├── options.js            # Settings page logic
├── content.js            # Page content injection script
├── background.js         # Background service worker
├── highlight.css         # Styling for highlighted text
├── README.md             # This file
└── LICENSE               # License information
```

## How It Works (Technical)

1. **Content Script** (`content.js`): Injects into every webpage and listens for highlight commands
2. **Popup** (`popup.js`): Provides quick access to highlighting, clearing, and settings
3. **Background Script** (`background.js`): Handles file downloads for export functionality
4. **Options Page** (`options.js`): Full-featured settings interface for managing keywords

## License

See LICENSE file for details.

## Contributing

Feel free to submit issues or improvements!

## Version

1.0
