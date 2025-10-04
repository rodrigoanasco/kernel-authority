/**
 * Compute the variance of a signal window
 * @param {number[]} data - Array of signal values
 * @returns {number} Variance of the signal
 */
export function computeVariance(data) {
  if (!data || data.length === 0) return 0;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  
  return variance;
}

/**
 * Compute the bandpower of a signal in a specific frequency band using simple FFT approximation
 * In a real implementation, you would use a proper FFT library
 * @param {number[]} data - Array of signal values
 * @param {number} samplingRate - Sampling rate in Hz
 * @param {number} lowFreq - Lower frequency bound in Hz
 * @param {number} highFreq - Upper frequency bound in Hz
 * @returns {number} Bandpower in the specified frequency range
 */
export function computeBandpower(data, samplingRate, lowFreq, highFreq) {
  if (!data || data.length === 0) return 0;
  
  // Simple approximation: compute power spectral density
  // For a real implementation, use a library like fft.js or dsp.js
  const N = data.length;
  
  // Compute mean-centered data
  const mean = data.reduce((sum, val) => sum + val, 0) / N;
  const centered = data.map(val => val - mean);
  
  // Simple power calculation in the frequency domain
  // This is a simplified approach - a real implementation would use FFT
  let power = 0;
  const freqResolution = samplingRate / N;
  
  for (let k = 0; k < N / 2; k++) {
    const freq = k * freqResolution;
    if (freq >= lowFreq && freq <= highFreq) {
      // Compute power at this frequency using DFT formula
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += centered[n] * Math.cos(angle);
        imag += centered[n] * Math.sin(angle);
      }
      power += (real * real + imag * imag) / (N * N);
    }
  }
  
  return power;
}

/**
 * Split data into windows
 * @param {number[]} data - Array of signal values
 * @param {number} windowSize - Size of each window
 * @param {number} overlap - Number of samples to overlap between windows
 * @returns {number[][]} Array of windows
 */
export function splitIntoWindows(data, windowSize, overlap = 0) {
  const windows = [];
  const step = windowSize - overlap;
  
  for (let i = 0; i + windowSize <= data.length; i += step) {
    windows.push(data.slice(i, i + windowSize));
  }
  
  return windows;
}

/**
 * Analyze EEG data windows
 * @param {number[]} data - Array of signal values
 * @param {number} windowSize - Size of each window
 * @param {number} samplingRate - Sampling rate in Hz
 * @returns {Object[]} Array of analysis results per window
 */
export function analyzeWindows(data, windowSize, samplingRate = 256) {
  const windows = splitIntoWindows(data, windowSize);
  
  return windows.map((window, index) => {
    const variance = computeVariance(window);
    
    // Standard EEG frequency bands
    const delta = computeBandpower(window, samplingRate, 0.5, 4);
    const theta = computeBandpower(window, samplingRate, 4, 8);
    const alpha = computeBandpower(window, samplingRate, 8, 13);
    const beta = computeBandpower(window, samplingRate, 13, 30);
    const gamma = computeBandpower(window, samplingRate, 30, 50);
    
    return {
      windowIndex: index,
      variance,
      bandpower: {
        delta,
        theta,
        alpha,
        beta,
        gamma
      }
    };
  });
}
