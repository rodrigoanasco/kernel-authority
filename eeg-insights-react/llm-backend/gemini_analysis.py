import google.generativeai as genai # type: ignore
import os
from dotenv import load_dotenv
import json
import numpy as np

# Load environment variables
load_dotenv()
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def analyze_eeg_with_gemini(signal_data, times, metadata):
    """
    Send EEG data to Gemini for anomaly detection and analysis
    
    Args:
        signal_data: List of amplitude values
        times: List of time points (seconds)
        metadata: Dict with sampling_rate, channel, etc.
    
    Returns:
        {
            'anomalies': [{'time': float, 'index': int, 'severity': str, 'description': str}],
            'analysis': str (full text explanation),
            'summary': str
        }
    """
    try:
        # Calculate basic statistics for context
        signal_array = np.array(signal_data)
        stats = {
            'mean': float(np.mean(signal_array)),
            'std': float(np.std(signal_array)),
            'min': float(np.min(signal_array)),
            'max': float(np.max(signal_array)),
            'range': float(np.ptp(signal_array))
        }
        
        # Identify potential anomalies using statistical methods first
        # (Give Gemini something to work with)
        threshold = stats['mean'] + 2.5 * stats['std']
        negative_threshold = stats['mean'] - 2.5 * stats['std']
        
        statistical_anomalies = []
        for i, (time, value) in enumerate(zip(times, signal_data)):
            if value > threshold or value < negative_threshold:
                statistical_anomalies.append({
                    'index': i,
                    'time': time,
                    'value': value
                })
        
        # Prepare prompt for Gemini
        prompt = f"""You are an expert neuroscientist analyzing EEG data. Analyze this EEG signal and identify anomalies or interesting patterns.

**Signal Metadata:**
- Channel: {metadata.get('channel', 'Unknown')}
- Sampling Rate: {metadata.get('sampling_rate', 256):.2f} Hz
- Duration: {metadata.get('duration', 1):.3f} seconds
- Number of Samples: {len(signal_data)}
- Trials Averaged: {metadata.get('trials_averaged', 1)}

**Signal Statistics:**
- Mean Amplitude: {stats['mean']:.3f} µV
- Standard Deviation: {stats['std']:.3f} µV
- Range: {stats['min']:.3f} to {stats['max']:.3f} µV

**Statistical Anomalies Detected (±2.5σ):**
{len(statistical_anomalies)} potential anomalies found.

**Sample of Signal Data (first 50 points):**
{signal_data[:50]}

**Task:**
1. Analyze the signal for anomalies (amplitude spikes, unusual patterns, artifacts)
2. For each significant anomaly, provide:
   - Approximate time (in seconds)
   - Sample index (0-{len(signal_data)-1})
   - Severity (low/medium/high)
   - Brief description of what's unusual
   
3. Provide overall interpretation:
   - What do these patterns suggest about brain activity?
   - Are these artifacts or genuine neural signals?
   - Any clinical or research relevance?

**Output Format (JSON):**
{{
    "anomalies": [
        {{"time": 0.15, "index": 38, "severity": "high", "description": "Large amplitude spike (+13.3 µV), possible eye movement artifact"}},
        ...
    ],
    "summary": "Brief 1-2 sentence summary",
    "detailed_analysis": "Detailed paragraph about patterns and interpretation"
}}

Provide ONLY valid JSON, no markdown formatting.
"""
        
        # Call Gemini API
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        # Parse response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        
        return {
            'success': True,
            'anomalies': result.get('anomalies', []),
            'summary': result.get('summary', 'Analysis complete'),
            'analysis': result.get('detailed_analysis', ''),
            'statistics': stats,
            'statistical_anomaly_count': len(statistical_anomalies)
        }
        
    except json.JSONDecodeError as e:
        # Fallback: return raw text if JSON parsing fails
        return {
            'success': True,
            'anomalies': [],
            'summary': 'AI analysis completed (non-JSON response)',
            'analysis': response.text if 'response' in locals() else 'Error parsing response',
            'statistics': stats,
            'parse_error': str(e)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'statistics': stats if 'stats' in locals() else {}
        }


def get_simple_anomalies(signal_data, times, threshold_sigma=2.5):
    """
    Fallback: Simple statistical anomaly detection without AI
    """
    signal_array = np.array(signal_data)
    mean = np.mean(signal_array)
    std = np.std(signal_array)
    
    anomalies = []
    for i, (time, value) in enumerate(zip(times, signal_data)):
        z_score = abs((value - mean) / std)
        if z_score > threshold_sigma:
            anomalies.append({
                'time': float(time),
                'index': int(i),
                'severity': 'high' if z_score > 3.5 else 'medium',
                'description': f'Amplitude spike: {value:.2f} µV ({z_score:.1f}σ from mean)',
                'z_score': float(z_score)
            })
    
    return anomalies