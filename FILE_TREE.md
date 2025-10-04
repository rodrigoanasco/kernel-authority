# EEG Insights React - File Tree

Complete file structure of the eeg-insights-react project.

```
eeg-insights-react/
│
├── public/
│   └── sample-eeg.csv              # Sample EEG data file for testing
│
├── src/
│   ├── components/                 # React components
│   │   ├── AnalysisResults.jsx     # Component to display analysis results
│   │   ├── AnalysisResults.css     # Styles for AnalysisResults
│   │   ├── BandpowerPlot.jsx       # Component for bandpower visualization
│   │   ├── BandpowerPlot.css       # Styles for BandpowerPlot
│   │   ├── CSVUpload.jsx           # CSV file upload component
│   │   ├── CSVUpload.css           # Styles for CSVUpload
│   │   ├── EEGPlot.jsx             # EEG signal plotting component
│   │   └── EEGPlot.css             # Styles for EEGPlot
│   │
│   ├── utils/                      # Utility functions
│   │   ├── eegAnalysis.js          # Variance & bandpower computation
│   │   ├── mockLLM.js              # Mock AI explanation generator
│   │   └── reportExport.js         # Markdown & JSON export utilities
│   │
│   ├── assets/                     # Static assets (Vite default)
│   │   └── react.svg               # React logo
│   │
│   ├── App.jsx                     # Main application component
│   ├── App.css                     # Application layout styles
│   ├── main.jsx                    # Application entry point
│   └── index.css                   # Global CSS styles
│
├── .gitignore                      # Git ignore rules
├── eslint.config.js                # ESLint configuration
├── index.html                      # HTML template
├── package.json                    # NPM dependencies and scripts
├── package-lock.json               # Locked dependency versions
├── vite.config.js                  # Vite configuration
└── README.md                       # Project documentation

```

## File Descriptions

### Root Files

- **index.html**: Entry HTML file that mounts the React application
- **package.json**: Defines project dependencies and npm scripts
- **vite.config.js**: Vite build tool configuration
- **eslint.config.js**: ESLint linting rules

### Source Files (`src/`)

#### Main Application
- **main.jsx**: Application entry point, mounts React app to DOM
- **App.jsx**: Root component, manages state and orchestrates all other components
- **App.css**: Global application layout and styling
- **index.css**: Base CSS reset and global styles

#### Components (`src/components/`)

**CSVUpload.jsx / .css**
- File upload interface with drag-and-drop
- Parses CSV files using Papaparse
- Validates EEG data format
- Displays upload status and file information

**EEGPlot.jsx / .css**
- Plots raw EEG signal using Plotly.js
- Interactive time-domain visualization
- Configurable plot appearance

**BandpowerPlot.jsx / .css**
- Bar chart visualization of frequency band power
- Displays Delta, Theta, Alpha, Beta, Gamma bands
- Logarithmic scale for better visualization

**AnalysisResults.jsx / .css**
- Displays computed statistics (variance, bandpower)
- Shows AI-generated insights
- Presents detailed per-window data table
- Responsive card-based layout

#### Utilities (`src/utils/`)

**eegAnalysis.js**
- `computeVariance()`: Calculates signal variance
- `computeBandpower()`: Estimates power in frequency bands using DFT
- `splitIntoWindows()`: Divides signal into analysis windows
- `analyzeWindows()`: Complete analysis pipeline

**mockLLM.js**
- `generateMockExplanation()`: Creates AI-style interpretations
- Simulates LLM-generated clinical insights
- Pattern recognition and explanation generation

**reportExport.js**
- `exportToMarkdown()`: Generates formatted Markdown reports
- `downloadMarkdownReport()`: Triggers browser download
- `exportToJSON()`: Creates JSON data export
- `downloadJSONReport()`: Downloads JSON file

### Public Files (`public/`)

**sample-eeg.csv**
- Example EEG data file
- 256+ samples of simulated EEG signal
- Demonstrates proper CSV format

## Key Technologies

- **Vite**: Fast build tool and dev server
- **React**: Component-based UI framework
- **Plotly.js**: Interactive charting library
- **Papaparse**: CSV parsing library
- **ESLint**: Code quality and style checking

## Component Hierarchy

```
App
├── CSVUpload
├── Controls (inline in App)
├── EEGPlot
├── BandpowerPlot
├── AnalysisResults
└── Export Controls (inline in App)
```

## Data Flow

1. User uploads CSV → CSVUpload
2. CSV parsed → Raw data sent to App
3. App calls analyzeWindows() → Analysis results
4. App calls generateMockExplanation() → LLM insights
5. Results passed to child components:
   - EEGPlot (raw data)
   - BandpowerPlot (analysis results)
   - AnalysisResults (results + insights)
6. Export functions create downloadable reports

## Build Output (`dist/`)

After running `npm run build`:

```
dist/
├── index.html                      # Optimized HTML
├── assets/
│   ├── index-[hash].js             # Bundled JavaScript (~5MB)
│   └── index-[hash].css            # Bundled CSS (~6KB)
└── [other static assets]
```
