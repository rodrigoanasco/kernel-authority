import './AnalysisResults.css';

function AnalysisResults({ analysisResults, llmExplanation }) {
  if (!analysisResults || analysisResults.length === 0) {
    return null;
  }

  // Calculate statistics
  const avgVariance = analysisResults.reduce((sum, r) => sum + r.variance, 0) / analysisResults.length;
  const maxVariance = Math.max(...analysisResults.map(r => r.variance));
  const minVariance = Math.min(...analysisResults.map(r => r.variance));

  return (
    <div className="analysis-results">
      <h2>Analysis Results</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Windows Analyzed</div>
          <div className="stat-value">{analysisResults.length}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Avg Variance</div>
          <div className="stat-value">{avgVariance.toFixed(4)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Max Variance</div>
          <div className="stat-value">{maxVariance.toFixed(4)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Min Variance</div>
          <div className="stat-value">{minVariance.toFixed(4)}</div>
        </div>
      </div>

      {llmExplanation && (
        <div className="llm-explanation">
          <h3>🤖 AI-Generated Insights</h3>
          <div 
            className="explanation-content"
            dangerouslySetInnerHTML={{ 
              __html: llmExplanation
                .replace(/^### /gm, '<h4>')
                .replace(/\n/g, '<br/>')
                .replace(/<h4>/g, '</p><h4>')
                .replace(/<\/h4>/g, '</h4><p>')
                .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^- /gm, '&bull; ')
                .replace(/<p><\/p>/g, '')
            }}
          />
        </div>
      )}

      <div className="data-table-container">
        <h3>Window Data</h3>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Window</th>
                <th>Variance</th>
                <th>Delta</th>
                <th>Theta</th>
                <th>Alpha</th>
                <th>Beta</th>
                <th>Gamma</th>
              </tr>
            </thead>
            <tbody>
              {analysisResults.map((result) => (
                <tr key={result.windowIndex}>
                  <td>{result.windowIndex + 1}</td>
                  <td>{result.variance.toFixed(4)}</td>
                  <td>{result.bandpower.delta.toExponential(2)}</td>
                  <td>{result.bandpower.theta.toExponential(2)}</td>
                  <td>{result.bandpower.alpha.toExponential(2)}</td>
                  <td>{result.bandpower.beta.toExponential(2)}</td>
                  <td>{result.bandpower.gamma.toExponential(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalysisResults;
