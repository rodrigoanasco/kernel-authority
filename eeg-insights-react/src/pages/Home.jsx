import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import EEGPlot from "../components/EEGPlot";
import parseEEGFile from "../utils/parseEEGFile";
import "./Home.css";

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
    const [plotData, setPlotData] = useState(null);  
  const [meta, setMeta] = useState(null);  

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setShowUpload(false);

     try {
      console.log("Parsing EEG file:", selectedFile.name);
      const result = await parseEEGFile(selectedFile);
      setPlotData(result.traces);   // this holds the data for Plotly
      setMeta(result);            // this holds meta info (channels, dtype, etc.)
    } catch (err) {
      console.error("EEG parse failed:", err);
      alert("Error reading EEG file. Check console for details.");
    }


    // Smooth scroll to analysis area
    setTimeout(() => {
      document
        .getElementById("analysis-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 400);
  };

  return (
    <div className="home-container">
      {/* 🎥 Background */}
      <video autoPlay loop muted playsInline className="background-video">
        <source src={"wallpaper.mp4"} type="video/mp4" />
      </video>

      {/* 🌌 Hero Section */}
      <section className="hero-section">
        <div className="hero-text">
          <h1 className="hero-title">EEG Data Analysis Platform</h1>
          <p className="hero-subtitle">
            Decoding brainwave patterns through intelligent signal processing
          </p>
          <button className="file-btn" onClick={() => setShowUpload(true)}>
            Upload File
          </button>
        </div>
      </section>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <FileUpload onFileSelect={handleFileSelect} />
            <button className="close-btn" onClick={() => setShowUpload(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/*EEG Plot Section */}
      {plotData && (
        <section id="analysis-section" className="analysis-section">
          <h2 className="section-title">EEG Signal Overview</h2>
          <p className="section-meta">
            Channels: {meta?.nChannels} | Sampling: {meta?.samplingRate}Hz | Type: {meta?.dtype}
          </p>
          <EEGPlot traces={plotData} />  {/* passes real EEG data to graph */}
        </section>
      )}
    </div>
  );
}