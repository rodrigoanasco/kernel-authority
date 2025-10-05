import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/* ---------- helpers ---------- */

function inferSampleRateFromHeader(text, fallback = 256) {
  const m = text.match(/([\d.]+)\s*msecs\s*uV/i);
  if (!m) return fallback;
  const ms = parseFloat(m[1]);
  const sr = 1000 / ms;
  return Number.isFinite(sr) && sr > 0 ? sr : fallback;
}

function parseRdToRows(text) {
  const sr = inferSampleRateFromHeader(text, 256);
  const lines = text.split(/\r?\n/);
  let currentTrial = null;
  let lastSampleIdxInTrial = -1;

  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const p = line.split(/\s+/);
    if (p.length < 4) continue;

    const trial = Number(p[0]);
    const chan = String(p[1]).toUpperCase();
    const sampleIdx = Number(p[2]);
    const voltage = Number(p[3]);
    if (!Number.isFinite(trial) || !chan || !Number.isFinite(sampleIdx) || !Number.isFinite(voltage)) continue;

    if (currentTrial === null) currentTrial = trial;
    if (trial !== currentTrial) currentTrial = trial;

    const seconds = sampleIdx;
    out.push({ chan, seconds: Number(seconds.toFixed(6)), voltage });
  }
  return out;
}

function parseCsvToRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const hasHeader = /seconds|t_ms|chan|channel|voltage|voltage_uv/.test(header);

  const rows = [];
  if (hasHeader) {
    const cols = header.split(",").map((c) => c.trim());
    const idx = (name) => cols.indexOf(name);
    const iSec = idx("seconds");
    const iChan = idx("chan") >= 0 ? idx("chan") : idx("channel");
    const iTms = idx("t_ms");
    const iVol = idx("voltage") >= 0 ? idx("voltage") : idx("voltage_uv");

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s) => s.trim());
      const chan = String(parts[iChan] ?? "").toUpperCase();
      if (!chan) continue;

      if (iSec >= 0) {
        const seconds = Number(parts[iSec]);
        const voltage = Number(parts[iVol]);
        if (Number.isFinite(seconds) && Number.isFinite(voltage)) rows.push({ chan, seconds, voltage });
      } else if (iTms >= 0) {
        const tms = Number(parts[iTms]);
        const seconds = tms / 1000;
        const voltage = Number(parts[iVol]);
        if (Number.isFinite(seconds) && Number.isFinite(voltage)) rows.push({ chan, seconds, voltage });
      }
    }
    return rows;
  }

  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 3) continue;
    const a = parts[0],
      b = parts[1],
      c = parts[2];
    if (!isNaN(Number(a))) {
      rows.push({ chan: String(b).toUpperCase(), seconds: Number(a), voltage: Number(c) });
    } else {
      rows.push({ chan: String(a).toUpperCase(), seconds: Number(b), voltage: Number(c) });
    }
  }
  return rows;
}

async function bulkInsertUserData(rows, setProgress, participantId) {
  const chunk = 2000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk).map((r) => ({
      user_id: participantId, // direct link to user_consent.id
      chan: r.chan,
      seconds: r.seconds,
      voltage: r.voltage,
    }));
    const { error } = await supabase.from("user_data").insert(slice);
    if (error) throw new Error(error.message);
    inserted += slice.length;
    setProgress(Math.round((inserted / rows.length) * 100));
  }
}

/* ---------- component ---------- */

export default function StreamUserData({ participantId }) {
  const [status, setStatus] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const fileRef = useRef(null);

  async function onFile(e) {
    try {
      setProgress(0);
      setStatus("Reading file…");
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();

      const firstDataLine =
        text.split(/\r?\n/).find((l) => l.trim().length && !l.trim().startsWith("#")) ?? "";
      const looksCSV = firstDataLine.includes(",") || file.name.toLowerCase().endsWith(".csv");

      setStatus("Parsing…");
      const rows = looksCSV ? parseCsvToRows(text) : parseRdToRows(text);
      if (!rows.length) {
        setStatus("No valid rows found.");
        return;
      }

      rows.sort((a, b) => a.seconds - b.seconds || a.chan.localeCompare(b.chan));

      setTotalRows(rows.length);
      setStatus(`Inserting ${rows.length} rows…`);
      await bulkInsertUserData(rows, setProgress, participantId);
      setStatus("Done ✅");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
      <h3>Import EEG file → user_data</h3>
      <input ref={fileRef} type="file" accept=".csv,.rd,.rd.000,.txt" onChange={onFile} />
      <div style={{ height: 12, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg,#34d399,#3b82f6)",
            transition: "width .3s",
          }}
        />
      </div>
      <small>
        {status} {totalRows ? `• ${progress}%` : ""}
      </small>
    </div>
  );
}
