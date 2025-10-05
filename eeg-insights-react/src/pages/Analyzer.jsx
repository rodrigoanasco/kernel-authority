import { useState } from "react";
import CSVUpload from "../components/CSVUpload";
import EEGPlot from "../components/EEGPlot";
import BandpowerPlot from "../components/BandpowerPlot";
import AnalysisResults from "../components/AnalysisResults";
import { analyzeWindows } from "../utils/eegAnalysis";
import {
  exportToMarkdown,
  downloadMarkdownReport,
  exportToJSON,
  downloadJSONReport,
} from "../utils/reportExport";
import "./Analyzer.css";

function App() {
  const [eegData, setEegData] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [llmExplanation, setLlmExplanation] = useState("");
  const [metadata, setMetadata] = useState({});
  const [windowSize, setWindowSize] = useState(256);
  const [samplingRate, setSamplingRate] = useState(256);
  // AI Insights state
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleDataLoaded = (data, fileMetadata) => {
    setEegData(data);
    setMetadata(fileMetadata);

    // Automatically run analysis
    const results = analyzeWindows(data, windowSize, samplingRate);
    setAnalysisResults(results);

    // Generate mock LLM explanation
    const explanation = generateMockExplanation(results);
    setLlmExplanation(explanation);
  };

  const handleReanalyze = () => {
    if (!eegData) return;

    const results = analyzeWindows(eegData, windowSize, samplingRate);
    setAnalysisResults(results);

    const explanation = generateMockExplanation(results);
    setLlmExplanation(explanation);
  };

  const handleExportMarkdown = () => {
    if (!analysisResults) return;

    const markdown = exportToMarkdown(analysisResults, llmExplanation, {
      ...metadata,
      windowSize,
      samplingRate,
    });

    downloadMarkdownReport(markdown, `eeg-report-${Date.now()}.md`);
  };

  const handleExportJSON = () => {
    if (!analysisResults) return;
    const json = exportToJSON(analysisResults, {
      ...metadata,
      windowSize,
      samplingRate,
    });
    downloadJSONReport(json, `eeg-data-${Date.now()}.json`);
  };

  // Handler for AI Insights (Gemini)
  async function handleGetAIInsights() {
    if (!eegData) return;
    setAiLoading(true);
    setAiError(null);
    setAiData(null);
    try {
      const response = await fetch("http://localhost:5000/api/analyze-eeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal: eegData,
          times: eegData.map((_, i) => i / samplingRate),
          metadata,
          use_ai: true,
        }),
      });
      const data = await response.json();
      setAiData(data);
    } catch (err) {
      setAiError("Failed to get AI insights");
    }
    setAiLoading(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 EEG Insights</h1>
        <p>EEG Signal Analysis with React & Plotly</p>
      </header>

      <main className="app-main">
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
                    <input
                      id="window-size"
                      type="number"
                      value={windowSize}
                      onChange={(e) => setWindowSize(parseInt(e.target.value))}
                      min="64"
                      max="1024"
                      step="64"
                    />
                  </div>

                  <div className="control-group">
                    <label htmlFor="sampling-rate">Sampling Rate (Hz)</label>
                    <input
                      id="sampling-rate"
                      type="number"
                      value={samplingRate}
                      onChange={(e) =>
                        setSamplingRate(parseInt(e.target.value))
                      }
                      min="128"
                      max="1000"
                      step="1"
                    />
                  </div>

                  <div className="control-group">
                    <button
                      className="btn btn-primary"
                      onClick={handleReanalyze}
                    >
                      Re-analyze
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="plot-section">
              <EEGPlot data={eegData} title="Raw EEG Signal" />
            </section>

            {/* AI Insights Button and Display */}
            <section className="ai-section">
              <button
                className="btn btn-primary"
                onClick={handleGetAIInsights}
                disabled={aiLoading}
              >
                {aiLoading ? "Getting AI Insights..." : "Get AI Insights"}
              </button>
              {aiError && <div className="error">{aiError}</div>}
              {aiData && aiData.success && (
                <div className="ai-insights">
                  <h3>🤖 AI-Generated Insights</h3>
                  <p>
                    <strong>Summary:</strong> {aiData.summary}
                  </p>
                  <p>
                    <strong>Analysis:</strong> {aiData.analysis}
                  </p>
                  <h4>Anomalies</h4>
                  <ul>
                    {aiData.anomalies.map((a, i) => (
                      <li key={i}>
                        Time: {a.time}s, Index: {a.index}, Severity:{" "}
                        {a.severity}, Desc: {a.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {analysisResults && (
              <>
                <section className="plot-section">
                  <BandpowerPlot analysisResults={analysisResults} />
                </section>

                <section className="results-section">
                  <AnalysisResults
                    analysisResults={analysisResults}
                    llmExplanation={llmExplanation}
                  />
                </section>

                <section className="export-section">
                  <div className="export-panel">
                    <h3>Export Results</h3>
                    <div className="export-buttons">
                      <button
                        className="btn btn-secondary"
                        onClick={handleExportMarkdown}
                      >
                        📄 Export as Markdown
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleExportJSON}
                      >
                        📊 Export as JSON
                      </button>
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
  );
}

export default function Analyzer() {
  // (everything inside original App function goes here unchanged)
}
