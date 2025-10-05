import Plot from "react-plotly.js";
import "./EEGPlot.css";

export default function EEGPlot({ traces, title = "EEG Channels" }) {
  if (!traces || traces.length === 0)
    return <div className="eeg-plot-empty">No EEG data yet. Upload a file.</div>;

  const layout = {
    title,
    xaxis: { title: "Time (ms)" },
    yaxis: { title: "Amplitude (µV)" },
    paper_bgcolor: "rgba(10, 10, 20, 1)",
    plot_bgcolor: "rgba(10, 10, 20, 1)",
    font: { color: "#bdeeff" },
    legend: { orientation: "v" },
    margin: { l: 60, r: 30, t: 60, b: 50 },
  };

  return (
    <div className="eeg-plot">
      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displaylogo: false,
          scrollZoom: true,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
        }}
        style={{ width: "100%", height: "500px" }}
      />
    </div>
  );
}