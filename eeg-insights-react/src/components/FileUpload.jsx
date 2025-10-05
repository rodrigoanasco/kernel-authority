import React, { useState, useRef } from 'react';
import './FileUpload.css';

export default function FileUpload({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null); // ref to the hidden input

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click(); // manually open the file picker
  };

  return (
    <div
      className={`upload-area ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <h3>Upload a File</h3>
      <p>Drag & drop your file here or click below</p>

      <button className="upload-btn" onClick={handleClick}>
        Choose File
      </button>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}