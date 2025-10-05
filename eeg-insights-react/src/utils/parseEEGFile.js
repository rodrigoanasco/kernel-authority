export async function parseEEGFile(file, nChannels = 64, plotFirstN = 5, samplingRate = 256) {
  const buf = await file.arrayBuffer();
  const fsize = buf.byteLength;
  const dtypeOptions = [
    { type: "int16", size: 2, littleEndian: true },
    { type: "int16", size: 2, littleEndian: false },
    { type: "float32", size: 4, littleEndian: true },
    { type: "float32", size: 4, littleEndian: false },
  ];

  const maxScanOffset = 2048;
  const candidates = [];

  for (let offset = 0; offset < Math.min(maxScanOffset, fsize); offset += 4) {
    for (const dt of dtypeOptions) {
      const itemSize = dt.size;
      const rem = fsize - offset;
      const nSamples = Math.floor(rem / (itemSize * nChannels));
      if (nSamples < 10) continue;

      try {
        const view = new DataView(buf, offset, nSamples * nChannels * itemSize);
        const arr = [];
        for (let ch = 0; ch < nChannels; ch++) {
          const channel = new Float64Array(nSamples);
          for (let s = 0; s < nSamples; s++) {
            const idx = (s * nChannels + ch) * itemSize;
            let val =
              dt.type === "int16"
                ? view.getInt16(idx, dt.littleEndian)
                : view.getFloat32(idx, dt.littleEndian);
            channel[s] = val;
          }
          arr.push(channel);
        }

        const flat = arr.flat();
        const plausible = flat.filter(v => Math.abs(v) < 100000).length / flat.length;
        const score = plausible * Math.log1p(flat.length);
        candidates.push({ dt, offset, nSamples, score, arr });
      } catch {}
    }
  }

  if (!candidates.length) throw new Error("No valid EEG interpretation found");

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const dtMs = 1000 / samplingRate;
  const s1 = Math.min(best.nSamples, Math.floor(255 / dtMs));
  const time = Array.from({ length: s1 }, (_, i) => i * dtMs);

  const traces = best.arr.slice(0, plotFirstN).map((ch, i) => ({
    x: time,
    y: Array.from(ch.slice(0, s1)),
    name: `Ch ${i + 1}`,
    mode: "lines",
    line: { width: 1 },
  }));

  return {
    traces,
    nChannels,
    samplingRate,
    dtype: best.dt.type + (best.dt.littleEndian ? " (LE)" : " (BE)"),
    offset: best.offset,
    nSamples: best.nSamples,
  };
}

export default parseEEGFile;