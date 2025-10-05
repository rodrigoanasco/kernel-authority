import { useState } from 'react';
import './CSVUpload.css'; // Reuse styles

function RDUpload({ onDataLoaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload-rd', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setFileInfo({
        name: result.filename,
        channels: result.available_channels.length,
        trials: result.metadata.n_trials,
        duration: result.metadata.duration,
        samplingRate: result.metadata.sampling_rate
      });

      // Pass data to parent
      onDataLoaded({
        visualizationData: result.visualization_data.signal,
        times: result.visualization_data.times,
        fullSignal: result.full_signal.signal,
        fullTimes: result.full_signal.times,
        metadata: result.metadata,
        availableChannels: result.available_channels
      });

      setUploading(false);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="csv-upload">
      <div className="upload-container">
        <label htmlFor="rd-input" className="upload-label">
          <div className="upload-icon">🧠</div>
          <div className="upload-text">
            {fileInfo ? (
              <>
                <strong>{fileInfo.name}</strong>
                <br />
                {fileInfo.channels} channels • {fileInfo.trials} trials • {fileInfo.duration.toFixed(2)}s
              </>
            ) : (
              <>
                <strong>Upload EEG File (.rd)</strong>
                <br />
                Click to select or drag and drop
              </>
            )}
          </div>
        </label>
        <input
          id="rd-input"
          type="file"
          accept=".rd,.edf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="file-input"
        />
      </div>

      {uploading && (
        <div className="status-message uploading">
          <div className="spinner"></div>
          Parsing EEG file...
        </div>
      )}

      {error && (
        <div className="status-message error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="upload-info">
        <h4>File Format:</h4>
        <ul>
          <li>Supports .rd (raw data) and .edf formats</li>
          <li>Multi-trial data will be averaged automatically</li>
          <li>All channels available for analysis</li>
          <li>Maximum file size: 50MB</li>
        </ul>
      </div>
    </div>
  );
}

export default RDUpload;