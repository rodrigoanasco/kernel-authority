import Plot from 'react-plotly.js';
import './EEGPlot.css';

function EEGPlot({ data, title = 'EEG Signal' }) {
  if (!data || data.length === 0) {
    return (
      <div className="eeg-plot-empty">
        <p>No EEG data to display. Please upload a CSV file.</p>
      </div>
    );
  }

  // Create x-axis values (sample indices)
  const x = Array.from({ length: data.length }, (_, i) => i);

  const plotData = [
    {
      x: x,
      y: data,
      type: 'scatter',
      mode: 'lines',
      line: {
        color: '#007bff',
        width: 1
      },
      name: 'EEG Signal'
    }
  ];

  const layout = {
    title: title,
    xaxis: {
      title: 'Sample Index',
      showgrid: true,
      zeroline: false
    },
    yaxis: {
      title: 'Amplitude (µV)',
      showgrid: true,
      zeroline: true
    },
    hovermode: 'closest',
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#ffffff',
    margin: {
      l: 60,
      r: 30,
      t: 50,
      b: 60
    }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  };

  return (
    <div className="eeg-plot">
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

export default EEGPlot;
