# 🧠 EEG Insights React

A modern web application for EEG signal analysis built with Vite, React, and Plotly.js. This tool allows you to upload EEG data in CSV format, visualize the signals, compute variance and bandpower metrics per window, and export comprehensive analysis reports.

## ✨ Features

- **CSV Upload**: Easy drag-and-drop or click-to-upload interface for EEG data files
- **Interactive Visualization**: Real-time EEG signal plotting with Plotly.js
- **Signal Analysis**:
  - Variance computation per window
  - Bandpower calculation for standard EEG frequency bands:
    - Delta (0.5-4 Hz)
    - Theta (4-8 Hz)
    - Alpha (8-13 Hz)
    - Beta (13-30 Hz)
    - Gamma (30-50 Hz)
- **AI-Powered Insights**: Mock LLM-generated explanations of EEG patterns
- **Report Export**: 
  - Markdown format with full analysis
  - JSON format with raw data
- **Configurable Parameters**: Adjust window size and sampling rate

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rodrigoanasco/kernel-authority.git
cd kernel-authority/eeg-insights-react
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 📦 Dependencies

### Core Dependencies
- **React** (v19.1.1): UI framework
- **Plotly.js** (v3.1.1): Interactive plotting library
- **react-plotly.js** (v2.6.0): React wrapper for Plotly
- **Papaparse** (v5.5.3): CSV parsing library

### Dev Dependencies
- **Vite** (v7.1.7): Build tool and dev server
- **@vitejs/plugin-react** (v5.0.4): React plugin for Vite
- **ESLint**: Code linting

## 📁 Project Structure

```
eeg-insights-react/
├── public/
│   └── sample-eeg.csv          # Sample EEG data for testing
├── src/
│   ├── components/
│   │   ├── AnalysisResults.jsx # Display analysis results
│   │   ├── AnalysisResults.css
│   │   ├── BandpowerPlot.jsx   # Bandpower visualization
│   │   ├── BandpowerPlot.css
│   │   ├── CSVUpload.jsx       # CSV file upload component
│   │   ├── CSVUpload.css
│   │   ├── EEGPlot.jsx         # EEG signal plot
│   │   └── EEGPlot.css
│   ├── utils/
│   │   ├── eegAnalysis.js      # Variance & bandpower utilities
│   │   ├── mockLLM.js          # Mock AI explanation generator
│   │   └── reportExport.js     # Markdown & JSON export utilities
│   ├── App.jsx                 # Main application component
│   ├── App.css
│   ├── main.jsx                # Application entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🎯 Usage

### 1. Upload EEG Data

- Click the upload area or drag-and-drop a CSV file
- CSV format: One EEG value per row in the first column
- Header row is optional
- Sample file provided: `public/sample-eeg.csv`

### 2. Configure Analysis Parameters

- **Window Size**: Number of samples per analysis window (default: 256)
- **Sampling Rate**: EEG sampling rate in Hz (default: 256 Hz)
- Click "Re-analyze" to update results with new parameters

### 3. View Results

- **Raw EEG Signal**: Time-domain plot of the uploaded data
- **Bandpower Chart**: Bar chart showing power in each frequency band
- **Analysis Results**: Detailed metrics including:
  - Window count and variance statistics
  - AI-generated insights (mock LLM)
  - Detailed table with per-window metrics

### 4. Export Reports

- **Markdown**: Human-readable report with analysis and insights
- **JSON**: Machine-readable format with raw metrics

## 🔧 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 📊 EEG Data Format

The application expects CSV files with the following format:

```csv
value
10.5
12.3
15.7
18.2
...
```

- First column contains numeric EEG values
- One value per row
- Additional columns are ignored
- Header row is optional

## 🧮 Analysis Algorithms

### Variance Calculation
```javascript
variance = Σ(x - mean)² / N
```

### Bandpower Calculation
Uses a simplified Discrete Fourier Transform (DFT) to estimate power spectral density in specific frequency ranges. For production use, consider using a proper FFT library.

### Window-based Analysis
Data is split into overlapping or non-overlapping windows for temporal analysis of EEG patterns.

## 🤖 Mock LLM Feature

The application includes a mock AI explanation generator that provides clinical interpretations of EEG patterns. In a production environment, this would be replaced with calls to a real Large Language Model API (e.g., OpenAI GPT, Anthropic Claude, etc.).

## 🎨 Customization

### Adding New Frequency Bands

Edit `src/utils/eegAnalysis.js`:

```javascript
const myBand = computeBandpower(window, samplingRate, lowFreq, highFreq);
```

### Modifying Visualizations

Plotly configuration can be customized in:
- `src/components/EEGPlot.jsx`
- `src/components/BandpowerPlot.jsx`

### Styling

CSS files are modular and can be edited independently:
- Component-specific styles in `src/components/*.css`
- Global styles in `src/index.css`
- Application layout in `src/App.css`

## 🏗️ Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## 🔍 Technical Notes

### Performance Considerations
- Large CSV files (>100k samples) may take time to process
- Bandpower calculation uses DFT which is O(n²) - consider using FFT for better performance
- Window size affects computation time and frequency resolution

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript ES6+ support
- WebGL recommended for Plotly performance

## 📝 License

This project is part of the kernel-authority hackathon project.

## 🤝 Contributing

This is a hackathon project. Feel free to fork and adapt for your needs.

## 📧 Support

For issues or questions, please open an issue on the GitHub repository.

---

Built with ❤️ using Vite + React + Plotly.js
