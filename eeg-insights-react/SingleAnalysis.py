import numpy as np
import matplotlib.pyplot as plt
import os
import math

# ---------- USER SETTINGS ----------
filename = "ControlDataset/co2c0000337.rd.000"
n_channels = 64
sampling_rate = 256.0   # Hz -- adjust if known different
plot_first_n = 5
max_scan_offset = 2048  # bytes to scan for headers (increase if required)
window_ms = 255.0       # show first 255 ms; set None to show full recording
# ------------------------------------

# Helper: safe stats (avoid overflow)
def safe_stats(arr):
    flat = arr.ravel()
    # convert to float64 for stable statistics without overflow
    flat64 = flat.astype(np.float64)
    # compute robust metrics
    p1, p50, p99 = np.percentile(flat64, [1, 50, 99])
    mn = float(np.nanmean(flat64))
    sd = float(np.nanstd(flat64))
    mx = float(np.nanmax(flat64))
    plausible_frac = float(np.mean(np.abs(flat64) < 100000.0))  # heuristic
    return {"min": p1, "median": p50, "max": p99, "mean": mn, "std": sd, "plausible_frac": plausible_frac}

# Read file bytes
with open(filename, "rb") as f:
    buf = f.read()
fsize = len(buf)
print(f"File size: {fsize} bytes")

dtype_options = ["<f4", ">f4", "<i2", ">i2"]  # little/big float32 and int16
cands = []

# scan possible offsets (step 4 bytes is reasonable since float32 alignment likely)
for offset in range(0, min(max_scan_offset, fsize), 4):
    rem = fsize - offset
    for dt in dtype_options:
        itemsize = np.dtype(dt).itemsize
        if rem < itemsize * n_channels:
            continue
        if (rem % (itemsize * n_channels)) != 0:
            # allow trimming but still consider candidate
            total_items = rem // itemsize
            if total_items < n_channels:
                continue
            n_samples = total_items // n_channels
            # still ok, we'll note trimming
        else:
            total_items = rem // itemsize
            n_samples = total_items // n_channels
        try:
            arr = np.frombuffer(buf, dtype=dt, count=(n_samples * n_channels), offset=offset)
            arr = arr.reshape((n_channels, n_samples))
        except Exception:
            continue
        stats = safe_stats(arr)
        # score: prefer many plausible values and more samples
        score = stats["plausible_frac"] * math.log1p(n_samples)
        cands.append((dt, offset, n_samples, stats, score))

if not cands:
    raise SystemExit("No candidate interpretation found. Try increasing max_scan_offset or check file.")

# sort and show top candidates
cands.sort(key=lambda x: (x[4], x[2]), reverse=True)
print("\nTop candidates (dtype, offset, samples_per_channel, stats summary):")
for dt, offset, n_samps, stats, score in cands[:8]:
    print(f" - {dt}, offset={offset}, n_samples={n_samps}, plausible_frac={stats['plausible_frac']:.3f}, "
          f"minP1={stats['min']:.3g}, median={stats['median']:.3g}, maxP99={stats['max']:.3g}")

# choose best candidate automatically (top of list)
best_dt, best_offset, best_n_samps, best_stats, best_score = cands[0]
print(f"\nUsing best candidate: dtype={best_dt}, offset={best_offset}, samples/ch={best_n_samps}")
print("Best candidate stats:", best_stats)

# load full array (non-destructive)
arr = np.frombuffer(buf, dtype=best_dt, count=(best_n_samps * n_channels), offset=best_offset).reshape((n_channels, best_n_samps))

# If int16 detected, allow user to know (we don't scale automatically)
if best_dt in ("<i2", ">i2"):
    print("Detected int16 encoding. Values retained as raw ints (converted to float for plotting). "
          "If these are ADC counts you may want to scale to µV using the dataset's scale factor.")
arr = arr.astype(np.float64)  # for plotting/stats safely

# Diagnostics print
dt_ms = 1000.0 / sampling_rate
total_duration_ms = best_n_samps * dt_ms
print(f"dt = {dt_ms:.6f} ms -> total duration = {total_duration_ms:.1f} ms ({best_n_samps} samples)")

# Determine plotting window
if window_ms is None:
    s0, s1 = 0, best_n_samps
else:
    s0 = 0
    s1 = min(best_n_samps, int(round(window_ms / dt_ms)))
print(f"Plotting sample indices {s0}..{s1-1} -> duration {(s1-s0)*dt_ms:.3f} ms")

time_ms = np.arange(best_n_samps) * dt_ms

# Show raw full-scale plot (true values) - may be dominated by outliers
plt.figure(figsize=(12,5))
for ch in range(min(plot_first_n, n_channels)):
    plt.plot(time_ms[s0:s1], arr[ch, s0:s1], label=f"{ch} ({ch})", linewidth=0.9)
plt.xlabel("Time (ms)")
plt.ylabel("Amplitude (raw units or µV)")
plt.title(f"{os.path.basename(filename)}  dtype={best_dt} offset={best_offset} samples/ch={best_n_samps}")
plt.grid(True)
plt.legend(loc="upper right", fontsize="small")
plt.xlim(time_ms[s0], time_ms[s1-1])
plt.tight_layout()
plt.show()

# --- Helpful visual view: clip axis to typical EEG range for visualization only ---
# We do NOT modify arr values; only change y-limits for viewing.
# Choose clipping bounds based on robust percentiles (median +/- some range)
all_values = arr[:min(plot_first_n, n_channels), s0:s1].ravel()
p10, p90 = np.percentile(all_values, [10, 90])
# Set a display range that is reasonable for EEG (heuristic)
display_range = max(50.0, 3.0 * max(abs(p10), abs(p90)))  # microvolt-ish heuristic
print(f"Visualization clip range (±{display_range:.1f}) for easier viewing (does not alter data).")

plt.figure(figsize=(12,5))
for ch in range(min(plot_first_n, n_channels)):
    plt.plot(time_ms[s0:s1], arr[ch, s0:s1], label=f"{ch} ({ch})", linewidth=0.9)
plt.ylim(-display_range, display_range)
plt.xlabel("Time (ms)")
plt.ylabel("Amplitude (clipped µV view)")
plt.title("Visual clipped view (keeps real data unchanged)")
plt.grid(True)
plt.legend(loc="upper right", fontsize="small")
plt.xlim(time_ms[s0], time_ms[s1-1])
plt.tight_layout()
plt.show()
