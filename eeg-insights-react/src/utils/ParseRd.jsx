// Parses your .rd.000 text into rows.
// Returns { rowsLong, rowsUserData, sampleMs }
export function parseRdText(text) {
  const lines = text.split(/\r?\n/)
  let sampleMs = 1.0
  const rowsLong = []      // {channel, t_ms, voltage_uv, trial, sample_idx}
  const rowsUserData = []  // {chan, seconds, voltage}

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // header lines like "# 3.906000 msecs uV"
    if (line.startsWith('#')) {
      const m = line.match(/([\d.]+)\s*msecs\s*uV/i)
      if (m) sampleMs = parseFloat(m[1])
      continue
    }

    // data lines like: 0 FP1 0 3.082
    const parts = line.split(/\s+/)
    if (parts.length < 4) continue
    const trial = parseInt(parts[0], 10)
    const channel = String(parts[1]).toUpperCase()
    const sampleIdx = parseInt(parts[2], 10)
    const voltageUv = parseFloat(parts[3])
    if (!Number.isFinite(trial) || !Number.isFinite(sampleIdx) || !Number.isFinite(voltageUv)) continue

    const tMs = sampleIdx * sampleMs
    rowsLong.push({ channel, t_ms: tMs, voltage_uv: voltageUv, trial, sample_idx: sampleIdx })

    const seconds = Math.floor(tMs / 1000)
    rowsUserData.push({ chan: channel, seconds, voltage: Math.round(voltageUv) })
  }
  return { rowsLong, rowsUserData, sampleMs }
}
