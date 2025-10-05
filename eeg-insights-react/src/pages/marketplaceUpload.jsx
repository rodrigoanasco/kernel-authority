import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function MarketplaceUpload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  async function handleUpload() {
    try {
      if (!file) { setStatus("Please select a file first."); return; }

      setStatus("Uploading...");

      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `datasets/${fileName}`; // <-- only this will be saved to DB

      // upload the binary to storage
      const { error: uploadError } = await supabase.storage
        .from("marketplace")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // save metadata + storage path (NO url)
      const { error: insertError } = await supabase
        .from("marketplace_items")
        .insert([{ title, description, is_free: isFree, file_path: filePath, created_at: new Date().toISOString() }]);

      if (insertError) throw insertError;

      setStatus("✅ Upload complete!");
      setTitle(""); setDescription(""); setIsFree(true); setFile(null);
    } catch (err) {
      console.error(err);
      setStatus(`Upload failed: ${err.message}`);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
      <h2>Upload your dataset</h2>
      <input type="text" placeholder="Dataset title" value={title}
        onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
        rows={3} style={{ width: "100%", marginBottom: 10 }} />
      <label>
        <input type="checkbox" checked={isFree} onChange={() => setIsFree(!isFree)} />{" "}Free
      </label>
      <br />
      <input type="file" accept=".csv,.rd,.rd.000,.txt"
        onChange={(e) => setFile(e.target.files[0])} style={{ marginTop: 10 }} />
      <br />
      <button onClick={handleUpload}
        style={{ marginTop: 15, padding: "10px 25px", borderRadius: 6, border: "none",
                 backgroundColor: "#38bdf8", color: "black", cursor: "pointer" }}>
        Upload
      </button>
      <p style={{ marginTop: 10 }}>{status}</p>
    </div>
  );
}
