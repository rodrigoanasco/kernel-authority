import numpy as np
from typing import Dict, List, Any, Tuple
from collections import defaultdict

def parse_rd_file(file_path: str) -> Dict[str, Any]:
    """
    Parse custom .rd EEG format
    
    Format: trial_num channel_name sample_index value
    Example: 0 FP1 0 3.082
    
    Returns organized data structure with channels, trials, and metadata
    """
    try:
        metadata = {}
        channels_data = defaultdict(lambda: defaultdict(list))  # {channel: {trial: [values]}}
        
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                
                # Parse header lines
                if line.startswith('#'):
                    metadata_line = line[1:].strip()
                    
                    # Extract key metadata
                    if 'trials' in metadata_line.lower():
                        parts = metadata_line.split(',')
                        try:
                            metadata['n_trials'] = int(parts[0].split()[0])
                            metadata['n_channels'] = int(parts[1].split()[0])
                            metadata['n_samples'] = int(parts[2].split()[0])
                        except:
                            pass
                    
                    elif 'msecs' in metadata_line:
                        parts = metadata_line.split()
                        try:
                            metadata['sampling_interval_ms'] = float(parts[0])
                            metadata['unit'] = parts[1] if len(parts) > 1 else 'µV'
                        except:
                            pass
                    
                    continue
                
                # Parse data lines
                if line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 4:
                        try:
                            trial_num = int(parts[0])
                            channel_name = parts[1]
                            sample_idx = int(parts[2])
                            value = float(parts[3])
                            
                            channels_data[channel_name][trial_num].append(value)
                        except ValueError:
                            continue
        
        # Calculate sampling rate
        if 'sampling_interval_ms' in metadata:
            metadata['sampling_rate'] = 1000.0 / metadata['sampling_interval_ms']
        else:
            metadata['sampling_rate'] = 256.0  # Default assumption
        
        # Get channel list
        metadata['channels'] = sorted(channels_data.keys())
        
        # Convert to organized structure
        organized_data = {}
        for channel, trials_dict in channels_data.items():
            organized_data[channel] = {
                'trials': dict(trials_dict),
                'n_trials': len(trials_dict)
            }
        
        return {
            'success': True,
            'data': organized_data,
            'metadata': metadata
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_channel_average(channel_data: Dict[int, List[float]]) -> np.ndarray:
    """
    Average across all trials for a channel (common in ERP analysis)
    """
    all_trials = [np.array(trial) for trial in channel_data.values()]
    
    # Ensure all trials same length
    min_length = min(len(t) for t in all_trials)
    trimmed_trials = [t[:min_length] for t in all_trials]
    
    return np.mean(trimmed_trials, axis=0)


def get_single_trial(channel_data: Dict[int, List[float]], trial_num: int = 0) -> List[float]:
    """
    Get a specific trial from channel data
    """
    return channel_data.get(trial_num, [])


def extract_primary_signal(parsed_data: Dict, channel: str = None, 
                          mode: str = 'average') -> Tuple[List[float], Dict]:
    """
    Extract signal for visualization/analysis
    
    Args:
        parsed_data: Output from parse_rd_file
        channel: Channel name (defaults to first available)
        mode: 'average' (average across trials) or 'single' (first trial)
    
    Returns:
        (signal_data, info_dict)
    """
    data = parsed_data['data']
    metadata = parsed_data['metadata']
    
    # Select channel
    if channel is None:
        # Priority: FP1, FP2, Cz, or first available
        preferred = ['FP1', 'FP2', 'Cz', 'C3', 'C4']
        for pref in preferred:
            if pref in data:
                channel = pref
                break
        if channel is None:
            channel = list(data.keys())[0]
    
    channel_data = data[channel]
    
    # Extract signal
    if mode == 'average':
        signal = get_channel_average(channel_data['trials']).tolist()
    else:
        signal = get_single_trial(channel_data['trials'], 0)
    
    # Create time axis
    n_samples = len(signal)
    sampling_rate = metadata.get('sampling_rate', 256.0)
    times = [i / sampling_rate for i in range(n_samples)]
    
    info = {
        'channel': channel,
        'mode': mode,
        'n_trials_averaged': channel_data['n_trials'] if mode == 'average' else 1,
        'sampling_rate': sampling_rate,
        'duration': times[-1] if times else 0
    }
    
    return signal, times, info


def get_all_channels_averaged(parsed_data: Dict) -> Dict[str, List[float]]:
    """
    Get trial-averaged signals for all channels
    """
    result = {}
    for channel, channel_data in parsed_data['data'].items():
        result[channel] = get_channel_average(channel_data['trials']).tolist()
    return result