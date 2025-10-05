# eeg_main_view_full.py
import os
import numpy as np
from scipy.signal import welch, detrend
import plotly.graph_objs as go
from plotly.subplots import make_subplots

# ---------- CONFIG ----------
DEMO_FILES = [
    "llm-backend/ControlDataset/co2c0000337.rd.000",
    "llm-backend/ControlDataset/co2c0000338.rd.000",
    "llm-backend/ControlDataset/co2c0000339.rd.000",
    "llm-backend/ControlDataset/co2c0000340.rd.000",
    "llm-backend/ControlDataset/co2c0000341.rd.000",
    "llm-backend/ControlDataset/co2c0000342.rd.000",
    "llm-backend/ControlDataset/co2c0000343.rd.000",
    "llm-backend/ControlDataset/co2c0000344.rd.000",
    "llm-backend/ControlDataset/co2c0000345.rd.000",
    "llm-backend/ControlDataset/co2c0000346.rd.000",
    "llm-backend/ControlDataset/co2c0000347.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000364.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000365.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000368.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000369.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000370.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000371.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000372.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000375.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000377.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000378.rd.000",
]
MAX_DISPLAY_SECONDS = 1.0  # clip to 0..1.0 s
DEFAULT_N_CHANS = 64
DEFAULT_N_SAMPLES = 416
DEFAULT_SAMPLING_MS = 3.906000  # -> 256 Hz

# ---------- Parser ----------
def parse_rd000(path):
    """
    Parse .rd.000 file and return:
      data: np.array shape (n_ch, n_samples) with dtype float (may contain NaN)
      channel_names: list of length n_ch
      sampling_rate: int Hz
      n_samples: int
    Only uses trial 0 lines.
    """
    with open(path, 'r', errors='ignore') as f:
        lines = [ln.rstrip("\n") for ln in f]

    n_trials = None; n_chans = None; n_samples = None; samp_ms = None
    chan_order = {}  # idx -> name
    data_lines = []

    for ln in lines:
        if not ln:
            continue
        if ln.startswith("#"):
            txt = ln[1:].strip()
            # detect trial/chans/samples line
            if "trials" in txt and "chans" in txt and "samples" in txt:
                # extract integers
                ints = [int(tok) for tok in txt.replace(",", " ").split() if tok.isdigit()]
                if len(ints) >= 3:
                    n_trials, n_chans, n_samples = ints[0], ints[1], ints[2]
            # detect sampling ms e.g. "3.906000 msecs uV"
            if "msec" in txt.lower() or "msecs" in txt.lower():
                toks = txt.split()
                for i, t in enumerate(toks):
                    if "msec" in t.lower():
                        try:
                            samp_ms = float(toks[i-1])
                        except:
                            pass
                if samp_ms is None:
                    # fallback: first float in the header line
                    for t in toks:
                        try:
                            samp_ms = float(t)
                            break
                        except:
                            continue
            # detect channel mapping lines like "# FP1 chan 0"
            if "chan" in txt:
                toks = txt.split()
                try:
                    idx = toks.index("chan")
                    chan_name = " ".join(toks[:idx])
                    chan_idx = int(toks[idx+1])
                    chan_order[chan_idx] = chan_name
                except Exception:
                    pass
        else:
            data_lines.append(ln.strip())

    if n_chans is None:
        n_chans = DEFAULT_N_CHANS
    if n_samples is None:
        n_samples = DEFAULT_N_SAMPLES
    if samp_ms is None:
        samp_ms = DEFAULT_SAMPLING_MS

    sr = int(round(1000.0 / samp_ms))

    # build channel list
    if chan_order:
        max_idx = max(chan_order.keys())
        # ensure length covers claimed n_chans
        length = max(max_idx + 1, n_chans)
        channel_names = [chan_order.get(i, f"Ch{i+1}") for i in range(length)]
        if len(channel_names) > n_chans:
            channel_names = channel_names[:n_chans]
        else:
            while len(channel_names) < n_chans:
                channel_names.append(f"Ch{len(channel_names)+1}")
    else:
        # derive from data order
        seen = []
        for ln in data_lines:
            parts = ln.split()
            if len(parts) >= 4:
                ch = parts[1]
                if ch not in seen:
                    seen.append(ch)
            if len(seen) >= n_chans:
                break
        if len(seen) < n_chans:
            seen += [f"Ch{i+1}" for i in range(len(seen), n_chans)]
        channel_names = seen[:n_chans]

    # allocate with NaN default
    data = np.full((len(channel_names), n_samples), np.nan, dtype=float)

    # fill only trial 0
    for ln in data_lines:
        parts = ln.split()
        if len(parts) < 4:
            continue
        try:
            trial_idx = int(parts[0])
            ch_name = parts[1]
            samp_idx = int(parts[2])
            val = float(parts[3])
        except:
            continue
        if trial_idx != 0:
            continue
        # channel index by name if possible
        try:
            ch_idx = channel_names.index(ch_name)
        except ValueError:
            # channel name not in canonical list: skip (we avoid inventing indices)
            continue
        if 0 <= ch_idx < data.shape[0] and 0 <= samp_idx < data.shape[1]:
            data[ch_idx, samp_idx] = val

    return data, channel_names, sr, n_samples

# ---------- PSD / band helpers ----------
def compute_psd_all_channels(data, fs, nperseg=256):
    """
    data: (n_ch, n_samp) may contain NaN; returns freqs, psds (n_ch, n_freqs)
    Uses simple NaN handling via interpolation; if entire channel NaN -> zeros.
    """
    n_ch, n_samp = data.shape
    psd_list = []
    freqs = None
    for ch in data:
        # handle NaN: interpolate across valid points; if not possible, fill zeros
        if np.all(np.isnan(ch)):
            ch_clean = np.zeros_like(ch)
        else:
            idx = np.where(~np.isnan(ch))[0]
            if idx.size == 0:
                ch_clean = np.zeros_like(ch)
            else:
                # linear interpolate missing points
                valid_x = idx
                valid_y = ch[idx]
                full_x = np.arange(len(ch))
                ch_clean = np.interp(full_x, valid_x, valid_y)
        # detrend and compute PSD
        f, p = welch(detrend(ch_clean), fs=fs, nperseg=min(nperseg, max(16, len(ch_clean))))
        psd_list.append(p)
        freqs = f
    return freqs, np.array(psd_list)

def bandpower_from_psd(freqs, psds, band):
    low, high = band
    idx = np.logical_and(freqs >= low, freqs <= high)
    return np.trapz(psds[:, idx], freqs[idx], axis=1)

# ---------- Figure builder ----------
def build_main_figure(subject_data_list, channel_names, sr, title="EEG Grand Summary (0-1s)"):
    """
    subject_data_list: list of arrays (n_ch, n_samp) with NaN for missing
    """
    # convert list -> stack; align shapes by padding with NaN if needed
    n_subj = len(subject_data_list)
    n_ch = len(channel_names)
    max_samples = max(d.shape[1] for d in subject_data_list)
    # cap samples at sr * MAX_DISPLAY_SECONDS or available min across subjects
    cap_by_time = int(round(sr * MAX_DISPLAY_SECONDS))
    # choose final cap = min(cap_by_time, min available max across subjects)
    min_samples_available = min(d.shape[1] for d in subject_data_list)
    cap_samples = min(cap_by_time, min_samples_available)

    # build aligned array (n_subj, n_ch, cap_samples)
    S = np.full((n_subj, n_ch, cap_samples), np.nan, dtype=float)
    for si, d in enumerate(subject_data_list):
        # d may have shape (n_ch_d, n_samp_d). If channel counts differ, assume ordering aligns by channel_names,
        # and caller should have provided aligned data. We'll handle shapes robustly:
        nch_d, nsamp_d = d.shape
        # if nch_d != n_ch, attempt to pad/truncate channels
        if nch_d < n_ch:
            D = np.full((n_ch, nsamp_d), np.nan)
            D[:nch_d, :] = d
        else:
            D = d[:n_ch, :]

        # trim/pad samples to cap_samples
        if nsamp_d >= cap_samples:
            S[si, :, :] = D[:, :cap_samples]
        else:
            S[si, :, :nsamp_d] = D[:, :nsamp_d]
            # remaining remain NaN

    # compute grand average across subjects (nanmean)
    grand = np.nanmean(S, axis=0)  # (n_ch, cap_samples)

    # z-score per channel for heatmap using nan-aware ops
    ch_mean = np.nanmean(grand, axis=1, keepdims=True)
    ch_std = np.nanstd(grand, axis=1, keepdims=True)
    gm = (grand - ch_mean) / (ch_std + 1e-9)

    # median ERP across channels (nanmedian)
    median_erp = np.nanmedian(grand, axis=0)
    p10 = np.nanpercentile(grand, 10, axis=0)
    p90 = np.nanpercentile(grand, 90, axis=0)

    # PSD on per-channel grand (interpolates internally)
    freqs, psds = compute_psd_all_channels(grand, sr)
    psd_med = np.nanmedian(psds, axis=0)
    psd_p10 = np.nanpercentile(psds, 10, axis=0)
    psd_p90 = np.nanpercentile(psds, 90, axis=0)

    # alpha bandpower per channel
    alpha_bp = bandpower_from_psd(freqs, psds, (8, 12))
    sort_idx = np.argsort(alpha_bp)[::-1]

    times = np.arange(cap_samples) / float(sr)

    # Build subplots
    fig = make_subplots(rows=3, cols=2,
                        column_widths=[0.68, 0.32],
                        row_heights=[0.36, 0.36, 0.28],
                        specs=[[{"type":"heatmap"}, {"type":"xy"}],
                               [{"type":"heatmap"}, {"type":"xy"}],
                               [{"type":"heatmap"}, {"type":"xy"}]],
                        horizontal_spacing=0.03, vertical_spacing=0.06)

    # Heatmap repeated to visually span rows; show colorbar once
    heat = go.Heatmap(z=gm, x=times, y=channel_names, colorbar=dict(title="z"))
    fig.add_trace(heat, row=1, col=1)
    fig.add_trace(go.Heatmap(z=gm, x=times, y=channel_names, showscale=False), row=2, col=1)
    fig.add_trace(go.Heatmap(z=gm, x=times, y=channel_names, showscale=False), row=3, col=1)

    # ERP (row1 col2)
    fig.add_trace(go.Scatter(x=times, y=median_erp, mode="lines", name="Median ERP"), row=1, col=2)
    fig.add_trace(go.Scatter(x=times, y=p90, mode="lines", showlegend=False, line=dict(width=0)), row=1, col=2)
    fig.add_trace(go.Scatter(x=times, y=p10, mode="lines", fill='tonexty', fillcolor='rgba(0,0,255,0.08)', showlegend=False, line=dict(width=0)), row=1, col=2)
    fig.update_xaxes(title_text="Time (s)", row=1, col=2, range=[0, max(0.0, times[-1])])

    # PSD (row2 col2)
    fig.add_trace(go.Scatter(x=freqs, y=psd_med, mode="lines", name="PSD median"), row=2, col=2)
    fig.add_trace(go.Scatter(x=freqs, y=psd_p90, mode="lines", showlegend=False, line=dict(width=0)), row=2, col=2)
    fig.add_trace(go.Scatter(x=freqs, y=psd_p10, mode="lines", fill='tonexty', fillcolor='rgba(0,255,0,0.06)', showlegend=False, line=dict(width=0)), row=2, col=2)
    fig.update_xaxes(title_text="Freq (Hz)", row=2, col=2)

    # Alpha bar (row3 col2)
    fig.add_trace(go.Bar(x=[channel_names[i] for i in sort_idx], y=alpha_bp[sort_idx], name="Alpha (8-12 Hz) power"), row=3, col=2)

    fig.update_layout(height=820, width=1220, title=title, hovermode="closest", showlegend=False)
    fig.update_yaxes(autorange="reversed", row=1, col=1)
    fig.update_yaxes(autorange="reversed", row=2, col=1)
    fig.update_yaxes(autorange="reversed", row=3, col=1)

    return fig

# ---------- MAIN ----------
def main():
    files_found = [p for p in DEMO_FILES if os.path.exists(p)]
    if not files_found:
        print("No demo files found. Place the files or update DEMO_FILES paths.")
        return

    subj_data = []
    canonical_chan_names = None
    sampling_rate = None
    sample_counts = []

    # parse files
    for p in files_found:
        d, ch_names, sr, n_samp = parse_rd000(p)
        sample_counts.append(n_samp)
        if canonical_chan_names is None:
            canonical_chan_names = ch_names
        # align channels by name: create array with canonical channel count and NaN default
        n_canon = len(canonical_chan_names)
        aligned = np.full((n_canon, d.shape[1]), np.nan, dtype=float)
        # try mapping names
        for i, cname in enumerate(canonical_chan_names):
            if cname in ch_names:
                idx = ch_names.index(cname)
                aligned[i, :d.shape[1]] = d[idx, :]
            else:
                # if file contains extra channels not in canonical, ignore them
                aligned[i, :d.shape[1]] = np.nan
        subj_data.append(aligned)
        sampling_rate = sr  # assume same across files

    # build and show figure
    fig = build_main_figure(subj_data, canonical_chan_names, sampling_rate, title="EEG Grand Summary (0-1s)")
    fig.show()

if __name__ == "__main__":
    main()
