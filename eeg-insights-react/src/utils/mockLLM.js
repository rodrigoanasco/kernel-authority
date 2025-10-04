/**
 * Mock LLM service for generating EEG insights
 * In a real application, this would call an actual LLM API
 */

const mockInsights = [
  {
    trigger: 'high_alpha',
    explanation: 'High alpha band activity (8-13 Hz) is typically associated with a relaxed, wakeful state. This suggests the subject may be in a calm, meditative state with eyes closed or engaged in relaxed attention.'
  },
  {
    trigger: 'high_beta',
    explanation: 'Elevated beta band activity (13-30 Hz) indicates active thinking, focus, and problem-solving. This pattern is common during cognitive tasks requiring attention and concentration.'
  },
  {
    trigger: 'high_theta',
    explanation: 'Increased theta band activity (4-8 Hz) can indicate drowsiness, creativity, or deep meditation. In adults during wakefulness, it may suggest decreased alertness or creative mental states.'
  },
  {
    trigger: 'high_delta',
    explanation: 'Delta band activity (0.5-4 Hz) is primarily associated with deep sleep. During wakefulness, elevated delta may indicate brain injury, pathology, or very deep relaxation states.'
  },
  {
    trigger: 'high_gamma',
    explanation: 'Gamma band activity (30-50 Hz) is linked to high-level cognitive processing, memory consolidation, and consciousness. Elevated gamma suggests active information integration and processing.'
  },
  {
    trigger: 'high_variance',
    explanation: 'High variance in the EEG signal indicates significant fluctuations in brain activity. This could suggest arousal changes, transitions between mental states, or response to stimuli.'
  },
  {
    trigger: 'low_variance',
    explanation: 'Low variance suggests stable, consistent brain activity patterns. This may indicate a steady mental state or reduced responsiveness to external stimuli.'
  }
];

/**
 * Generate a mock LLM explanation for EEG analysis results
 * @param {Object} analysisResults - Results from EEG window analysis
 * @returns {string} Generated explanation
 */
export function generateMockExplanation(analysisResults) {
  if (!analysisResults || analysisResults.length === 0) {
    return 'No EEG data available for analysis.';
  }
  
  // Analyze the overall patterns
  const avgVariance = analysisResults.reduce((sum, r) => sum + r.variance, 0) / analysisResults.length;
  const avgBandpower = {
    delta: analysisResults.reduce((sum, r) => sum + r.bandpower.delta, 0) / analysisResults.length,
    theta: analysisResults.reduce((sum, r) => sum + r.bandpower.theta, 0) / analysisResults.length,
    alpha: analysisResults.reduce((sum, r) => sum + r.bandpower.alpha, 0) / analysisResults.length,
    beta: analysisResults.reduce((sum, r) => sum + r.bandpower.beta, 0) / analysisResults.length,
    gamma: analysisResults.reduce((sum, r) => sum + r.bandpower.gamma, 0) / analysisResults.length,
  };
  
  // Find dominant frequency band
  const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
  let dominantBand = 'alpha';
  let maxPower = avgBandpower.alpha;
  
  bands.forEach(band => {
    if (avgBandpower[band] > maxPower) {
      maxPower = avgBandpower[band];
      dominantBand = band;
    }
  });
  
  // Generate explanation
  let explanation = `## EEG Analysis Summary\n\n`;
  explanation += `Analyzed ${analysisResults.length} time windows of EEG data.\n\n`;
  explanation += `### Dominant Frequency Band: ${dominantBand.toUpperCase()}\n\n`;
  
  // Add insight based on dominant band
  const bandInsight = mockInsights.find(i => i.trigger === `high_${dominantBand}`);
  if (bandInsight) {
    explanation += `**Interpretation:** ${bandInsight.explanation}\n\n`;
  }
  
  // Add variance insight
  explanation += `### Signal Variance Analysis\n\n`;
  explanation += `Average variance: ${avgVariance.toFixed(4)}\n\n`;
  
  const varianceLevel = avgVariance > 100 ? 'high' : 'low';
  const varianceInsight = mockInsights.find(i => i.trigger === `${varianceLevel}_variance`);
  if (varianceInsight) {
    explanation += `**Interpretation:** ${varianceInsight.explanation}\n\n`;
  }
  
  // Add detailed bandpower breakdown
  explanation += `### Frequency Band Power Distribution\n\n`;
  explanation += `- **Delta (0.5-4 Hz):** ${avgBandpower.delta.toFixed(6)}\n`;
  explanation += `- **Theta (4-8 Hz):** ${avgBandpower.theta.toFixed(6)}\n`;
  explanation += `- **Alpha (8-13 Hz):** ${avgBandpower.alpha.toFixed(6)}\n`;
  explanation += `- **Beta (13-30 Hz):** ${avgBandpower.beta.toFixed(6)}\n`;
  explanation += `- **Gamma (30-50 Hz):** ${avgBandpower.gamma.toFixed(6)}\n\n`;
  
  explanation += `### Clinical Notes\n\n`;
  explanation += `*Note: This is a mock AI-generated explanation for demonstration purposes. In a production environment, this would utilize a real large language model (LLM) to provide more sophisticated analysis and interpretation based on clinical EEG knowledge.*\n\n`;
  explanation += `The patterns observed should be interpreted by qualified medical professionals in the context of the full clinical picture.\n`;
  
  return explanation;
}

/**
 * Generate a detailed window-by-window explanation
 * @param {Object[]} analysisResults - Results from EEG window analysis
 * @returns {string} Detailed explanation
 */
export function generateDetailedWindowExplanation(analysisResults) {
  if (!analysisResults || analysisResults.length === 0) {
    return 'No data available.';
  }
  
  let explanation = `## Window-by-Window Analysis\n\n`;
  
  analysisResults.forEach((result, index) => {
    if (index < 5 || index >= analysisResults.length - 2) { // Show first 5 and last 2
      explanation += `### Window ${result.windowIndex + 1}\n`;
      explanation += `- Variance: ${result.variance.toFixed(4)}\n`;
      explanation += `- Dominant band: ${findDominantBand(result.bandpower)}\n`;
      explanation += `\n`;
    } else if (index === 5) {
      explanation += `\n*... ${analysisResults.length - 7} additional windows ...*\n\n`;
    }
  });
  
  return explanation;
}

function findDominantBand(bandpower) {
  const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
  let dominant = 'alpha';
  let maxPower = bandpower.alpha;
  
  bands.forEach(band => {
    if (bandpower[band] > maxPower) {
      maxPower = bandpower[band];
      dominant = band;
    }
  });
  
  return dominant;
}
