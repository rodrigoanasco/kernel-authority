import { useState } from 'react';
import Papa from 'papaparse';
import './CSVUpload.css';

function CSVUpload({ onDataLoaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        try {
          // Extract EEG data from CSV
          // Assuming CSV has a header row and EEG values in the first column
          // or multiple columns for different channels
          const data = results.data
            .filter(row => row && row.length > 0 && row[0] !== '')
            .map(row => parseFloat(row[0]))
            .filter(val => !isNaN(val));

          if (data.length === 0) {
            throw new Error('No valid numeric data found in CSV file');
          }

          setFileInfo({
            name: file.name,
            size: file.size,
            samples: data.length
          });

          onDataLoaded(data, {
            filename: file.name,
            samples: data.length
          });

          setUploading(false);
        } catch (err) {
          setError(err.message);
          setUploading(false);
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setUploading(false);
      },
      header: false,
      skipEmptyLines: true
    });
  };

  return (
    <div className="csv-upload">
      <div className="upload-container">
        <label htmlFor="csv-input" className="upload-label">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            {fileInfo ? (
              <>
                <strong>{fileInfo.name}</strong>
                <br />
                {fileInfo.samples} samples
              </>
            ) : (
              <>
                <strong>Upload EEG CSV File</strong>
                <br />
                Click to select or drag and drop
              </>
            )}
          </div>
        </label>
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="file-input"
        />
      </div>

      {uploading && (
        <div className="status-message uploading">
          <div className="spinner"></div>
          Parsing CSV file...
        </div>
      )}

      {error && (
        <div className="status-message error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="upload-info">
        <h4>CSV Format Requirements:</h4>
        <ul>
          <li>First column should contain EEG values (numeric)</li>
          <li>One value per row</li>
          <li>Header row is optional</li>
          <li>Additional columns will be ignored</li>
        </ul>
      </div>
    </div>
  );
}

export default CSVUpload;
