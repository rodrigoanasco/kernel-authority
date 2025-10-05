from rd_parser import parse_rd_file, extract_primary_signal
import json

# Test with your file
result = parse_rd_file('co2c0000337.rd.000')

if result['success']:
    print("✅ Parse successful!")
    print(f"Channels: {result['metadata']['channels'][:5]}...")  # First 5
    print(f"Trials: {result['metadata'].get('n_trials', 'unknown')}")
    
    # Get signal
    signal, times, info = extract_primary_signal(result)
    print(f"\n📊 Signal extracted:")
    print(f"Channel: {info['channel']}")
    print(f"Length: {len(signal)} samples")
    print(f"Duration: {info['duration']:.2f}s")
    print(f"First 10 values: {signal[:10]}")
else:
    print(f"❌ Error: {result['error']}")