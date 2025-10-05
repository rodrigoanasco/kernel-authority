import requests
import json

# List your test .rd files here (relative to this script)
rd_files = [
    'co2c0000337.rd.000',
    'co2c0000344.rd.000',
    'co2c0000345.rd.000',
    'co2c0000346.rd.000',
    'co2c0000347.rd.000'
    # Add more .rd files as needed
]

# Prepare files for upload
files = [('files', open(f, 'rb')) for f in rd_files]

# Upload to backend
upload_url = 'http://localhost:5000/api/upload-rd'
print(f"Uploading files: {rd_files}")
resp = requests.post(upload_url, files=files)
for _, f in files:
    f.close()

if resp.status_code != 200:
    print('Upload failed:', resp.status_code, resp.text)
    exit(1)

upload_data = resp.json()
print("\nUPLOAD RESPONSE:")
print(json.dumps(upload_data, indent=2))

if not upload_data.get('success'):
    print('Upload did not succeed.')
    exit(1)

# Prepare data for analysis
signal = upload_data['full_signal']['signal']
times = upload_data['full_signal']['times']
metadata = upload_data['metadata']

analyze_url = 'http://localhost:5000/api/analyze-eeg'
analyze_payload = {
    'signal': signal,
    'times': times,
    'metadata': metadata,
    'use_ai': False  # Set to True to use Gemini if configured
}

print("\nSending data for analysis...")
resp2 = requests.post(analyze_url, json=analyze_payload)
if resp2.status_code != 200:
    print('Analysis failed:', resp2.status_code, resp2.text)
    exit(1)

analyze_data = resp2.json()
print("\nANALYSIS RESPONSE:")
print(json.dumps(analyze_data, indent=2))
