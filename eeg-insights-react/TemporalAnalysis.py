# eeg_temporal_comparison.py
import os, math
import numpy as np
from scipy.signal import welch, detrend, butter, filtfilt, hilbert
from scipy.stats import ttest_ind, t
import matplotlib.pyplot as plt
from tqdm import tqdm
import warnings
warnings.filterwarnings("ignore")

# ---------- CONFIG ----------
CONTROL_FILES = [
    "llm-backend/ControlDataset/co2c0000337.rd.000","llm-backend/ControlDataset/co2c0000338.rd.000","llm-backend/ControlDataset/co2c0000339.rd.000",
    "llm-backend/ControlDataset/co2c0000340.rd.000","llm-backend/ControlDataset/co2c0000341.rd.000","llm-backend/ControlDataset/co2c0000342.rd.000",
    "llm-backend/ControlDataset/co2c0000344.rd.000","llm-backend/ControlDataset/co2c0000345.rd.000","llm-backend/ControlDataset/co2c0000346.rd.000",
    "llm-backend/ControlDataset/co2c0000347.rd.000"
]
ALC_FILES = [
    "llm-backend/AlcoholicDataset/co2a0000364.rd.000","llm-backend/AlcoholicDataset/co2a0000365.rd.000","llm-backend/AlcoholicDataset/co2a0000368.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000369.rd.000","llm-backend/AlcoholicDataset/co2a0000370.rd.000","llm-backend/AlcoholicDataset/co2a0000371.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000372.rd.000","llm-backend/AlcoholicDataset/co2a0000375.rd.000","llm-backend/AlcoholicDataset/co2a0000377.rd.000",
    "llm-backend/AlcoholicDataset/co2a0000378.rd.000"
]
MAX_T_SEC = 1.0
PERMUTATIONS = 1
CLUSTER_P_THRESHOLD = 0.05  # per-timepoint threshold to form clusters (two-sided)

# ---------- Parser (trial 0, same format you provided) ----------
def parse_rd000(path, default_ch=64, default_samples=416, default_ms=3.906):
    lines = open(path, 'r', errors='ignore').read().splitlines()
    n_ch = None; n_samp = None; samp_ms = None
    chan_order = {}
    data_lines = []
    for ln in lines:
        if not ln: continue
        if ln.startswith("#"):
            txt = ln[1:].strip()
            if "trials" in txt and "chans" in txt and "samples" in txt:
                ints = [int(t) for t in txt.replace(","," ").split() if t.isdigit()]
                if len(ints) >= 3:
                    _, n_ch, n_samp = ints[:3]
            if "msec" in txt.lower() or "msecs" in txt.lower():
                toks = txt.split()
                for i,t in enumerate(toks):
                    if "msec" in t.lower():
                        try:
                            samp_ms = float(toks[i-1]); break
                        except: pass
            if "chan" in txt:
                toks = txt.split()
                try:
                    idx = toks.index("chan")
                    chan_order[int(toks[idx+1])] = " ".join(toks[:idx])
                except: pass
        else:
            data_lines.append(ln.strip())

    if n_ch is None: n_ch = default_ch
    if n_samp is None: n_samp = default_samples
    if samp_ms is None: samp_ms = default_ms
    sr = int(round(1000.0 / samp_ms))

    # channel naming
    if chan_order:
        length = max(max(chan_order.keys())+1, n_ch)
        channel_names = [chan_order.get(i, f"Ch{i+1}") for i in range(length)]
        channel_names = channel_names[:n_ch]
    else:
        # gather first occurring channel tokens
        seen=[]
        for ln in data_lines:
            p=ln.split()
            if len(p)>=4:
                ch=p[1]; 
                if ch not in seen: seen.append(ch)
            if len(seen)>=n_ch: break
        while len(seen)<n_ch: seen.append(f"Ch{len(seen)+1}")
        channel_names = seen[:n_ch]

    data = np.full((len(channel_names), n_samp), np.nan, dtype=float)
    for ln in data_lines:
        p = ln.split()
        if len(p) < 4: continue
        try:
            trial = int(p[0]); ch_name = p[1]; idx = int(p[2]); val = float(p[3])
        except: continue
        if trial != 0: continue
        if ch_name in channel_names:
            ch_idx = channel_names.index(ch_name)
            if 0 <= idx < n_samp: data[ch_idx, idx] = val
    return data, channel_names, sr, n_samp

# ---------- signal helpers ----------
def band_envelope(data, fs, low, high, order=4):
    # data: (n_ch, n_samples) -> returns same shape of analytic amplitude
    b,a = butter(order, [low/(fs/2), high/(fs/2)], btype='band')
    n_ch, n_samp = data.shape
    out = np.zeros_like(data)
    for i in range(n_ch):
        ch = data[i,:]
        if np.all(np.isnan(ch)):
            out[i,:] = np.nan
            continue
        chc = np.copy(ch)
        # interpolate NaN
        nans = np.isnan(chc)
        if nans.any():
            idx = np.where(~nans)[0]
            if idx.size==0:
                chc = np.zeros_like(chc)
            else:
                chc = np.interp(np.arange(n_samp), idx, chc[idx])
        filt = filtfilt(b,a,chc)
        env = np.abs(hilbert(filt))
        out[i,:] = env
    return out

def compute_psd_per_subject(data, fs, nperseg=256):
    # data: (n_ch, n_samp) -> return freqs, median_psd_across_channels
    n_ch = data.shape[0]
    psds=[]
    for i in range(n_ch):
        ch = data[i,:]
        if np.all(np.isnan(ch)):
            chc = np.zeros_like(ch)
        else:
            idx = np.where(~np.isnan(ch))[0]
            if idx.size==0: chc = np.zeros_like(ch)
            else: chc = np.interp(np.arange(len(ch)), idx, ch[idx])
        f,p = welch(detrend(chc), fs=fs, nperseg=min(nperseg, len(chc)))
        psds.append(p)
    psds = np.array(psds)
    return f, np.median(psds, axis=0)

# ---------- cluster permutation across time (per channel) ----------
def cluster_permutation_time(group1, group2, sr, n_perm=1000, p_thresh=0.05, rng=None):
    """For each channel: perform t-test at each timepoint, form clusters of consecutive timepoints 
       where |t| > threshold, compute cluster mass (sum |t|). Permute labels across subjects to build null of max cluster mass.
       Returns dict: {ch_idx: list of (start_idx,end_idx,cluster_mass,pval)}
    group1: (n1, n_ch, n_t)
    group2: (n2, n_ch, n_t)
    """
    if rng is None: rng = np.random.RandomState(0)
    n1 = group1.shape[0]; n2 = group2.shape[0]
    n_ch = group1.shape[1]; n_t = group1.shape[2]
    allsub = np.concatenate([group1, group2], axis=0)  # (n1+n2, n_ch, n_t)
    labels = np.array([0]*n1 + [1]*n2)
    df = n1 + n2 - 2
    tcrit = t.ppf(1 - p_thresh/2, df)  # two-sided
    results = {ch: [] for ch in range(n_ch)}
    # observed t-stats
    for ch in range(n_ch):
        g1 = group1[:, ch, :]
        g2 = group2[:, ch, :]
        tvals = np.zeros(n_t)
        pvals = np.ones(n_t)
        for tt in range(n_t):
            a = g1[:, tt]; b = g2[:, tt]
            # remove NaNs
            a = a[~np.isnan(a)]; b = b[~np.isnan(b)]
            if a.size < 2 or b.size < 2:
                tvals[tt] = 0; pvals[tt] = 1; continue
            tv, pv = ttest_ind(a, b, equal_var=False)
            tvals[tt] = tv if not np.isnan(tv) else 0
            pvals[tt] = pv if not np.isnan(pv) else 1
        # clusters: contiguous runs where |t|>tcrit
        mask = np.abs(tvals) > tcrit
        clusters = []
        idx = 0
        while idx < n_t:
            if mask[idx]:
                start = idx
                while idx < n_t and mask[idx]:
                    idx += 1
                end = idx  # exclusive
                clusters.append((start, end, np.sum(np.abs(tvals[start:end]))))
            else:
                idx += 1
        if not clusters:
            continue
        # build null distribution of max cluster mass via permutations
        max_masses = np.zeros(n_perm)
        for pi in range(n_perm):
            perm = rng.permutation(labels)
            p1 = allsub[perm==0, ch, :]
            p2 = allsub[perm==1, ch, :]
            # compute tvals for permuted split
            tperm = np.zeros(n_t)
            for tt in range(n_t):
                a = p1[:, tt]; b = p2[:, tt]
                a = a[~np.isnan(a)]; b = b[~np.isnan(b)]
                if a.size < 2 or b.size < 2:
                    tperm[tt]=0; continue
                tv, _ = ttest_ind(a,b, equal_var=False)
                tperm[tt] = tv if not np.isnan(tv) else 0
            maskp = np.abs(tperm) > tcrit
            # find clusters and record max cluster mass
            mx = 0
            j=0
            while j < n_t:
                if maskp[j]:
                    s=j
                    while j<n_t and maskp[j]: j+=1
                    e=j
                    mass = np.sum(np.abs(tperm[s:e]))
                    if mass>mx: mx=mass
                else:
                    j+=1
            max_masses[pi]=mx
        # for each observed cluster compute p-value
        for (s,e,mass) in clusters:
            pval = (np.sum(max_masses >= mass) + 1) / (n_perm + 1)
            results[ch].append((s,e,mass,pval))
    return results

# ---------- high-level pipeline ----------
def load_group(file_list):
    subs = []
    chan_names = None; sr = None; n_samp = None
    for p in file_list:
        if not os.path.exists(p):
            print("MISSING", p); continue
        d, chs, sampling_rate, n_samples = parse_rd000(p)
        if chan_names is None: chan_names = chs
        # align channels by name if necessary: here parsers already produce canonical ordering
        if d.shape[0] != len(chan_names):
            # simple pad/truncate
            aligned = np.full((len(chan_names), d.shape[1]), np.nan)
            for i,c in enumerate(chan_names):
                if c in chs:
                    aligned[i,:] = d[chs.index(c),:]
            d = aligned
        subs.append(d)
        sr = sampling_rate; n_samp = n_samples
    if not subs: raise RuntimeError("No files found in provided list.")
    # clip to 0..MAX_T_SEC
    cap = min(int(round(sr*MAX_T_SEC)), min(d.shape[1] for d in subs))
    subs_clipped = [s[:, :cap] if s.shape[1] >= cap else np.pad(s, ((0,0),(0,cap-s.shape[1])), constant_values=np.nan) for s in subs]
    arr = np.stack(subs_clipped, axis=0)  # (nsub, n_ch, cap)
    return arr, chan_names, sr

# ---------- Run analysis ----------
def main():
    ctrl, chs, sr = load_group(CONTROL_FILES)
    alc, chs2, sr2 = load_group(ALC_FILES)
    assert chs == chs2 and sr==sr2
    n_t = ctrl.shape[2]; times = np.arange(n_t)/sr

    # 1) Grand-average ERP per group (median across channels)
    grand_ctrl = np.nanmean(ctrl, axis=1)  # (nsub, n_t) per-subject channel-average
    grand_alc = np.nanmean(alc, axis=1)
    # group mean across subjects (and CI)
    mean_ctrl = np.nanmean(grand_ctrl, axis=0); se_ctrl = np.nanstd(grand_ctrl, axis=0)/math.sqrt(grand_ctrl.shape[0])
    mean_alc = np.nanmean(grand_alc, axis=0); se_alc = np.nanstd(grand_alc, axis=0)/math.sqrt(grand_alc.shape[0])

    # 2) Band envelopes (delta/theta/alpha/beta) per subject (average across channels)
    bands = {"delta":(1,4),"theta":(4,8),"alpha":(8,12),"beta":(13,30)}
    band_env_ctrl = {b: [] for b in bands}
    band_env_alc = {b: [] for b in bands}
    print("Computing band envelopes...")
    for subj in ctrl:
        for b,(lo,hi) in bands.items():
            env = band_envelope(subj, sr, lo, hi)
            band_env_ctrl[b].append(np.nanmean(env, axis=0))  # mean across channels
    for subj in alc:
        for b,(lo,hi) in bands.items():
            env = band_envelope(subj, sr, lo, hi)
            band_env_alc[b].append(np.nanmean(env, axis=0))

    # convert to arrays
    for b in bands:
        band_env_ctrl[b] = np.vstack(band_env_ctrl[b])  # (nsub, n_t)
        band_env_alc[b] = np.vstack(band_env_alc[b])

    # 3) PSD per subject (median across channels)
    print("Computing PSDs...")
    freqs = None
    psd_ctrl=[]; psd_alc=[]
    for subj in ctrl:
        f,p = compute_psd_per_subject(subj, sr)
        freqs = f; psd_ctrl.append(p)
    for subj in alc:
        f,p = compute_psd_per_subject(subj, sr)
        psd_alc.append(p)
    psd_ctrl = np.vstack(psd_ctrl); psd_alc = np.vstack(psd_alc)

    # 4) Per-subject alpha power & peak alpha frequency
    def alpha_metrics_from_psd(freqs, psd):
        # psd: (n_freqs,) or (n_subj,n_freqs)
        idx = np.logical_and(freqs>=8, freqs<=12)
        if psd.ndim==1:
            alpha_pow = np.trapz(psd[idx], freqs[idx])
            peak_idx = np.argmax(psd[idx]); peak_freq = freqs[idx][peak_idx]
            return alpha_pow, peak_freq
        else:
            alpha_pow = np.trapz(psd[:,idx], freqs[idx], axis=1)
            peak_idx = np.argmax(psd[:,idx], axis=1)
            peak_freq = freqs[idx][peak_idx]
            return alpha_pow, peak_freq

    alpha_pow_ctrl, peak_alpha_ctrl = alpha_metrics_from_psd(freqs, psd_ctrl)
    alpha_pow_alc, peak_alpha_alc = alpha_metrics_from_psd(freqs, psd_alc)

    # 5) Cluster-based permutation over time per channel
    print("Running cluster permutation test per channel (this may take time)...")
    perm_results = cluster_permutation_time(ctrl, alc, sr, n_perm=PERMUTATIONS, p_thresh=CLUSTER_P_THRESHOLD, rng=np.random.RandomState(1))

    # ---------- PLOTTING ----------
    plt.figure(figsize=(12,6))
    plt.title("Grand-average ERP (channel-mean) — Control vs Alcoholic (0-1s)")
    plt.fill_between(times, mean_ctrl - 1.96*se_ctrl, mean_ctrl + 1.96*se_ctrl, alpha=0.2, label='Ctrl 95% CI')
    plt.fill_between(times, mean_alc - 1.96*se_alc, mean_alc + 1.96*se_alc, alpha=0.2, label='Alc 95% CI')
    plt.plot(times, mean_ctrl, label='Control mean', color='tab:blue')
    plt.plot(times, mean_alc, label='Alcoholic mean', color='tab:orange')
    plt.xlabel("Time (s)"); plt.ylabel("uV (channel mean)")
    plt.legend()

    # Mark any channels that had a significant cluster and show their union time mask on the ERP difference
    sig_mask = np.zeros_like(times, dtype=bool)
    for ch, clusters in perm_results.items():
        for (s,e,m,pval) in clusters:
            if pval < 0.05:
                sig_mask[s:e] = True
    if sig_mask.any():
        plt.axvspan(times[np.where(sig_mask)[0][0]], times[np.where(sig_mask)[0][-1]], color='red', alpha=0.08, label='signif cluster (any channel)')
        plt.legend()
    plt.tight_layout()

    # Plot time-resolved band envelopes
    plt.figure(figsize=(12,9))
    for i,(b,arr) in enumerate(band_env_ctrl.items()):
        plt.subplot(4,1,i+1)
        mc = np.mean(arr, axis=0); ma = np.mean(band_env_alc[b], axis=0)
        plt.plot(times, mc, label=f'Ctrl {b} mean'); plt.plot(times, ma, label=f'Alc {b} mean')
        plt.ylabel("Envelope (a.u.)"); plt.legend()
    plt.xlabel("Time (s)")

    # PSD median plots
    plt.figure(figsize=(10,5))
    plt.semilogy(freqs, np.median(psd_ctrl, axis=0), label='Ctrl median PSD')
    plt.semilogy(freqs, np.median(psd_alc, axis=0), label='Alc median PSD')
    plt.xlim(0,40); plt.xlabel("Hz"); plt.ylabel("PSD"); plt.legend(); plt.title("Group median PSD (median across channels then across subjects)")

    # Boxplots for alpha power and peak alpha freq
    plt.figure(figsize=(10,4))
    plt.subplot(1,2,1)
    plt.boxplot([alpha_pow_ctrl, alpha_pow_alc], labels=['Ctrl','Alc'])
    plt.title("Alpha power (8-12Hz) per subject")
    plt.subplot(1,2,2)
    plt.boxplot([peak_alpha_ctrl, peak_alpha_alc], labels=['Ctrl','Alc'])
    plt.title("Peak alpha frequency per subject")
    plt.tight_layout()

    # Print summary stats and significant clusters
    print("\nSUMMARY METRICS:")
    def meansem(x): return np.nanmean(x), np.nanstd(x)/math.sqrt(len(x))
    m1,s1 = meansem(alpha_pow_ctrl); m2,s2 = meansem(alpha_pow_alc)
    print(f"Alpha power (mean ± sem): Control {m1:.4f} ± {s1:.4f}, Alcoholic {m2:.4f} ± {s2:.4f}")
    m1,s1 = meansem(peak_alpha_ctrl); m2,s2 = meansem(peak_alpha_alc)
    print(f"Peak alpha freq (Hz): Control {m1:.2f} ± {s1:.2f}, Alcoholic {m2:.2f} ± {s2:.2f}")
 
    print("\nSignificant clusters (per channel) [start_idx, end_idx, cluster_mass, pval]:")
    n_sig = 0
    for ch, clusters in perm_results.items():
        for (s,e,m,p) in clusters:
            if p < 0.05:
                n_sig += 1
                print(f"Ch {ch} ({chs[ch]}): {s}, {e}, mass={m:.2f}, p={p:.3f}")
    if n_sig==0:
        print("None (no time clusters survived permutation test at p<0.05).")

    plt.show()

if __name__ == "__main__":
    main()
