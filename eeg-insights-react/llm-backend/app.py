from flask import Flask, request, jsonify
from flask_cors import CORS # pyright: ignore[reportMissingModuleSource]
import os
import json
from werkzeug.utils import secure_filename
from rd_parser import (
    parse_rd_file, 
    extract_primary_signal, 
    get_all_channels_averaged,
)
from gemini_analysis import analyze_eeg_with_gemini, get_simple_anomalies # pyright: ignore[reportMissingImports]

app = Flask(__name__)
CORS(app)



# Add explicit CORS preflight handler for /chat
from flask import make_response

@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        # CORS preflight
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response, 204

    """
    Chat endpoint for Gemini LLM with EEG context.
    Expects JSON: { message: str, signal: [...], times: [...], metadata: {...}, analysis: str, bandpower: {...} }
    """
    data = request.json
    user_message = data.get('message', '')
    signal = data.get('signal', [])
    times = data.get('times', [])
    metadata = data.get('metadata', {})
    analysis = data.get('analysis', '')
    bandpower = data.get('bandpower', {})

    # Compose context for Gemini
    context = f"""
You are an expert neuroscientist chatbot. The user is analyzing EEG data. Here is the context:

**Signal Metadata:**
{json.dumps(metadata, indent=2)}

**Bandpower Analysis:**
{json.dumps(bandpower, indent=2)}

**Statistical/AI Analysis:**
{analysis}

**User's Question:**
{user_message}

If relevant, refer to the signal, bandpower, or metadata. If the user asks about a specific anomaly, window, or pattern, use the above context to answer. If the user asks for a summary, use the analysis and bandpower. Be concise and helpful.
"""

    try:
        from gemini_analysis import analyze_eeg_with_gemini
        # Use Gemini to generate a reply (simulate as a single-turn LLM call)
        # Here, we use the same function but you may want a dedicated chat function for multi-turn
        # For now, just use the context as the prompt
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(context)
        reply = response.text.strip()
        return jsonify({'reply': reply})
    except Exception as e:
        return jsonify({'reply': f"[Error: {str(e)}]"})


UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'rd', 'edf'}  # Support both for now
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024


ALLOWED_EXTENSIONS = {'rd', 'edf', '000', '001', '002'}  # Add numbered extensions

def allowed_file(filename):
    """Check if file has allowed extension"""
    if '.rd.' in filename.lower():  # Handle .rd.000 pattern
        return True
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def downsample_for_visualization(data, target_points=5000):
    """Downsample data for faster plotting"""
    if len(data) <= target_points:
        return data
    import numpy as np
    data_array = np.array(data)
    indices = np.linspace(0, len(data) - 1, target_points, dtype=int)
    return data_array[indices].tolist()


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})


@app.route('/api/upload-rd', methods=['POST'])
def upload_rd():
    """
    Handle multiple RD file uploads and parsing, merge data for group analysis
    """
    files = request.files.getlist('files')
    if not files or len(files) == 0:
        return jsonify({'success': False, 'error': 'No files provided'}), 400

    parsed_results = []
    filenames = []
    errors = []
    for file in files:
        if file.filename == '':
            continue
        if not allowed_file(file.filename):
            errors.append(f"File {file.filename} not allowed")
            continue
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            result = parse_rd_file(filepath)
            os.remove(filepath)
            if result['success']:
                parsed_results.append(result)
                filenames.append(filename)
            else:
                errors.append(f"File {file.filename} failed: {result.get('error','parse error')}")
        except Exception as e:
            errors.append(f"File {file.filename} exception: {str(e)}")

    if not parsed_results:
        return jsonify({'success': False, 'error': 'No valid files parsed', 'errors': errors}), 400

    # Merge data: concatenate trials for each channel across all files
    from collections import defaultdict
    merged_data = defaultdict(lambda: defaultdict(list))  # {channel: {trial: [values]}}
    merged_metadata = {}
    trial_offset = 0
    for result in parsed_results:
        data = result['data']
        for channel, channel_info in data.items():
            for trial_num, values in channel_info['trials'].items():
                merged_data[channel][trial_num + trial_offset] = values
        # Optionally, merge metadata (e.g., sum trials, keep channel list, etc.)
        if 'channels' in result['metadata']:
            merged_metadata.setdefault('channels', set()).update(result['metadata']['channels'])
        trial_offset += max([int(t) for c in data.values() for t in c['trials'].keys()] or [0]) + 1

    # Convert channel sets to sorted lists
    if 'channels' in merged_metadata:
        merged_metadata['channels'] = sorted(list(merged_metadata['channels']))
    else:
        merged_metadata['channels'] = sorted(list(merged_data.keys()))

    # Use first file's sampling rate and other metadata as default
    merged_metadata.update(parsed_results[0]['metadata'])
    merged_metadata['n_files'] = len(parsed_results)
    merged_metadata['filenames'] = filenames

    # Prepare for visualization: use trial-averaged signal for primary channel
    from rd_parser import get_channel_average
    primary_channel = merged_metadata['channels'][0] if merged_metadata['channels'] else None
    if primary_channel:
        channel_trials = merged_data[primary_channel]
        signal = get_channel_average(channel_trials).tolist()
        sampling_rate = merged_metadata.get('sampling_rate', 256.0)
        times = [i / sampling_rate for i in range(len(signal))]
    else:
        signal, times = [], []

    viz_signal = downsample_for_visualization(signal)
    viz_times = downsample_for_visualization(times)

    response = {
        'success': True,
        'filenames': filenames,
        'metadata': merged_metadata,
        'available_channels': merged_metadata['channels'],
        'visualization_data': {
            'signal': viz_signal,
            'times': viz_times
        },
        'full_signal': {
            'signal': signal,
            'times': times,
            'sampling_rate': merged_metadata.get('sampling_rate', 256.0)
        },
        'errors': errors
    }
    return jsonify(response)

@app.route('/api/analyze-eeg', methods=['POST'])
def analyze_eeg():
    """
    Analyze EEG signal with Gemini AI
    """
    data = request.json
    
    signal_data = data.get('signal')
    times = data.get('times')
    metadata = data.get('metadata', {})
    use_ai = data.get('use_ai', True)
    
    if not signal_data or not times:
        return jsonify({'success': False, 'error': 'Missing signal data'}), 400
    
    try:
        if use_ai:
            # Use Gemini API
            result = analyze_eeg_with_gemini(signal_data, times, metadata)
        else:
            # Fallback to statistical method
            anomalies = get_simple_anomalies(signal_data, times)
            result = {
                'success': True,
                'anomalies': anomalies,
                'summary': f'Found {len(anomalies)} statistical anomalies',
                'analysis': 'Statistical analysis only (AI disabled)'
            }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get-channel', methods=['POST'])
def get_channel():
    """
    Get specific channel data (for channel switching)
    """
    # This will be used when user wants to switch channels
    # Implementation coming next
    return jsonify({'success': True, 'message': 'Channel switching ready'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)