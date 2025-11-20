# 🧠 Thesaurus Buddy v2.0

An intelligent writing assistant with live focus tracking, synonym suggestions, weak word detection, and advanced text analysis.

## ✨ Features

### Core Features
- **Live Focus Tracking**: Real-time highlighting of the current sentence and word
- **Smart Synonym Suggestions**: Powered by Datamuse API with automatic lookup
- **Weak Word Detection**: Identifies and flags filler words, intensifiers, hedges, and vague language
- **Advanced POS Tagging**: Heuristic-based part-of-speech detection with high accuracy
- **TF-IDF Topic Extraction**: Intelligent keyword extraction using term frequency-inverse document frequency
- **Case Preservation**: Smart word replacement that maintains original capitalization
- **Undo History**: Full history stack with 100-operation memory
- **Auto-Save**: Persistent draft storage using localStorage

### Technical Highlights
- **Modular Architecture**: Clean separation of concerns with ES6 modules
- **Comprehensive Documentation**: JSDoc annotations throughout
- **Test Coverage**: Unit tests for critical functionality
- **Error Handling**: Robust API retry logic with exponential backoff
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Debounced lookups, cached computations, idle callbacks
- **Unicode Support**: Full international character support with fallbacks

## 📁 Project Structure

```
engapp/
├── src/
│   ├── config/
│   │   └── settings.js          # Centralized configuration
│   ├── modules/
│   │   ├── EditorController.js  # Editor state management
│   │   └── UIManager.js         # UI rendering and updates
│   ├── utils/
│   │   ├── apiClient.js         # API communication with retry logic
│   │   ├── posDetection.js      # Part-of-speech detection
│   │   ├── textProcessing.js    # Text manipulation utilities
│   │   ├── topicExtraction.js   # TF-IDF keyword extraction
│   │   └── weakWordDetector.js  # Weak word analysis
│   ├── app.js                   # Main application logic
│   └── index.js                 # Entry point
├── public/
│   └── styles.css               # Application styles
├── tests/
│   ├── setup.js                 # Test configuration
│   ├── textProcessing.test.js   # Text processing tests
│   ├── posDetection.test.js     # POS detection tests
│   └── weakWordDetector.test.js # Weak word detector tests
├── index.html                   # HTML entry point
├── vite.config.js               # Build configuration
├── package.json                 # Dependencies and scripts
├── thesaurus-buddy.html         # Original single-file version (legacy)
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🎯 Usage

### Basic Workflow

1. **Start typing** in the editor - the current sentence will be highlighted
2. **Position cursor** on a word - synonym suggestions appear automatically
3. **Click a suggestion** to replace the word instantly
4. **Flag weak words** using the button to identify areas for improvement
5. **Undo changes** with the undo button (100-operation history)

### Keyboard Shortcuts

- **Enter** (in search box): Perform manual lookup
- **Enter** (in preview box): Apply replacement
- **Escape** (in search/preview): Clear input
- **Arrow Left/Right** (in results): Navigate suggestions
- **Enter/Space** (on suggestion chip): Apply replacement

### API Integration

The app uses the [Datamuse API](https://www.datamuse.com/api/) for word suggestions:
- **rel_syn**: Synonyms (words with similar meaning)
- **ml**: Meaning-like words (broader semantic similarity)
- **sp**: Spelling completions (for partial words)

No API key required - the service is free for reasonable use.

## 🔧 Configuration

Settings are managed in `src/config/settings.js`. Key configurations:

```javascript
{
  editor: {
    maxHistory: 100,        // Maximum undo operations
    autoSaveDelay: 500,     // Auto-save debounce (ms)
  },
  api: {
    maxRetries: 3,          // Network retry attempts
    retryDelays: [1000, 2000, 4000], // Retry delays (ms)
    maxResults: 80          // Maximum API results
  },
  lookup: {
    debounceDelay: 250,     // Lookup debounce (ms)
    minQueryLength: 2       // Minimum characters to lookup
  },
  topics: {
    maxKeywords: 6,         // Number of topic keywords
    cacheSize: 20           // Topic cache size
  }
}
```

Settings can be modified at runtime using the `Settings` class:

```javascript
import { settings } from './src/config/settings.js';

settings.set('api.maxRetries', 5);
settings.save();
```

## 📊 Weak Word Categories

The detector identifies several categories of weak language:

- **Intensifiers**: very, really, extremely, incredibly
- **Vague Words**: stuff, things, something, good, bad
- **Fillers**: basically, literally, actually, honestly
- **Hedges**: just, only, merely, simply, rather
- **Weak Phrases**: kind of, sort of, a lot, in fact, you know

Each detection includes:
- Category and severity level (high/medium/low)
- Optional replacement suggestion
- Advice for improvement

## 🧪 Testing

The project includes comprehensive unit tests using Vitest:

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# UI test explorer
npm run test:ui
```

### Test Coverage

- ✅ Text processing utilities
- ✅ POS detection algorithms
- ✅ Weak word detection
- ✅ Topic extraction (TF-IDF)
- ⏳ API client (integration tests)
- ⏳ Editor controller (unit tests)
- ⏳ UI manager (component tests)

## 🎨 Customization

### Theme Colors

Edit CSS variables in `public/styles.css`:

```css
:root {
  --bg: #0f1220;          /* Background */
  --panel: #171a2c;       /* Card background */
  --ink: #eceff6;         /* Text color */
  --accent: #7aa2f7;      /* Primary accent */
  --accent2: #9ece6a;     /* Secondary accent */
  --danger: #f7768e;      /* Error/warning */
}
```

### Adding Custom Weak Words

Edit `WEAK_WORDS` in `src/config/settings.js`:

```javascript
export const WEAK_WORDS = {
  custom: ['actually', 'honestly', 'literally'],
  // ... other categories
};
```

### Extending POS Rules

Add patterns to `POS_RULES` in `src/config/settings.js`:

```javascript
export const POS_RULES = [
  { pattern: /ology$/i, pos: 'noun', confidence: 'high' },
  // ... other rules
];
```

## 🌐 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Unicode Support**: Automatic detection with ASCII fallback
- **Graceful Degradation**: Works without requestIdleCallback, AbortController

## 📝 Architecture Improvements (v2.0)

### Compared to v1.0 (single-file version):

✅ **Modular Design**: Separated into logical modules
✅ **Configuration System**: Centralized, runtime-modifiable settings
✅ **Enhanced POS Detection**: 200+ irregular verbs, comprehensive word lists
✅ **TF-IDF Topic Extraction**: More sophisticated keyword analysis
✅ **Improved Weak Word Detection**: Expanded categories and suggestions
✅ **Test Suite**: Unit tests with Vitest
✅ **Build System**: Vite for development and production builds
✅ **Documentation**: Comprehensive JSDoc annotations
✅ **Error Handling**: User-friendly error messages and retry logic
✅ **Accessibility**: Enhanced ARIA labels and keyboard navigation

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Add more comprehensive test coverage
- [ ] Implement proper NLP library for POS tagging
- [ ] Add settings UI panel
- [ ] Support multiple languages
- [ ] Implement readability scoring (Flesch-Kincaid, etc.)
- [ ] Add grammar checking
- [ ] Export/import documents
- [ ] Dark/light theme toggle
- [ ] Plugin system for custom analyzers

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- **Datamuse API**: For providing excellent word data
- **Original Design**: Based on the single-file Thesaurus Buddy concept
- **Community**: For feedback and suggestions

## 📮 Support

For issues, questions, or suggestions:
- Create an issue in the repository
- Check existing documentation
- Review test files for usage examples

---

**Built with ❤️ for writers, students, and content creators**
