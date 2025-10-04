import Plot from 'react-plotly.js';
import './BandpowerPlot.css';

function BandpowerPlot({ analysisResults }) {
  if (!analysisResults || analysisResults.length === 0) {
    return (
      <div className="bandpower-plot-empty">
        <p>No analysis results to display.</p>
      </div>
    );
  }

  // Calculate average bandpower across all windows
  const avgBandpower = {
    Delta: analysisResults.reduce((sum, r) => sum + r.bandpower.delta, 0) / analysisResults.length,
    Theta: analysisResults.reduce((sum, r) => sum + r.bandpower.theta, 0) / analysisResults.length,
    Alpha: analysisResults.reduce((sum, r) => sum + r.bandpower.alpha, 0) / analysisResults.length,
    Beta: analysisResults.reduce((sum, r) => sum + r.bandpower.beta, 0) / analysisResults.length,
    Gamma: analysisResults.reduce((sum, r) => sum + r.bandpower.gamma, 0) / analysisResults.length,
  };

  const plotData = [
    {
      x: Object.keys(avgBandpower),
      y: Object.values(avgBandpower),
      type: 'bar',
      marker: {
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
      },
      text: Object.values(avgBandpower).map(v => v.toExponential(2)),
      textposition: 'auto',
      hovertemplate: '<b>%{x}</b><br>Power: %{y:.6f}<extra></extra>'
    }
  ];

  const layout = {
    title: 'Average Bandpower by Frequency Band',
    xaxis: {
      title: 'Frequency Band'
    },
    yaxis: {
      title: 'Power',
      type: 'log'
    },
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#ffffff',
    margin: {
      l: 70,
      r: 30,
      t: 50,
      b: 60
    }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false
  };

  return (
    <div className="bandpower-plot">
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
}

export default BandpowerPlot;
