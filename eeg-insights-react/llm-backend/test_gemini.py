from gemini_analysis import analyze_eeg_with_gemini # type: ignore
import json

# Sample data from your file
sample_signal = [3.082, 2.594, 2.106, 2.106, 3.571, 4.547, 4.547, 3.082, 
                 0.641, -0.824, -0.824, 0.153, 0.153, -0.336, -1.312, -0.824,
                 1.617, 5.524, 9.43, 10.406, 8.942, 5.524, 3.571, 3.082]

sample_times = [i * 0.003906 for i in range(len(sample_signal))]

metadata = {
    'channel': 'FP1',
    'sampling_rate': 256.0,
    'duration': 0.09,
    'trials_averaged': 1
}

print("Testing Gemini API...")
result = analyze_eeg_with_gemini(sample_signal, sample_times, metadata)

print("\n" + "="*50)
print("RESULT:")
print(json.dumps(result, indent=2))