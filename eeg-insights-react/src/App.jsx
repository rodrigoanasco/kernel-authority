import { useState } from 'react'
import CSVUpload from './components/CSVUpload'
import EEGPlot from './components/EEGPlot'
import BandpowerPlot from './components/BandpowerPlot'
import AnalysisResults from './components/AnalysisResults'
import { analyzeWindows } from './utils/eegAnalysis'
import { generateMockExplanation } from './utils/mockLLM'
import { exportToMarkdown, downloadMarkdownReport, exportToJSON, downloadJSONReport } from './utils/reportExport'
import AuthBox from './components/AuthBox'
import ConsentForm from './components/ConsentForm'
import './App.css'

function App() {
  const [eegData, setEegData] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [llmExplanation, setLlmExplanation] = useState('')
  const [metadata, setMetadata] = useState({})
  const [windowSize, setWindowSize] = useState(256)
  const [samplingRate, setSamplingRate] = useState(256)

  const handleDataLoaded = (data, fileMetadata) => {
    setEegData(data)
    setMetadata(fileMetadata)
    const results = analyzeWindows(data, windowSize, samplingRate)
    setAnalysisResults(results)
    setLlmExplanation(generateMockExplanation(results))
  }

  const handleReanalyze = () => {
    if (!eegData) return
    const results = analyzeWindows(eegData, windowSize, samplingRate)
    setAnalysisResults(results)
    setLlmExplanation(generateMockExplanation(results))
  }

  const handleExportMarkdown = () => {
    if (!analysisResults) return
    const markdown = exportToMarkdown(analysisResults, llmExplanation, {
      ...metadata, windowSize, samplingRate
    })
    downloadMarkdownReport(markdown, `eeg-report-${Date.now()}.md`)
  }

  const handleExportJSON = () => {
    if (!analysisResults) return
    const json = exportToJSON(analysisResults, { ...metadata, windowSize, samplingRate })
    downloadJSONReport(json, `eeg-data-${Date.now()}.json`)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 EEG Insights</h1>
        <p>EEG Signal Analysis with React & Plotly</p>
      </header>

      <main className="app-main">
        {/* Auth + Consent */}
        <section className="upload-section" style={{display:'grid', gap:24}}>
          <AuthBox />
          <ConsentForm />
        </section>

        {/* CSV → analysis UI you already had */}
        <section className="upload-section">
          <CSVUpload onDataLoaded={handleDataLoaded} />
        </section>

        {eegData && (
          <>
            <section className="controls-section">
              <div className="controls-panel">
                <h3>Analysis Parameters</h3>
                <div className="controls-grid">
                  <div className="control-group">
                    <label htmlFor="window-size">Window Size (samples)</label>
                    <input id="window-size" type="number" value={windowSize}
                      onChange={(e)=>setWindowSize(parseInt(e.target.value))} min="64" max="1024" step="64" />
                  </div>
                  <div className="control-group">
                    <label htmlFor="sampling-rate">Sampling Rate (Hz)</label>
                    <input id="sampling-rate" type="number" value={samplingRate}
                      onChange={(e)=>setSamplingRate(parseInt(e.target.value))} min="128" max="1000" step="1" />
                  </div>
                  <div className="control-group">
                    <button className="btn btn-primary" onClick={handleReanalyze}>Re-analyze</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="plot-section">
              <EEGPlot data={eegData} title="Raw EEG Signal" />
            </section>

            {analysisResults && (
              <>
                <section className="plot-section">
                  <BandpowerPlot analysisResults={analysisResults} />
                </section>

                <section className="results-section">
                  <AnalysisResults analysisResults={analysisResults} llmExplanation={llmExplanation} />
                </section>

                <section className="export-section">
                  <div className="export-panel">
                    <h3>Export Results</h3>
                    <div className="export-buttons">
                      <button className="btn btn-secondary" onClick={handleExportMarkdown}>📄 Export as Markdown</button>
                      <button className="btn btn-secondary" onClick={handleExportJSON}>📊 Export as JSON</button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>EEG Insights - Built with Vite, React, and Plotly.js</p>
      </footer>
    </div>
  )
}

export default App
